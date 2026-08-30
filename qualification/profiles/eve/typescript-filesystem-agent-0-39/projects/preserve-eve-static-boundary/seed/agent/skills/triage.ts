import { defineSkill } from 'eve/skills';

export default defineSkill({
  description: 'Applies the support triage boundary.',
  markdown: '# Triage\n\nEscalate decisions that require authority.\n',
  metadata: { owner: 'support' },
});
