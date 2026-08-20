import type {
  IActorOutput,
  IDeterministicVerification,
  IQualificationCaseScenario,
  IWorkspaceAssertionResult,
} from '../contracts/index.ts';

/** Builds the fixed Terra actor prompt around one transparent project task. */
export const buildActorPrompt = (options: {
  task: string;
}): string => `Complete the project task below in the current Git working tree:

${options.task.trim()}

Execution rules:

- Use the project-local Moldea tooling and follow applicable Agent Skill guidance discovered in the workspace.
- Do not call a provider, run an agent, invoke another model, use subagents, or use network access.
- Preserve all unrelated pre-existing changes and untracked files.
- Do not modify mounted inputs under \`.agents/skills/moldea/\` or \`.moldea-qualification/\`.
- Treat ambiguous or unsupported runtime behavior conservatively. Record it explicitly instead of inventing evidence.
- Inspect the final Git diff and run the relevant local validation before finishing.
- Return only the structured result required by the output schema.
`;

/** Builds the independent read-only Terra judge prompt with deterministic evidence and requirements. */
export const buildJudgePrompt = (options: {
  actorOutput: IActorOutput;
  adapterId: string;
  deterministicAfter: IDeterministicVerification;
  implementationId: string;
  scenario: IQualificationCaseScenario;
  task: string;
  workspaceAssertions: IWorkspaceAssertionResult;
}): string => `You are the independent judge for a moldea adapter qualification case.

Target adapter: ${options.adapterId}
Target implementation: ${options.implementationId}
Case: ${options.scenario.id} (${options.scenario.title})

Read the installed candidate skill at \`.agents/skills/moldea/SKILL.md\`, the project task, the complete current working tree, and the Git diff. Do not modify files. Do not call a provider, run an agent, invoke another model, use subagents, or use network access.

Project task:

${options.task.trim()}

Required judgments:
${options.scenario.judgeRequirements
  .map(({ id, description }) => `- ${id}: ${description}`)
  .join('\n')}

Actor report (claims are not evidence by themselves):

${JSON.stringify(options.actorOutput, null, 2)}

Deterministic post-actor summary:

${JSON.stringify(options.deterministicAfter, null, 2)}

Workspace assertions:

${JSON.stringify(options.workspaceAssertions, null, 2)}

Judge every declared requirement. A pass requires the actual repository state, deterministic evidence, and diff to agree. Return only the structured result required by the output schema.
`;
