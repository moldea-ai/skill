// @vitest-environment node
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isPublicIpAddress,
  parseConnectAuthority,
} from './semantic-evaluation-proxy.mjs';

test('public-address check rejects host-local and private destinations', () => {
  for (const address of [
    '0.0.0.0',
    '10.0.0.1',
    '100.64.0.1',
    '127.0.0.1',
    '169.254.1.1',
    '172.16.0.1',
    '192.168.0.1',
    '::',
    '::1',
    'fc00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
  ]) {
    assert.equal(isPublicIpAddress(address), false, address);
  }
  assert.equal(isPublicIpAddress('8.8.8.8'), true);
  assert.equal(isPublicIpAddress('2606:4700:4700::1111'), true);
});

test('CONNECT authority permits only HTTPS port 443', () => {
  assert.deepEqual(parseConnectAuthority('api.openai.com:443'), {
    host: 'api.openai.com',
    port: 443,
  });
  assert.throws(() => parseConnectAuthority('localhost:8080'), /port 443/);
});
