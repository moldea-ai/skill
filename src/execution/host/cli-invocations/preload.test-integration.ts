import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test, vi } from 'vitest';

import { readReleaseIdentity } from '../../../release/index.ts';
import {
  createSemanticResultDimensions,
  hasVerifiedManagedAgentsHandoff,
  parseSemanticEvaluationHostOutput,
} from '../../../semantic/execution/index.ts';
import { semanticCase } from '../../../semantic/cases/ordinary-final-validation-limit/case.ts';
import { semanticCase as staleIntegrationCase } from '../../../semantic/cases/repair-stale-integration/case.ts';
import {
  createActorRepository,
  diffSemanticWorkspaceSnapshots,
  snapshotSemanticWorkspace,
} from '../../../semantic/workspace/index.ts';

import { buildCodexEvaluationHostCommand, runCodexEvaluationHost } from '../host.ts';
import { CliInvocationEventSchema } from './index.ts';

test('parallel real validation and writer print retain separately proved results', async () => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-parallel-tools-'));
  try {
    await mkdir(join(root, 'source-home'));
    vi.stubEnv('CODEX_HOME', join(root, 'source-home'));
    const home = join(root, 'home');
    const tools = join(root, 'tools');
    const { repositoryPath, readOnlyMounts } = await createActorRepository(
      root,
      staleIntegrationCase,
      home,
      tools,
    );
    const commands = [
      'node /mnt/.agents/skills/moldea/scripts/moldea-cli.mjs --repository /mnt -- validate --json --max-output-bytes 65536',
      'node /mnt/.agents/skills/moldea/scripts/managed-agents.mjs --repository /mnt --print',
    ];
    await writeFile(
      join(tools, 'codex'),
      '#!/opt/node\n' +
        `const {spawn}=require('node:child_process');\n` +
        `const commands=${JSON.stringify(commands)};\n` +
        `const emit=(type,index,result)=>console.log(JSON.stringify({type,item:{id:'parallel-'+index,type:'command_execution',command:"/bin/bash -lc '"+commands[index]+"'",...(result?{status:result.code===0?'completed':'failed',exit_code:result.code,aggregated_output:result.stdout+result.stderr}:{})}}));\n` +
        `Promise.all(commands.map((command,index)=>new Promise((resolve,reject)=>{emit('item.started',index);const child=spawn('/bin/bash',['-c',command]);let stdout='',stderr='';child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);child.once('error',reject);child.once('close',code=>resolve({index,code,stdout,stderr}));}))).then(results=>{for(const result of results.toReversed())emit('item.completed',result.index,result);console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:results[1].stdout}}));}).catch(error=>{console.error(error);process.exitCode=1;});\n`,
      { mode: 0o755 },
    );
    await writeFile(join(tools, 'codex-code-mode-host'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
    vi.stubEnv('PATH', `${tools}:${process.env['PATH'] ?? ''}`);
    const output = await runCodexEvaluationHost({
      command: buildCodexEvaluationHostCommand(
        [
          'codex',
          'exec',
          '--ephemeral',
          '--ignore-rules',
          '--ignore-user-config',
          '--skip-git-repo-check',
          '--dangerously-bypass-approvals-and-sandbox',
          '-c',
          'shell_environment_policy.inherit=none',
          '-',
        ],
        'actor',
      ),
      cwd: repositoryPath,
      sandboxHome: home,
      role: 'actor',
      prompt: 'Observe parallel installed tools',
      readOnlyMounts,
      readOnlyWorkspacePaths: ['.agents', '.git'],
    });
    const identity = readReleaseIdentity(process.cwd());
    const parsed = parseSemanticEvaluationHostOutput(output, {
      cliVersion: identity.cliVersion,
      jsonSchemaVersion: identity.cliJsonSchemaVersion,
    });
    const facts = parsed.actorExecutionEvidence.flatMap(({ item }) => item.outputEvidence.facts);
    expect(facts.filter((fact) => fact.kind === 'moldea-cli-envelope')).toHaveLength(1);
    expect(facts.filter((fact) => fact.kind === 'managed-agents-print-result')).toHaveLength(1);
    expect(hasVerifiedManagedAgentsHandoff(parsed.actorExecutionEvidence, parsed.response)).toBe(
      true,
    );
    expect(parsed.commandPolicyEvidence.completedCommandCount).toBe(2);
    expect(parsed.actorResourceEvidence.commandCount).toBe(1);
    const capture = output.split('\n').flatMap((line) => {
      if (line === '') return [];
      const result = CliInvocationEventSchema.safeParse(JSON.parse(line) as unknown);
      return result.success ? [result.data] : [];
    });
    expect(capture).toHaveLength(1);
    expect(capture[0]!.invocations).toHaveLength(2);
    expect(
      capture[0]!.invocations.every((invocation) => (invocation.callers?.length ?? 0) > 0),
    ).toBe(true);
    if (capture[0]!.invocations.some((invocation) => invocation.overlapping === true)) {
      expect(
        parsed.commandPolicyEvidence.moldeaEvents.every(
          (event) => event.kind !== 'command' || event.operations === null,
        ),
      ).toBe(true);
    }
    expect(JSON.stringify(parsed)).not.toContain('callerIdentities');
    expect(JSON.stringify(parsed)).not.toContain('overlapping');
  } finally {
    vi.unstubAllEnvs();
    await rm(root, { recursive: true, force: true });
  }
});

test.each(['sequential', 'overlapping', 'failed-command'] as const)(
  'associates real repeated compound shells only with %s SDK command lifetimes',
  async (form) => {
    const root = await mkdtemp(join(tmpdir(), 'moldea-shell-instance-'));
    try {
      await mkdir(join(root, 'source-home'));
      vi.stubEnv('CODEX_HOME', join(root, 'source-home'));
      const home = join(root, 'home');
      const tools = join(root, 'tools');
      const { repositoryPath, readOnlyMounts } = await createActorRepository(
        root,
        staleIntegrationCase,
        home,
        tools,
      );
      const args = [
        '/mnt/.agents/skills/moldea/scripts/moldea-cli.mjs',
        '--repository',
        '/mnt',
        '--',
        'validate',
        '--json',
        '--max-output-bytes',
        '65536',
      ];
      await writeFile(join(repositoryPath, 'consume.mjs'), 'void 0;\n');
      await writeFile(
        join(repositoryPath, 'next.mjs'),
        `import { spawnSync } from 'node:child_process';\nconst r = spawnSync('/opt/node', ${JSON.stringify(args)}, {stdio:'inherit'});\nprocess.exitCode = r.status ?? 1;\n`,
      );
      const script =
        'node /mnt/consume.mjs\nnode /mnt/next.mjs' + (form === 'failed-command' ? '\nexit 7' : '');
      const display = `/bin/bash -lc '${script}'`;
      await writeFile(
        join(tools, 'codex'),
        '#!/opt/node\n' +
          `const {spawnSync} = require('node:child_process');\n` +
          `const emit=(type,id,result)=>console.log(JSON.stringify({type,item:{id,type:'command_execution',command:${JSON.stringify(display)},...(result?{status:result.status===0?'completed':'failed',exit_code:result.status,aggregated_output:result.stdout+result.stderr}:{})}}));\n` +
          (form === 'overlapping'
            ? `emit('item.started','first');emit('item.started','second');\n`
            : '') +
          `for (const id of ['first','second']) { ${form !== 'overlapping' ? "emit('item.started',id);" : ''} const r=spawnSync('/bin/bash',['-c',${JSON.stringify(script)}],{encoding:'utf8'});emit('item.completed',id,r); }\n` +
          `console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'Complete.'}}));\n`,
        { mode: 0o755 },
      );
      await writeFile(join(tools, 'codex-code-mode-host'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
      vi.stubEnv('PATH', `${tools}:${process.env['PATH'] ?? ''}`);
      const output = await runCodexEvaluationHost({
        command: buildCodexEvaluationHostCommand(
          [
            'codex',
            'exec',
            '--ephemeral',
            '--ignore-rules',
            '--ignore-user-config',
            '--skip-git-repo-check',
            '--dangerously-bypass-approvals-and-sandbox',
            '-c',
            'shell_environment_policy.inherit=none',
            '-',
          ],
          'actor',
        ),
        cwd: repositoryPath,
        sandboxHome: home,
        role: 'actor',
        prompt: 'Observe repeated shells',
        readOnlyMounts,
      });
      const captured = output
        .split('\n')
        .map((line) => CliInvocationEventSchema.safeParse(JSON.parse(line) as unknown))
        .find((event) => event.success);
      if (!captured?.success) throw new Error('Missing invocation capture.');
      const capture = captured.data;
      expect(capture.commandInstances).toHaveLength(2);
      expect(new Set(capture.commandInstances!.map((instance) => instance.identity)).size).toBe(2);
      expect(capture.invocations).toHaveLength(2);
      const identity = readReleaseIdentity(process.cwd());
      const parsed = parseSemanticEvaluationHostOutput(output, {
        cliVersion: identity.cliVersion,
        jsonSchemaVersion: 7,
      });
      expect(parsed.commandPolicyEvidence.completedCommandCount).toBe(2);
      expect(parsed.actorResourceEvidence.commandCount).toBe(2);
      const facts = parsed.actorExecutionEvidence.flatMap(({ item }) => item.outputEvidence.facts);
      expect(facts.filter((fact) => fact.kind === 'moldea-cli-envelope')).toHaveLength(
        form !== 'overlapping' ? 2 : 0,
      );
      if (form !== 'overlapping')
        expect(
          parsed.commandPolicyEvidence.moldeaEvents.flatMap((event) =>
            event.kind === 'command' ? (event.operations ?? []) : [],
          ),
        ).toMatchObject([
          { kind: 'cli', operation: 'validate' },
          { kind: 'cli', operation: 'validate' },
        ]);
      expect(JSON.stringify(parsed)).not.toContain('callerIdentities');
      expect(JSON.stringify(parsed)).not.toContain('commandInstances');
      if (form === 'failed-command')
        expect(
          parsed.actorExecutionEvidence
            .filter(({ item }) => item.commandKind === 'other')
            .map(({ item }) => item.exitCode),
        ).toStrictEqual([7, 7]);
    } finally {
      vi.unstubAllEnvs();
      await rm(root, { recursive: true, force: true });
    }
  },
);

test.each([
  'direct',
  'wrapped',
  'wrapped-twice',
  'heredoc',
  'filtered',
  'copied',
  'failed',
  'continuation',
  'unmatched',
  'ambiguous',
  'uncaptured',
  'oversized',
  'unprotected',
  'linked',
  'node-flags',
] as const)('captures actual managed writer method through %s execution', async (form) => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-writer-'));
  try {
    await mkdir(join(root, 'source-home'));
    vi.stubEnv('CODEX_HOME', join(root, 'source-home'));
    const home = join(root, 'home');
    const tools = join(root, 'tools');
    const { repositoryPath, readOnlyMounts } = await createActorRepository(
      root,
      staleIntegrationCase,
      home,
      tools,
    );
    if (form === 'copied' || form === 'linked')
      await cp(join(repositoryPath, '.agents/skills/moldea'), join(repositoryPath, 'copied'), {
        recursive: true,
      });
    if (form === 'linked') {
      const entrypoint = join(repositoryPath, '.agents/skills/moldea/scripts/managed-agents.mjs');
      await rm(entrypoint);
      await symlink('/mnt/copied/scripts/managed-agents.mjs', entrypoint);
    }
    const writer =
      form === 'copied'
        ? '/mnt/copied/scripts/managed-agents.mjs'
        : '/mnt/.agents/skills/moldea/scripts/managed-agents.mjs';
    const args = [writer, '--repository', '/mnt', ...(form === 'failed' ? ['--unknown'] : [])];
    const wrapper = `for(let i=0;i<${form === 'wrapped-twice' ? 2 : 1};i++){const r=require('node:child_process').spawnSync('/opt/node',${JSON.stringify(args)},{encoding:'utf8'});${form === 'filtered' ? '' : 'process.stdout.write(r.stdout);process.stderr.write(r.stderr);'}${form === 'oversized' ? "process.stdout.write('x'.repeat(262145));" : ''}process.exitCode=r.status;}`;
    const executionArgs =
      form === 'heredoc'
        ? ['-c', `/opt/node <<'NODE'\n${wrapper}\nNODE`]
        : form === 'node-flags'
          ? ['--no-warnings', ...args]
          : form === 'direct' || form === 'copied' || form === 'failed'
            ? args
            : ['-e', wrapper];
    const command =
      form === 'unmatched'
        ? '/opt/node -e "unrelated wrapper"'
        : form === 'heredoc'
          ? `/bin/bash -lc '${executionArgs[1]!.replaceAll("'", "'\\''")}'`
          : '/opt/node ' +
            executionArgs.map((argument) => `'${argument.replaceAll("'", "'\\''")}'`).join(' ');
    await writeFile(
      join(tools, 'codex'),
      '#!/opt/node\n' +
        `const r=require('node:child_process').spawnSync('${form === 'heredoc' ? '/bin/bash' : '/opt/node'}',${JSON.stringify(executionArgs)},{encoding:'utf8'${form === 'uncaptured' ? ",env:{...process.env,NODE_OPTIONS:''}" : ''}});` +
        `for(let i=0;i<${form === 'ambiguous' ? 2 : 1};i++)console.log(JSON.stringify({type:'item.completed',item:{type:'command_execution',command:${JSON.stringify(command)},status:r.status===0?'completed':'failed',exit_code:r.status,aggregated_output:r.stdout+r.stderr}}));` +
        `console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'Writer observation complete.'}}));\n`,
      { mode: 0o755 },
    );
    await writeFile(join(tools, 'codex-code-mode-host'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
    vi.stubEnv('PATH', `${tools}:${process.env['PATH'] ?? ''}`);
    const run = () =>
      runCodexEvaluationHost({
        command: buildCodexEvaluationHostCommand(
          [
            'codex',
            'exec',
            '--ephemeral',
            '--ignore-rules',
            '--ignore-user-config',
            '--skip-git-repo-check',
            '--dangerously-bypass-approvals-and-sandbox',
            '-c',
            'shell_environment_policy.inherit=none',
            '-',
          ],
          'actor',
        ),
        cwd: repositoryPath,
        sandboxHome: home,
        role: 'actor',
        prompt: 'Observe installed writer',
        readOnlyMounts,
        readOnlyWorkspacePaths: form === 'unprotected' ? ['.git'] : ['.agents', '.git'],
      });
    const identity = readReleaseIdentity(process.cwd());
    const parse = (output: string) =>
      parseSemanticEvaluationHostOutput(output, {
        cliVersion: identity.cliVersion,
        jsonSchemaVersion: identity.cliJsonSchemaVersion,
      });
    const parsed = parse(await run());
    const hostItem = parsed.actorExecutionEvidence.find(
      ({ item }) => item.commandKind === 'other',
    )?.item;
    if (form === 'failed') expect(hostItem?.exitCode).not.toBe(0);
    else expect(hostItem?.exitCode).toBe(0);
    const facts = parsed.actorExecutionEvidence
      .flatMap(({ item }) => item.outputEvidence.facts)
      .filter((fact) => fact.kind === 'managed-agents-result');
    expect(facts).toStrictEqual(
      [
        'copied',
        'failed',
        'unmatched',
        'ambiguous',
        'uncaptured',
        'unprotected',
        'linked',
      ].includes(form)
        ? []
        : [
            { kind: 'managed-agents-result', status: 'updated' },
            ...(form === 'wrapped-twice'
              ? [{ kind: 'managed-agents-result', status: 'unchanged' }]
              : []),
          ],
    );
    expect(parsed.actorResourceEvidence.commandCount).toBe(0);
    expect(parsed.commandPolicyEvidence.completedCommandCount).toBe(form === 'ambiguous' ? 2 : 1);
    expect(
      parsed.actorExecutionEvidence.filter(({ item }) => item.commandKind === 'other'),
    ).toHaveLength(form === 'ambiguous' ? 2 : 1);
    expect(JSON.stringify(parsed)).not.toContain('callers');
    if (form === 'oversized') {
      expect(parsed.commandPolicyEvidence.maximumCommandOutputByteCount).toBe(262153);
      expect(parsed.commandPolicyEvidence.commandOwnership.helper.outputByteCount).toBe(262153);
      const dimensions = createSemanticResultDimensions({
        actorCommandPolicy: parsed.commandPolicyEvidence,
        actorExecutionEvidence: parsed.actorExecutionEvidence,
        actorResourceEvidence: parsed.actorResourceEvidence,
        gitInvocationEvidence: parsed.gitInvocationEvidence,
        caseDefinition: {
          ...staleIntegrationCase,
          resourceBudget: { ...staleIntegrationCase.resourceBudget, minimumMoldeaCommands: 0 },
        },
        isMountIntegrityPassing: true,
        isRepositoryControlPassing: true,
        isSemanticPassing: true,
        judgeCommandPolicy: parsed.commandPolicyEvidence,
      });
      expect(dimensions.resource).toBe(false);
    }
    if (form === 'continuation') {
      const repeated = parse(await run());
      expect(
        repeated.actorExecutionEvidence.flatMap(({ item }) => item.outputEvidence.facts),
      ).toStrictEqual([{ kind: 'managed-agents-result', status: 'unchanged' }]);
    }
  } finally {
    vi.unstubAllEnvs();
    await rm(root, { recursive: true, force: true });
  }
});

test.each([
  'before-validation',
  'after-validation',
  'later-write',
  'double-validation',
  'later-assessment',
  'ambiguous-command',
  'no-write',
  'read-only-overlay',
] as const)('runtime canonical ordering for %s without Codex patch events', async (scenario) => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-order-'));
  try {
    await mkdir(join(root, 'source-home'));
    vi.stubEnv('CODEX_HOME', join(root, 'source-home'));
    const home = join(root, 'home');
    const tools = join(root, 'tools');
    const { repositoryPath, readOnlyMounts } = await createActorRepository(
      root,
      semanticCase,
      home,
      tools,
    );
    const before = await snapshotSemanticWorkspace(repositoryPath);
    const mounts = [...readOnlyMounts];
    if (scenario === 'read-only-overlay') {
      const view = join(root, 'canonical-view');
      await cp(join(repositoryPath, 'moldea'), view, { recursive: true });
      await writeFile(join(view, 'project.md'), '\nReadonly overlay content.\n', { flag: 'a' });
      mounts.push({ source: view, target: '/mnt/moldea' });
    }
    const args = [
      '/mnt/.agents/skills/moldea/scripts/moldea-cli.mjs',
      '--repository',
      '/mnt',
      '--',
      'validate',
      '--json',
      '--max-output-bytes',
      '65536',
    ];
    const write =
      "fs.appendFileSync('/mnt/moldea/project.md','\\nConfirmed canonical summary update.\\n');\n";
    const invocation = (operation: 'validate' | 'inspect', repeated = false) => {
      const invocationArgs = [...args];
      invocationArgs[4] = operation;
      if (repeated) invocationArgs.unshift('--no-warnings');
      return `{const result=cp.spawnSync('/opt/node',${JSON.stringify(invocationArgs)},{encoding:'utf8'});console.log(JSON.stringify({type:'item.completed',item:{type:'command_execution',command:${JSON.stringify(scenario === 'ambiguous-command' ? 'node -e "wrapped launcher"' : `/opt/node ${invocationArgs.join(' ')}`)},status:'completed',exit_code:result.status,aggregated_output:result.stdout+result.stderr}}));}\n`;
    };
    const script =
      '#!/opt/node\n' +
      "const fs=require('node:fs');const cp=require('node:child_process');\n" +
      (['after-validation', 'no-write', 'read-only-overlay'].includes(scenario) ? '' : write) +
      invocation('validate') +
      (['after-validation', 'later-write'].includes(scenario) ? write : '') +
      (scenario === 'double-validation' ? invocation('validate', true) : '') +
      (scenario === 'later-assessment' ? invocation('inspect') : '') +
      "console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'Completed synthetic ordering scenario.'}}));\n";
    // use the fixture's existing immutable tool mount for the fake host, without a provider
    await writeFile(join(tools, 'codex'), script, { mode: 0o755 });
    await writeFile(join(tools, 'codex-code-mode-host'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
    vi.stubEnv('PATH', `${tools}:${process.env['PATH'] ?? ''}`);
    const output = await runCodexEvaluationHost({
      command: buildCodexEvaluationHostCommand(
        [
          'codex',
          'exec',
          '--ephemeral',
          '--ignore-rules',
          '--ignore-user-config',
          '--skip-git-repo-check',
          '--dangerously-bypass-approvals-and-sandbox',
          '-c',
          'shell_environment_policy.inherit=none',
          '-',
        ],
        'actor',
      ),
      cwd: repositoryPath,
      sandboxHome: home,
      role: 'actor',
      prompt: 'Synthetic chronology test',
      readOnlyMounts: mounts,
      readOnlyWorkspacePaths: ['.agents', '.git'],
    });
    const identity = readReleaseIdentity(process.cwd());
    const parsed = parseSemanticEvaluationHostOutput(output, {
      cliVersion: identity.cliVersion,
      jsonSchemaVersion: identity.cliJsonSchemaVersion,
    });
    const workspaceChanges = diffSemanticWorkspaceSnapshots(
      before,
      await snapshotSemanticWorkspace(repositoryPath),
    );
    const dimensions = createSemanticResultDimensions({
      actorExecutionEvidence: parsed.actorExecutionEvidence,
      actorCommandPolicy: parsed.commandPolicyEvidence,
      actorResourceEvidence: parsed.actorResourceEvidence,
      gitInvocationEvidence: parsed.gitInvocationEvidence,
      // a stricter synthetic byte ceiling isolates exemption behavior; catalog criteria stay unchanged
      caseDefinition: {
        ...semanticCase,
        resourceBudget: { ...semanticCase.resourceBudget, maximumMoldeaOutputBytes: 1 },
      },
      isMountIntegrityPassing: true,
      isRepositoryControlPassing: true,
      isSemanticPassing: true,
      judgeCommandPolicy: parsed.commandPolicyEvidence,
      workspaceChanges,
    });
    expect(dimensions.resource).toBe(scenario === 'before-validation');
    expect(JSON.stringify(parsed)).not.toContain('canonicalBefore');
    expect(JSON.stringify(parsed)).not.toContain('canonicalInitial');
    const events = parsed.commandPolicyEvidence.moldeaEvents;
    if (scenario === 'read-only-overlay')
      expect(events.some((event) => event.kind === 'file-change')).toBe(false);
    if (scenario === 'before-validation') {
      expect(events[0]).toMatchObject({
        kind: 'command',
        ownership: 'cli',
        operations: [
          { kind: 'file-change', moldeaPath: 'touching' },
          { kind: 'cli', operation: 'validate' },
        ],
      });
    }
    if (scenario === 'double-validation')
      expect(
        events
          .flatMap((event) => (event.kind === 'command' ? (event.operations ?? []) : [event]))
          .filter((event) => event.kind === 'file-change'),
      ).toHaveLength(1);
    if (scenario === 'later-write' || scenario === 'after-validation')
      expect(events.at(-1)).toStrictEqual({ kind: 'file-change', moldeaPath: 'touching' });
  } finally {
    vi.unstubAllEnvs();
    await rm(root, { recursive: true, force: true });
  }
});
