import { defineSkill } from 'eve/skills';

export default defineSkill({
  description: 'Applies the human-review boundary to order classification.',
  markdown:
    '# Review policy\n\nClassify uncertain orders for human review. Never approve refunds.\n',
  metadata: { owner: 'operations' },
});
