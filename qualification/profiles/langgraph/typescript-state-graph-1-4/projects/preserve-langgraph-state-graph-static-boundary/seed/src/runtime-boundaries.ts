import { Command, Send } from '@langchain/langgraph';

export const createRuntimeCommand = (destination: string): Command =>
  new Command({ goto: destination });

export const createRuntimeSend = (
  destination: string,
  request: string,
): Send<string, { request: string }> => new Send(destination, { request });

export const RUNTIME_COMPOSITION = {
  cache: 'deployment-owned',
  checkpointer: 'deployment-owned',
  context: 'request-owned',
  reducers: 'graph-owned',
  store: 'deployment-owned',
  subgraphs: 'deployment-owned',
  supervisor: 'external',
} as const;
