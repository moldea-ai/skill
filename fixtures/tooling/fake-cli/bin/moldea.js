#!/usr/bin/env node

const command = process.argv[2];

if (command === '--version') {
  process.stdout.write('1.0.0\n');
} else if (command === 'inspect' && process.argv.includes('--json')) {
  process.stdout.write(
    `${JSON.stringify({
      cliVersion: '1.0.0',
      command: 'inspect',
      result: { diagnostics: [] },
      schemaVersion: 1,
      status: 'valid',
    })}\n`,
  );
} else {
  process.stdout.write('fixture moldea CLI\n');
}
