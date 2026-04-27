import { createAgentGraph } from '../agent/graph.js';
import { db, sqlite } from '../db/index.js';
import { sessions } from '../db/schema.js';
import { desc, eq } from 'drizzle-orm';
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";

// Global checkpointer instance
const checkpointer = new SqliteSaver(sqlite);

/**
 * GraphQL Resolvers
 * Maps the GraphQL operations to the underlying LangGraph logic.
 */
export const resolvers = {
  Query: {
    status: () => "Agent Server v2 is healthy",
    getSessions: async () => {
      return await db.select().from(sessions).orderBy(desc(sessions.updatedAt));
    },
    getSessionHistory: async (_: any, { sessionId }: { sessionId: string }) => {
      const graph = createAgentGraph(checkpointer);
      const state = await graph.getState({ configurable: { thread_id: sessionId } });
      if (!state || !state.values.messages) return [];
      return state.values.messages.map((m: any) => ({
        role: m.role === 'user' || m.role === 'human' ? 'user' : 'assistant',
        content: m.content
      }));
    }
  },

  Mutation: {
    startResearch: async (_: any, { query }: any) => {
      // Mutations can be used for non-streaming background tasks
      return "Research task acknowledged";
    },
    createSession: async (_: any, { id, title }: { id: string, title: string }) => {
      const [newSession] = await db.insert(sessions).values({
        id,
        title,
      }).returning();
      return newSession;
    },
    deleteSession: async (_: any, { id }: { id: string }) => {
      await db.delete(sessions).where(eq(sessions.id, id));
      // Note: In a full implementation, we'd also delete checkpoints from SqliteSaver's tables
      return true;
    }
  },

  Subscription: {
    agentEvents: {
      /**
       * The 'subscribe' generator function is where the magic happens.
       * We run the LangGraph and yield events as they come in.
       */
      subscribe: async function* (_: any, { query, history = [], attachments = [], sessionId }: any) {
        const graph = createAgentGraph(checkpointer);

        // Initial state for the graph
        const initialState = {
          messages: [
            ...history.map((h: any) => ({ role: h.role, content: h.content })),
            { role: "user", content: query }
          ],
          attachments,
          metadata: { stage: 1, status: "Initializing..." }
        };

        const config = sessionId ? { configurable: { thread_id: sessionId } } : {};

        // LangGraph's streaming modes allow us to catch different types of data.
        // We use 'updates' to see node transitions (for status logs)
        // and 'messages' for the actual streaming tokens.
        const stream = await graph.stream(initialState, {
          ...config,
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
