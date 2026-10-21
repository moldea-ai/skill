// @vitest-environment node
import assert from 'node:assert/strict';
import { test } from 'vitest';

import {
  destroyCodexEvaluationProxySockets,
  isPublicIpAddress,
  parseConnectAuthority,
} from './proxy.ts';

test.each([
  '0.0.0.0',
  '10.0.0.1',
  '100.64.0.1',
  '127.0.0.1',
  '169.254.1.1',
  '172.16.0.1',
  '192.0.0.9',
  '192.0.2.1',
  '192.88.99.1',
  '192.168.0.1',
  '198.18.0.1',
  '198.19.255.255',
  '198.51.100.7',
  '203.0.113.200',
  '224.0.0.1',
  '240.0.0.1',
  '255.255.255.255',
  '::',
  '::1',
  '::8.8.8.8',
  '64:ff9b::808:808',
  '64:ff9b:1::1',
  '100::1',
  '2001::1',
  '2001:db8::1',
  '2002:808:808::1',
  '3fff::1',
  '5f00::1',
  'fc00::1',
  'fd12:3456::1',
  'fe80::1',
  'fe80::1%eth0',
  'ff02::1',
  '::ffff:127.0.0.1',
  '::ffff:7f00:1',
  '::FFFF:10.0.0.1',
  '0:0:0:0:0:ffff:a00:1',
  '0000:0000:0000:0000:0000:ffff:c0a8:0001',
  '::ffff:192.0.2.1',
  'example.com',
  '',
])('public-address check rejects non-public destination %s', (address) => {
  assert.equal(isPublicIpAddress(address), false);
});

test.each([
  '1.1.1.1',
  '8.8.8.8',
  '100.63.255.255',
  '100.128.0.0',
  '172.32.0.1',
  '192.0.1.1',
  '198.20.0.1',
  '223.255.255.255',
  '2606:4700:4700::1111',
  '2001:4860:4860::8888',
  '::ffff:8.8.8.8',
  '0:0:0:0:0:ffff:808:808',
])('public-address check accepts public destination %s', (address) => {
  assert.equal(isPublicIpAddress(address), true);
});

test('CONNECT authority permits only HTTPS port 443', () => {
  assert.deepEqual(parseConnectAuthority('api.openai.com:443'), {
    host: 'api.openai.com',
    port: 443,
  });
  assert.throws(() => parseConnectAuthority('localhost:8080'), /port 443/);
});

test('relay shutdown destroys every tracked client and upstream socket', () => {
  const destroyedSockets: string[] = [];
  const sockets = new Set([
    { destroy: () => destroyedSockets.push('client') },
    { destroy: () => destroyedSockets.push('upstream') },
  ]);

  destroyCodexEvaluationProxySockets(sockets);

  assert.deepEqual(destroyedSockets, ['client', 'upstream']);
  assert.equal(sockets.size, 0);
});
