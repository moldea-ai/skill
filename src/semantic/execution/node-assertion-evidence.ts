import ts from 'typescript';
import { z } from 'zod';

import {
  getNodeEvalSource,
  NODE_ASSERTION_METHODS,
  redactCodexDiagnosticText,
  type ICliInvocation,
} from '../../execution/host/index.ts';

const SAFE_NAME = /^[A-Za-z_$][\w$]{0,63}$/u;
const SAFE_MODULE = /^\.\/(?:[a-z0-9_-]+\/)*[a-z0-9_.-]+$/iu;
const ASSERT_MODULES = new Set(['node:assert', 'node:assert/strict']);
const SafeTextSchema = z
  .string()
  .max(512)
  .refine((value) => redactCodexDiagnosticText(value) === value);
const AssertionFactSchema = z.union([
  z.strictObject({
    kind: z.literal('node-assertion'),
    status: z.enum(['ambiguous', 'skipped', 'unsupported']),
  }),
  z.strictObject({
    actual: SafeTextSchema,
    expected: SafeTextSchema.nullable(),
    kind: z.literal('node-assertion'),
    method: z.enum(NODE_ASSERTION_METHODS),
    source: SafeTextSchema.nullable(),
    status: z.enum(['failed', 'passed']),
  }),
]);
export type INodeAssertionFact = z.infer<typeof AssertionFactSchema>;

const renderLiteral = (node: ts.Expression, depth = 0): string | null => {
  if (depth > 4) return null;
  if (ts.isStringLiteral(node)) {
    if (!/^[A-Za-z0-9_. /-]{0,64}$/u.test(node.text)) return null;
    return JSON.stringify(node.text);
  }
  if (ts.isNumericLiteral(node) && Number.isFinite(Number(node.text))) {
    return JSON.stringify(Number(node.text));
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) return 'true';
  if (node.kind === ts.SyntaxKind.FalseKeyword) return 'false';
  if (node.kind === ts.SyntaxKind.NullKeyword) return 'null';
  if (ts.isArrayLiteralExpression(node) && node.elements.length <= 12) {
    const values = node.elements.map((element) => renderLiteral(element, depth + 1));
    return values.includes(null) ? null : '[' + values.join(', ') + ']';
  }
  if (ts.isObjectLiteralExpression(node) && node.properties.length <= 12) {
    const properties = new Map<string, string>();
    for (const property of node.properties) {
      if (
        !ts.isPropertyAssignment(property) ||
        (!ts.isIdentifier(property.name) && !ts.isStringLiteral(property.name))
      )
        return null;
      const name = property.name.text;
      const value = renderLiteral(property.initializer, depth + 1);
      if (!SAFE_NAME.test(name) || name === '__proto__' || properties.has(name) || value === null)
        return null;
      properties.set(name, value);
    }
    return (
      '{' +
      [...properties].map(([name, value]) => JSON.stringify(name) + ': ' + value).join(', ') +
      '}'
    );
  }
  return null;
};

const readRequire = (node: ts.Expression | undefined): string | null => {
  if (
    node === undefined ||
    !ts.isCallExpression(node) ||
    node.questionDotToken !== undefined ||
    !ts.isIdentifier(node.expression) ||
    node.expression.text !== 'require' ||
    node.arguments.length !== 1 ||
    !ts.isStringLiteral(node.arguments[0]!)
  )
    return null;
  return node.arguments[0].text;
};

const readActual = (
  node: ts.Expression,
  bindings: ReadonlyMap<string, { expression: string; source: string | null }>,
  depth = 0,
): { expression: string; source: string | null } | null => {
  if (depth > 8) return null;
  const literal = renderLiteral(node);
  if (literal !== null) return { expression: literal, source: null };
  if (ts.isIdentifier(node)) return bindings.get(node.text) ?? null;
  if (
    ts.isPropertyAccessExpression(node) &&
    node.questionDotToken === undefined &&
    SAFE_NAME.test(node.name.text)
  ) {
    const base = readActual(node.expression, bindings, depth + 1);
    return base === null ? null : { ...base, expression: base.expression + '.' + node.name.text };
  }
  if (ts.isCallExpression(node) && node.questionDotToken === undefined) {
    const base = readActual(node.expression, bindings, depth + 1);
    const values = node.arguments.map((argument) => renderLiteral(argument));
    return base === null || base.source === null || values.includes(null)
      ? null
      : { ...base, expression: base.expression + '(' + values.join(', ') + ')' };
  }
  return null;
};

/** Recognizes a straight-line assertion using a standard assertion binding and bounded operands. */
const readAssertion = (source: string) => {
  const script = ts.createSourceFile(
    'assertion.js',
    source,
    ts.ScriptTarget.ESNext,
    false,
    ts.ScriptKind.JS,
  );
  const bindings = new Map<string, { expression: string; source: string | null }>();
  let assertName: string | null = null;
  let check: {
    actual: string;
    expected: string | null;
    method: (typeof NODE_ASSERTION_METHODS)[number];
    source: string | null;
  } | null = null;
  for (const statement of script.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      check === null
    ) {
      const module = statement.moduleSpecifier.text;
      const clause = statement.importClause;
      if (clause === undefined) return null;
      if (
        ASSERT_MODULES.has(module) &&
        clause.name !== undefined &&
        clause.namedBindings === undefined &&
        assertName === null
      ) {
        assertName = clause.name.text;
        continue;
      }
      if (!SAFE_MODULE.test(module) || module.includes('..')) return null;
      const named = clause.namedBindings;
      if (clause.name !== undefined)
        bindings.set(clause.name.text, { expression: clause.name.text, source: module });
      if (named !== undefined && ts.isNamedImports(named)) {
        for (const element of named.elements) {
          bindings.set(element.name.text, {
            expression: element.propertyName?.text ?? element.name.text,
            source: module,
          });
        }
      } else if (named !== undefined) return null;
      continue;
    }
    if (
      ts.isVariableStatement(statement) &&
      check === null &&
      (statement.declarationList.flags & ts.NodeFlags.Const) !== 0
    ) {
      for (const declaration of statement.declarationList.declarations) {
        const { name, initializer } = declaration;
        if (!ts.isIdentifier(name) || initializer === undefined) return null;
        if (ASSERT_MODULES.has(readRequire(initializer) ?? '') && assertName === null) {
          assertName = name.text;
        } else {
          const actual = readActual(initializer, bindings);
          if (actual === null) return null;
          bindings.set(name.text, actual);
        }
      }
      continue;
    }
    if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression))
      return null;
    const { expression, arguments: args, questionDotToken } = statement.expression;
    if (
      questionDotToken !== undefined ||
      !ts.isPropertyAccessExpression(expression) ||
      expression.questionDotToken !== undefined ||
      !ts.isIdentifier(expression.expression)
    )
      return null;
    const name = expression.expression.text;
    const method = NODE_ASSERTION_METHODS.find((candidate) => candidate === expression.name.text);
    if (
      name === 'console' &&
      expression.name.text === 'log' &&
      check !== null &&
      args.every(ts.isStringLiteral)
    )
      continue;
    if (
      name !== assertName ||
      method === undefined ||
      check !== null ||
      args.length !== (method === 'ok' ? 1 : 2)
    )
      return null;
    const actual = readActual(args[0]!, bindings);
    const expected = args[1] === undefined ? null : renderLiteral(args[1]);
    if (actual === null || (method !== 'ok' && expected === null)) return null;
    check = { actual: actual.expression, expected, method, source: actual.source };
  }
  return check;
};

/** Projects only bounded assertion semantics supported by the observed call on that child. */
export const projectNodeAssertion = (invocation: ICliInvocation): INodeAssertionFact => {
  const kind = 'node-assertion' as const;
  const source = getNodeEvalSource(invocation.arguments);
  let assertion: ReturnType<typeof readAssertion>;
  try {
    assertion = source === null ? null : readAssertion(source);
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return { kind, status: 'unsupported' };
  }
  if (assertion === null) return { kind, status: 'unsupported' };
  const observation = invocation.assertionObservation;
  if (observation === null) return { kind, status: 'skipped' };
  if (
    observation === undefined ||
    observation === 'ambiguous' ||
    observation.method !== assertion.method
  )
    return { kind, status: 'ambiguous' };
  const status = observation.passed ? 'passed' : 'failed';
  const projection = AssertionFactSchema.safeParse({ kind, status, ...assertion });
  return projection.success ? projection.data : { kind, status: 'unsupported' };
};

/** Validates the private assertion fact during checkpoint and judge projection. */
export const hasValidNodeAssertionFact = (fact: unknown): fact is INodeAssertionFact =>
  AssertionFactSchema.safeParse(fact).success;
