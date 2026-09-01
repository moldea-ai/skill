import { defineSkill } from 'eve/skills';

export default defineSkill({
  description: 'Analyzes source material without adding unsupported facts.',
  markdown: '# Analyze\n\nUse only facts present in the supplied source material.\n',
  metadata: { owner: 'support' },
  files: { 'reference.md': '# Reference\n\nPrefer primary project evidence.\n' },
});
