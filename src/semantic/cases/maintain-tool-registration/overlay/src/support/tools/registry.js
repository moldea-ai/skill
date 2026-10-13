import { lookupOrder } from './lookup-order.js';

const TOOL_DEFINITIONS = { lookupOrder };
export const registeredTools = Object.entries(TOOL_DEFINITIONS)
  .filter(([name]) => name !== 'lookupOrder')
  .map(([name, execute]) => ({ name, execute }));
