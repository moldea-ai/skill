#!/usr/bin/env node

import { applySemanticEvaluationOutcome, runSemanticEvaluation } from './semantic-evaluation.mjs';

try {
  applySemanticEvaluationOutcome(await runSemanticEvaluation());
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[semantic-evaluation-identity] ${message}\n`);
  process.exitCode = 1;
}
