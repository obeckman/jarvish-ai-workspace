import { createAgentGraph } from '../agent/graph.js';

/**
 * GraphQL Resolvers
 * Maps the GraphQL operations to the underlying LangGraph logic.
 */
export const resolvers = {
  Query: {
    status: () => "Agent Server v2 is healthy",
  },
  
  Mutation: {
    startResearch: async (_: any, { query }: any) => {
      // Mutations can be used for non-streaming background tasks
      return "Research task acknowledged";
    },
  },

  Subscription: {
    agentEvents: {
      /**
       * The 'subscribe' generator function is where the magic happens.
       * We run the LangGraph and yield events as they come in.
       */
      subscribe: async function* (_: any, { query, history, attachments = [] }: any) {
        const graph = createAgentGraph();
        
        // Initial state for the graph
        const initialState = {
          messages: [
            ...history.map((h: any) => ({ role: h.role, content: h.content })),
            { role: "user", content: query }
          ],
          attachments,
          metadata: { stage: 1, status: "Initializing..." }
        };

        // LangGraph's streaming modes allow us to catch different types of data.
        // We use 'updates' to see node transitions (for status logs)
        // and 'messages' for the actual streaming tokens.
        const stream = await graph.stream(initialState, {
          streamMode: ["updates", "messages"]
        });

        try {
          for await (const [mode, chunk] of stream) {
            if (mode === "updates") {
              // Extract status from node metadata
              const nodeName = Object.keys(chunk)[0];
              const update = chunk[nodeName];

              // 1. Yield Status Update
              yield {
                agentEvents: {
                  type: "STATUS",
                  content: update.metadata?.status || `Entering ${nodeName} phase.`,
                  stage: update.metadata?.stage,
                }
              };

              // 2. Yield Messages if any were added in this update
              if (update.messages && Array.isArray(update.messages)) {
                for (const msg of update.messages) {
                  if (msg.content && !msg.tool_calls?.length) {
                    yield {
                      agentEvents: {
                        type: "MESSAGE",
                        content: msg.content,
                      }
                    };
                  }
                }
              }
            } else if (mode === "messages") {
              // Extract text tokens
              const [message, metadata] = chunk;
              if (message.content) {
                yield {
                  agentEvents: {
                    type: "MESSAGE",
                    content: message.content,
                  }
                };
              }
            }
          }
        } catch (error: any) {
          yield {
            agentEvents: {
              type: "ERROR",
              content: error.message || "Unknown graph execution error",
            }
          };
        }
      }
    }
  }
};
