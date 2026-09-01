import { defineInstructions } from 'eve/instructions';

import { loadOrderTriageInstruction } from './loaders.js';

export default defineInstructions({ content: loadOrderTriageInstruction(), role: 'system' });
