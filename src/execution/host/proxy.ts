import { lookup } from 'node:dns/promises';
import { createServer, type IncomingMessage } from 'node:http';
import { BlockList, connect, isIP } from 'node:net';
import type { Duplex } from 'node:stream';
import { isMainModule } from 'jg-process';

// IANA special-purpose IPv4 ranges that aren't globally reachable, with multicast and the
// reserved space after it
const NON_PUBLIC_IPV4_SUBNETS = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 3],
] as const;

// IANA special-purpose IPv6 ranges inside global unicast, 2000::/3, the only public IPv6 space
const NON_PUBLIC_GLOBAL_IPV6_SUBNETS = [
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['3fff::', 20],
] as const;

const NON_PUBLIC_ADDRESSES = new BlockList();
for (const [network, prefix] of NON_PUBLIC_IPV4_SUBNETS)
  NON_PUBLIC_ADDRESSES.addSubnet(network, prefix, 'ipv4');
for (const [network, prefix] of NON_PUBLIC_GLOBAL_IPV6_SUBNETS)
  NON_PUBLIC_ADDRESSES.addSubnet(network, prefix, 'ipv6');

const GLOBAL_UNICAST_IPV6 = new BlockList();
GLOBAL_UNICAST_IPV6.addSubnet('2000::', 3, 'ipv6');

// IPv4-mapped IPv6 addresses, which BlockList checks against the IPv4 ranges in any notation
const IPV4_MAPPED_IPV6 = new BlockList();
IPV4_MAPPED_IPV6.addSubnet('::ffff:0:0', 96, 'ipv6');

/**
 * Returns whether an IP address is globally routable.
 * @param address The IPv4 or IPv6 address to inspect.
 * @returns Whether the address is public.
 */
export const isPublicIpAddress = (address: string): boolean => {
  const family = isIP(address);
  if (family === 4) return !NON_PUBLIC_ADDRESSES.check(address, 'ipv4');
  if (family !== 6) return false;
  if (IPV4_MAPPED_IPV6.check(address, 'ipv6')) return !NON_PUBLIC_ADDRESSES.check(address, 'ipv6');
  return GLOBAL_UNICAST_IPV6.check(address, 'ipv6') && !NON_PUBLIC_ADDRESSES.check(address, 'ipv6');
};

/**
 * Parses one HTTPS CONNECT authority and permits only port 443.
 * @param authority The CONNECT request authority.
 * @returns The normalized host and port.
 */
export const parseConnectAuthority = (authority: string): { host: string; port: number } => {
  const parsedAuthority = new URL(`https://${authority}`);
  const host = parsedAuthority.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const port = Number(parsedAuthority.port || '443');
  if (!host || port !== 443 || parsedAuthority.username || parsedAuthority.password) {
    throw new Error('Only unauthenticated HTTPS CONNECT authorities on port 443 are supported.');
  }
  return { host, port };
};

/**
 * Destroys every socket owned by one restricted relay.
 * @param sockets The relay's active client and upstream sockets.
 */
export const destroyCodexEvaluationProxySockets = <TSocket extends { destroy: () => unknown }>(
  sockets: Set<TSocket>,
): void => {
  for (const socket of sockets) socket.destroy();
  sockets.clear();
};

/**
 * Starts the exact-host, public-address-only CONNECT relay.
 * @returns A promise that settles when the relay closes.
 */
export const runCodexEvaluationProxy = async (): Promise<void> => {
  const socketPath = process.env['MOLDEA_EVAL_PROXY_SOCKET'];
  const allowedHosts = new Set(
    (process.env['MOLDEA_EVAL_ALLOWED_HOSTS'] ?? '')
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );
  if (!socketPath || allowedHosts.size === 0) {
    throw new Error('The evaluation proxy requires a socket path and allowed hosts.');
  }

  const activeSockets = new Set<Duplex>();
  let isClosing = false;
  const trackSocket = (socket: Duplex): void => {
    activeSockets.add(socket);
    socket.once('close', () => activeSockets.delete(socket));
  };
  const server = createServer((_request, response) => {
    response.writeHead(405, { connection: 'close' });
    response.end();
  });
  server.on('connection', trackSocket);
  const handleConnect = async (
    request: IncomingMessage,
    clientSocket: Duplex,
    head: Buffer,
  ): Promise<void> => {
    clientSocket.on('error', () => {});
    try {
      const { host, port } = parseConnectAuthority(request.url ?? '');
      if (!allowedHosts.has(host)) {
        clientSocket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
        return;
      }
      const addresses = await lookup(host, { all: true, verbatim: true });
      if (addresses.length === 0 || addresses.some(({ address }) => !isPublicIpAddress(address))) {
        clientSocket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
        return;
      }
      if (isClosing) return;
      const selectedAddress = addresses[0];
      if (selectedAddress === undefined) return;
      const upstreamSocket = connect({
        family: selectedAddress.family,
        host: selectedAddress.address,
        port,
      });
      trackSocket(upstreamSocket);
      upstreamSocket.on('error', () => {
        clientSocket.end('HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n');
      });
      upstreamSocket.once('connect', () => {
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        if (head.length > 0) upstreamSocket.write(head);
        clientSocket.pipe(upstreamSocket);
        upstreamSocket.pipe(clientSocket);
      });
    } catch {
      clientSocket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
    }
  };
  server.on('connect', (request, clientSocket, head) => {
    void handleConnect(request, clientSocket, head);
  });

  await new Promise<void>((resolvePromise, rejectPromise) => {
    server.once('error', rejectPromise);
    server.listen(socketPath, resolvePromise);
  });

  await new Promise<void>((resolvePromise, rejectPromise) => {
    const close = () => {
      if (isClosing) return;
      isClosing = true;
      destroyCodexEvaluationProxySockets(activeSockets);
      server.close((error) => {
        if (error === undefined) resolvePromise();
        else rejectPromise(error);
      });
    };
    process.once('SIGINT', close);
    process.once('SIGTERM', close);
    process.stdout.write('ready\n');
  });
};

if (isMainModule(import.meta.url)) {
  runCodexEvaluationProxy().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
