import { QUALIFICATION_MODEL, QUALIFICATION_REASONING_EFFORT } from '../constants/index.ts';

/** Builds the fixed non-interactive Codex argument contract for one qualification role. */
export const createCodexExecArgs = (options: {
  outputPath: string;
  sandbox: 'read-only' | 'workspace-write';
  schemaPath: string;
  workspaceDirectory: string;
}): string[] => [
  'exec',
  '--model',
  QUALIFICATION_MODEL,
  '--sandbox',
  options.sandbox,
  '--ignore-user-config',
  '--ignore-rules',
  '--ephemeral',
  '--json',
  '--output-schema',
  options.schemaPath,
  '--output-last-message',
  options.outputPath,
  '--cd',
  options.workspaceDirectory,
  '-c',
  'approval_policy="never"',
  '-c',
  `model_reasoning_effort="${QUALIFICATION_REASONING_EFFORT}"`,
  '-c',
  'web_search="disabled"',
  '-',
];
