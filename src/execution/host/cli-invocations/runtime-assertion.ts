import assert from 'node:assert';

export const NODE_ASSERTION_METHODS = [
  'deepEqual',
  'deepStrictEqual',
  'equal',
  'notEqual',
  'notStrictEqual',
  'ok',
  'strictEqual',
] as const;

/** Selects a bounded eval program with no additional Node loaders or execution switches. */
export const getNodeEvalSource = (args: readonly string[]): string | null => {
  const evalArgs =
    args[0] === '--input-type=module' || args[0] === '--input-type=commonjs' ? args.slice(1) : args;
  if (evalArgs.length !== 2 || !['-e', '--eval'].includes(evalArgs[0] ?? '')) return null;
  const source = evalArgs[1]!;
  return Buffer.byteLength(source) <= 4096 ? source : null;
};

/** Observes calls from the eval itself, excluding assertions inside imported modules. */
export const observeNodeAssertions = () => {
  type IAssertionCall = {
    method: (typeof NODE_ASSERTION_METHODS)[number];
    passed: boolean;
  };
  let firstCall: IAssertionCall | null = null;
  let count = 0;
  const captureStack = Error.captureStackTrace.bind(Error);
  for (const target of [assert, assert.strict]) {
    for (const method of NODE_ASSERTION_METHODS) {
      const original = target[method];
      const wrapped = (...args: unknown[]): unknown => {
        const location: { stack?: string } = {};
        captureStack(location, wrapped);
        const caller = location.stack?.split('\n', 2)[1] ?? '';
        const isEvalCall = /^\s+at (?:file:\/\/\/mnt\/\[eval\d*\]|\[eval\]):\d+:\d+$/u.test(caller);
        try {
          const result: unknown = Reflect.apply(original, target, args);
          if (isEvalCall && ++count === 1) firstCall = { method, passed: true };
          return result;
        } catch (error) {
          if (isEvalCall && ++count === 1) firstCall = { method, passed: false };
          throw error;
        }
      };
      Object.defineProperty(target, method, { value: wrapped });
    }
  }
  return () => (count > 1 ? ('ambiguous' as const) : firstCall);
};
