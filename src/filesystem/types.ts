import type { ZodType } from 'zod';

// schema boundary accepted by JSON and YAML readers
export type IBoundarySchema<TResult> = ZodType<TResult>;
