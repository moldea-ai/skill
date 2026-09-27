import { defineAgent } from 'eve';

export default defineAgent({
  description: 'Answers support questions from the adopted instruction.',
  model: 'provider/model',
});
