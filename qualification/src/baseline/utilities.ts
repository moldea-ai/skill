import { isDeepStrictEqual } from 'node:util';

import type {
  IQualificationExecutionEnvironment,
  IQualificationProvenance,
} from '../contracts/index.ts';

/** Compares exact execution environments without depending on object property insertion order. */
export const haveSameQualificationExecutionEnvironment = (
  left: Pick<IQualificationProvenance, keyof IQualificationExecutionEnvironment>,
  right: IQualificationExecutionEnvironment,
): boolean => isDeepStrictEqual(left, right);
