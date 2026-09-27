import { defineAgent } from 'eve';

export default defineAgent({
  description: 'Answers support questions and finds orders when needed.',
  model: 'provider/model',
});
