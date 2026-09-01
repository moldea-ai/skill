#!/usr/bin/env node
import { executeInteractiveQualification, executeQualificationCommand } from '../cli/index.ts';
import { parseQualificationCommand } from '../command-line/index.ts';

const abortController = new AbortController();
const abortFromSignal = (signalName: 'SIGINT' | 'SIGTERM'): void => {
  if (!abortController.signal.aborted) {
    abortController.abort(new Error(`Qualification interrupted by ${signalName}.`));
  }
};

process.once('SIGINT', () => abortFromSignal('SIGINT'));
process.once('SIGTERM', () => abortFromSignal('SIGTERM'));

const args = process.argv.slice(2);
const isJson = args.includes('--json');

try {
  process.exitCode =
    args.length === 0
      ? await executeInteractiveQualification(abortController.signal)
      : await executeQualificationCommand(parseQualificationCommand(args), abortController.signal);
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown qualification CLI failure.';

  if (isJson) {
    process.stdout.write(`${JSON.stringify({ status: 'error', error: { message } }, null, 2)}\n`);
  } else {
    process.stderr.write(`qualification: ${message}\n`);
  }

  process.exitCode = abortController.signal.aborted ? 130 : 1;
}
