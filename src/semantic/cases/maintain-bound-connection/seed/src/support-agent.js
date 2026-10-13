import { loadInstruction } from './support/instruction-loader.js';

export const createSupportAgent = (runtime) =>
  runtime.createAgent({ instruction: loadInstruction() });
