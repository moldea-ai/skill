import { isDeepStrictEqual } from 'node:util';

import type { IQualificationExecutionEnvironment } from '../contracts/index.ts';

/** Compares exact execution environments without depending on object property insertion order. */
export const haveSameQualificationExecutionEnvironment = (
  left: IQualificationExecutionEnvironment,
  right: IQualificationExecutionEnvironment,
): boolean => isDeepStrictEqual(left, right);
