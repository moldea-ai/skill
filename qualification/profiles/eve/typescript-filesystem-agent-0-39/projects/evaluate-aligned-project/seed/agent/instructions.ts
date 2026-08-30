import { defineInstructions } from 'eve/instructions';

import { loadSupportInstruction } from './loaders.js';

export default defineInstructions({ content: loadSupportInstruction(), role: 'system' });
