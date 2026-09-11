import { confirm, select } from '@inquirer/prompts';

import { listQualificationImplementations } from '../compatibility/index.ts';
import {
  QUALIFICATION_ACTOR_REASONING_EFFORT,
  QUALIFICATION_JUDGE_REASONING_EFFORT,
  QUALIFICATION_MODEL,
} from '../constants/index.ts';
import { listLocalQualificationStatusAttempts } from '../status/index.ts';

export type IInteractiveQualificationAction =
  | { kind: 'resume'; attemptId: string }
  | { kind: 'run'; adapterId: string; implementationId: string }
  | { kind: 'status' }
  | { kind: 'verify' };

/** Prompts for the next local workflow action while prioritizing resumable attempts. */
export const promptQualificationAction = async (): Promise<IInteractiveQualificationAction> => {
  const [attempts, implementations] = await Promise.all([
    listLocalQualificationStatusAttempts(),
    listQualificationImplementations(),
  ]);
  const resumableAttempts = attempts.filter(
    ({ isRecorded, status }) => status === 'incomplete' && !isRecorded,
  );
  const action = await select<string>({
    message: 'Select a qualification action',
    choices: [
      ...resumableAttempts.map((attempt) => ({
        name: `Resume ${attempt.attemptId}`,
        value: `resume:${attempt.attemptId}`,
        description: `${attempt.adapterId}/${attempt.implementationId}`,
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
      description: implementation.implementationStatus,
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

/** Requires a default-deny approval immediately before any paid model stages can run. */
export const confirmPaidQualificationExecution = async (
  plannedCallCount: number,
  maximumCallCount: number,
  maximumTokenCount: number,
): Promise<boolean> =>
  confirm({
    message: `This attempt plans up to ${plannedCallCount} paid frontier-model calls and can make at most ${maximumCallCount} calls including bounded operational retries, with at most ${maximumTokenCount} total tokens across that envelope (${QUALIFICATION_MODEL}, ${QUALIFICATION_ACTOR_REASONING_EFFORT} actors, ${QUALIFICATION_JUDGE_REASONING_EFFORT} judges). Continue?`,
    default: false,
  });
