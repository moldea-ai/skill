import { Command } from '@langchain/langgraph';

export const createRoutingCommand = (destination: string): Command =>
  new Command({ goto: destination });
