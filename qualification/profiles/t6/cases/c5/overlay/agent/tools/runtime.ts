import { defineDynamic, defineTool } from 'eve/tools';
import { z } from 'zod';

export default defineDynamic({
  events: {
    'session.started': () =>
      defineTool({
        description: 'Looks up runtime-selected support data.',
        inputSchema: z.object({ query: z.string() }),
        execute: ({ query }) => Promise.resolve({ query, matches: [] }),
      }),
  },
});
