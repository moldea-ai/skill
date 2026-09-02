import { END, START, StateGraph } from '@langchain/langgraph';

import { GraphInputSchema, GraphOutputSchema, GraphStateSchema } from './contracts.js';

const respond = async (state: { message: string }) => state;
// direct LangGraph negative control remains outside the LangChain createAgent target
export const workflowSupportAgent = new StateGraph({
  state: GraphStateSchema,
  input: GraphInputSchema,
  output: GraphOutputSchema,
})
  .addNode('respond', respond)
  .addEdge(START, 'respond')
  .addEdge('respond', END)
  .compile({ name: 'workflow_support' });
