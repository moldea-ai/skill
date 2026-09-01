import { defineDynamic, defineTool } from 'eve/tools';
import { z } from 'zod';

export default defineDynamic({
  events: {
    'session.started': () =>
      defineTool({
        description: 'Reads runtime-selected support data.',
        inputSchema: z.object({ query: z.string() }),
        execute: ({ query }) => Promise.resolve({ matches: [], query }),
      }),
  },
});
