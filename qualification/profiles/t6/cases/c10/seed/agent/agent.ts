import { defineAgent } from 'eve';

export default defineAgent({
  description: 'Answers support questions from available evidence.',
  model: 'provider/model',
});
