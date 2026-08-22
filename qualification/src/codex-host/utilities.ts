import { buildCodexEvaluationHostCommand } from '../../../tooling/codex-evaluation-host/index.mjs';

/** Builds the externally sandboxed, fixed-model command for one qualification role. */
export const createCodexExecCommand = (options: {
  outputPath: string;
  schemaPath: string;
}): string[] =>
  buildCodexEvaluationHostCommand([
    'codex',
    'exec',
    '--ignore-user-config',
    '--ignore-rules',
    '--ephemeral',
    '--skip-git-repo-check',
    '--dangerously-bypass-approvals-and-sandbox',
    '--json',
    '--output-schema',
    options.schemaPath,
    '--output-last-message',
    options.outputPath,
    '-c',
    'shell_environment_policy.inherit=none',
    '-c',
    'web_search=disabled',
    '-',
  ]);
