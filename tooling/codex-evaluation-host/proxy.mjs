import { lookup } from 'node:dns/promises';
import { createServer } from 'node:http';
import { connect, isIP } from 'node:net';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Returns whether an IP address is globally routable.
 * @param address The IPv4 or IPv6 address to inspect.
 * @returns Whether the address is public.
 */
export const isPublicIpAddress = (address) => {
  const family = isIP(address);
  if (family === 4) {
    const [first, second] = address.split('.').map(Number);
    return !(
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 198 && (second === 18 || second === 19)) ||
      first >= 224
    );
  }
  if (family === 6) {
    const normalizedAddress = address.toLowerCase();
    if (normalizedAddress.startsWith('::ffff:')) {
      return isPublicIpAddress(normalizedAddress.slice('::ffff:'.length));
    }
    return !(
      normalizedAddress === '::' ||
      normalizedAddress === '::1' ||
      normalizedAddress.startsWith('fc') ||
      normalizedAddress.startsWith('fd') ||
      /^fe[89ab]/.test(normalizedAddress) ||
      normalizedAddress.startsWith('ff')
    );
  }
  return false;
};

/**
 * Parses one HTTPS CONNECT authority and permits only port 443.
 * @param authority The CONNECT request authority.
 * @returns The normalized host and port.
 */
export const parseConnectAuthority = (authority) => {
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
export const destroyCodexEvaluationProxySockets = (sockets) => {
  for (const socket of sockets) socket.destroy();
  sockets.clear();
};

/**
 * Starts the exact-host, public-address-only CONNECT relay.
 * @returns A promise that settles when the relay closes.
 */
export const runCodexEvaluationProxy = async () => {
  const socketPath = process.env.MOLDEA_EVAL_PROXY_SOCKET;
  const allowedHosts = new Set(
    (process.env.MOLDEA_EVAL_ALLOWED_HOSTS ?? '')
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );
  if (!socketPath || allowedHosts.size === 0) {
    throw new Error('The evaluation proxy requires a socket path and allowed hosts.');
  }

  const activeSockets = new Set();
  let isClosing = false;
  const trackSocket = (socket) => {
    activeSockets.add(socket);
    socket.once('close', () => activeSockets.delete(socket));
  };
  const server = createServer((request, response) => {
    response.writeHead(405, { connection: 'close' });
    response.end();
  });
  server.on('connection', trackSocket);
  server.on('connect', async (request, clientSocket, head) => {
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
  });

  await new Promise((resolvePromise, rejectPromise) => {
    server.once('error', rejectPromise);
    server.listen(socketPath, () => {
      process.stdout.write('ready\n');
      resolvePromise();
    });
  });

  await new Promise((resolvePromise) => {
    const close = () => {
      if (isClosing) return;
      isClosing = true;
      destroyCodexEvaluationProxySockets(activeSockets);
      server.close(resolvePromise);
    };
    process.once('SIGINT', close);
    process.once('SIGTERM', close);
  });
};

const isDirectExecution =
  process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isDirectExecution) {
  runCodexEvaluationProxy().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
