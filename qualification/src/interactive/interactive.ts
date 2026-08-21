import { confirm, select } from '@inquirer/prompts';

import { listQualificationImplementations } from '../compatibility/index.ts';
import { QUALIFICATION_MODEL } from '../constants/index.ts';
import { listLocalAttemptCheckpoints } from '../execution/index.ts';

export type IInteractiveQualificationAction =
  | { kind: 'resume'; attemptId: string }
  | { kind: 'run'; adapterId: string; implementationId: string }
  | { kind: 'status' }
  | { kind: 'verify' };

/** Prompts for the next local workflow action while prioritizing resumable attempts. */
export const promptQualificationAction = async (): Promise<IInteractiveQualificationAction> => {
  const [attempts, implementations] = await Promise.all([
    listLocalAttemptCheckpoints(),
    listQualificationImplementations(),
  ]);
  const resumableAttempts = attempts.filter(
    ({ recordedAt, status }) => status === 'incomplete' && recordedAt === null,
  );
  const action = await select<string>({
    message: 'Select a qualification action',
    choices: [
      ...resumableAttempts.map((attempt) => ({
        name: `Resume ${attempt.attemptId}`,
        value: `resume:${attempt.attemptId}`,
        description: `${attempt.selection.adapterId}/${attempt.selection.implementationId}`,
      })),
      {
        name: 'Run qualification',
        value: 'run',
        description: 'Start a new adapter implementation attempt.',
      },
      {
        name: 'View status',
        value: 'status',
        description: 'Inspect local checkpoints and committed latest results.',
      },
      {
        name: 'Verify results',
        value: 'verify',
        description: 'Validate committed result schemas, pointers, and artifact digests.',
      },
    ],
  });

  if (action.startsWith('resume:')) {
    return { kind: 'resume', attemptId: action.slice('resume:'.length) };
  }

  if (action === 'status' || action === 'verify') {
    return { kind: action };
  }

  const target = await select<string>({
    message: 'Select an adapter implementation',
    choices: implementations.map((implementation) => ({
      name: `${implementation.adapterId}/${implementation.implementationId ?? '<no-target>'}`,
      value: `${implementation.adapterId}:${implementation.implementationId ?? ''}`,
      description: implementation.supportLevel ?? implementation.implementationStatus,
      disabled: implementation.disabledReason ?? false,
    })),
  });
  const separatorIndex = target.indexOf(':');

  return {
    kind: 'run',
    adapterId: target.slice(0, separatorIndex),
    implementationId: target.slice(separatorIndex + 1),
  };
};

/** Requires a default-deny approval immediately before any paid Terra stages can run. */
export const confirmPaidQualificationExecution = async (modelCallCount: number): Promise<boolean> =>
  confirm({
    message: `This attempt can make up to ${modelCallCount} paid ${QUALIFICATION_MODEL} calls and can take a long time. Continue?`,
    default: false,
  });
