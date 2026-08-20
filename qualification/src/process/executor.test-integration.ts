// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { executeProcess } from './executor.ts';

describe('executeProcess', () => {
  test('retains command identity and stdout diagnostics for a failed child process', async () => {
    await expect(
      executeProcess({
        command: process.execPath,
        args: ['-e', "process.stdout.write('candidate build failed'); process.exit(2);"],
        cwd: process.cwd(),
      }),
    ).rejects.toThrow(
      `${process.execPath} -e process.stdout.write('candidate build failed'); process.exit(2); exited with exit code 2: stdout:\ncandidate build failed`,
    );
  });
});
