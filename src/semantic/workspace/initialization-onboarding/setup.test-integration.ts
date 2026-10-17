// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, test, vi } from 'vitest';

import { loadSemanticCases } from '../../cases/index.ts';
import { createActorRepository } from '../index.ts';

test.each([
  ['initialize-onboarding-confirmation', false, false],
  ['initialize-onboarding-approved', false, false],
  ['initialize-onboarding-confirmed', true, false],
  ['initialize-onboarding-continuation', true, true],
] as const)(
  'onboarding fixture %s has working calls and coherent prior state',
  async (caseId, hasFoundation, hasCompletedSupport) => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-onboarding-'));
    vi.stubEnv('CODEX_HOME', path.join(root, 'empty-codex-home'));
    try {
      const definitions = await loadSemanticCases(path.resolve(import.meta.dirname, '../../cases'));
      const definition = definitions.find(({ id }) => id === caseId);
      expect(definition).toBeDefined();
      if (definition === undefined) throw new Error(`Missing onboarding case ${caseId}.`);
      const { repositoryPath } = await createActorRepository(
        root,
        definition,
        path.join(root, 'home'),
        path.join(root, 'tools'),
      );
      const output = execFileSync(
        process.execPath,
        [
          '--test',
          '--test-reporter=tap',
          'src/support-agent.test-integration.js',
          'src/invoice-workflow.test-integration.js',
        ],
        { cwd: repositoryPath, encoding: 'utf8', timeout: 30_000 },
      );
      expect(output).toContain('# pass 2');
      expect(output).toContain('# fail 0');
      const readme = await readFile(path.join(repositoryPath, 'README.md'), 'utf8');
      for (const relativePath of [
        'docs/architecture.md',
        'docs/operations-policy.md',
        'docs/decisions/001-human-approval.md',
        'skills/release-review/SKILL.md',
      ]) {
        expect(readme).toContain(relativePath);
      }
      const decision = await readFile(
        path.join(repositoryPath, 'docs/decisions/001-human-approval.md'),
        'utf8',
      );
      expect(decision).toContain('Accepted and active');
      await expect(access(path.join(root, 'home', '.codex', 'auth.json'))).rejects.toMatchObject({
        code: 'ENOENT',
      });
      if (hasFoundation) {
        const project = await readFile(path.join(repositoryPath, 'moldea/project.md'), 'utf8');
        const foundationEvidence = definition.input.repositoryEvidence.find(
          ({ source }) => source.kind === 'workspace-path' && source.path === 'moldea/project.md',
        );
        for (const linkedPath of [
          '../docs/architecture.md',
          '../docs/operations-policy.md',
          '../docs/decisions/001-human-approval.md',
          '../skills/release-review/SKILL.md',
        ]) {
          expect(project).toContain(linkedPath);
          expect(foundationEvidence?.claim).toContain(linkedPath);
        }
        const result: unknown = JSON.parse(
          execFileSync(
            process.execPath,
            [
              path.join(repositoryPath, '.agents/skills/moldea/scripts/moldea-cli.mjs'),
              '--repository',
              repositoryPath,
              '--',
              'validate',
              '--json',
              '--max-output-bytes',
              '65536',
            ],
            { cwd: repositoryPath, encoding: 'utf8', timeout: 30_000 },
          ),
        );
        expect(result).toMatchObject({
          status: 'valid',
          result: { valid: true, errorCount: 0, warningCount: 0 },
        });
        const manifest = await readFile(path.join(repositoryPath, 'moldea/moldea.yaml'), 'utf8');
        expect(manifest.includes('support-triage:')).toBe(hasCompletedSupport);
        if (hasCompletedSupport) {
          expect(manifest).toContain('loadSupportInstruction');
          const source = await readFile(path.join(repositoryPath, 'src/support-agent.js'), 'utf8');
          expect(source).toContain('moldea/agents/support-triage/instruction.md');
          const invoice = await readFile(
            path.join(repositoryPath, 'src/invoice-workflow.js'),
            'utf8',
          );
          expect(invoice).toContain('instructions:');
        }
      } else {
        await expect(access(path.join(repositoryPath, 'moldea/moldea.yaml'))).rejects.toMatchObject(
          { code: 'ENOENT' },
        );
      }
      expect(
        execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
          cwd: repositoryPath,
          encoding: 'utf8',
        }),
      ).toBe('');
    } finally {
      vi.unstubAllEnvs();
      await rm(root, { recursive: true, force: true });
    }
    await expect(access(root)).rejects.toMatchObject({ code: 'ENOENT' });
  },
);
