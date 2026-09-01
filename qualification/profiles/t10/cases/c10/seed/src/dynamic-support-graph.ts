import { END, START, StateGraph } from '@langchain/langgraph';
import { z } from 'zod';

const getDynamicSupportStateSchema = () =>
  z.object({
    request: z.string(),
    destination: z.string(),
    response: z.string().optional(),
  });

type IDynamicSupportState = z.infer<ReturnType<typeof getDynamicSupportStateSchema>>;

const routeRequest = (state: IDynamicSupportState): Partial<IDynamicSupportState> => ({
  response: state.request,
});

const selectDestination = (state: IDynamicSupportState): string => state.destination;

const builder = new StateGraph(getDynamicSupportStateSchema()).addNode(
  'route-request',
  routeRequest,
);

builder.addEdge(START, 'route-request');
builder.addConditionalEdges('route-request', selectDestination, {
  finish: END,
});

export const dynamicSupportGraph = builder.compile({ name: 'dynamic_support_graph' });
