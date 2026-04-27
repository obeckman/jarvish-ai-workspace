import { createAgentGraph } from '../agent/graph.js';
import { db, sqlite } from '../db/index.js';
import { sessions, sessionSummaries } from '../db/schema.js';
import { desc, eq, like, or } from 'drizzle-orm';
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import { summarizeSession } from '../services/summarization.service.js';

// Global checkpointer instance
const checkpointer = new SqliteSaver(sqlite);

/**
 * GraphQL Resolvers
 * Maps the GraphQL operations to the underlying LangGraph logic.
 */
export const resolvers = {
  Query: {
    status: () => "Agent Server v2 is healthy",
    getSessions: async (_: any, { limit = 10, offset = 0, search }: { limit?: number, offset?: number, search?: string }) => {
      let results;
      
      if (search) {
        const searchTerm = `%${search}%`;
        // Join with summaries to search in all relevant text fields
        results = await db.select({
          id: sessions.id,
          title: sessions.title,
          createdAt: sessions.createdAt,
          updatedAt: sessions.updatedAt
        })
        .from(sessions)
        .leftJoin(sessionSummaries, eq(sessions.id, sessionSummaries.sessionId))
        .where(
          or(
            like(sessions.title, searchTerm),
            like(sessionSummaries.summaryTitle, searchTerm),
            like(sessionSummaries.userMessage, searchTerm),
            like(sessionSummaries.aiAnswer, searchTerm)
          )
        )
        .limit(limit)
        .offset(offset)
        .orderBy(desc(sessions.updatedAt));
      } else {
        results = await db.select().from(sessions)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(sessions.updatedAt));
      }

      return results.map(s => ({
        ...s,
        createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt),
        updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : String(s.updatedAt)
      }));
    },
    getSessionHistory: async (_: any, { sessionId }: { sessionId: string }) => {
      const graph = createAgentGraph(checkpointer);
      const state = await graph.getState({ configurable: { thread_id: sessionId } });

      if (!state || !state.values.messages) return [];
      return state.values.messages.map((m: any) => {
        // Map LangChain roles to FE roles
        // m._getType() or m.constructor.name can also be used, but LangGraph messages often have 'role' or type info
        const type = m._getType?.() || m.type;
        let role = (type === 'human' || m.role === 'user') ? 'user' : 'agent';
        
        // Reasoning markers: Tool messages, Model messages with tool_calls, or specific reasoning indicators
        if (type === 'tool' || m.role === 'tool' || (m.tool_calls && m.tool_calls.length > 0)) {
          role = 'reasoning';
        }

        // Handle content which can be string or array of parts
        let content = m.content;
        if (Array.isArray(content)) {
          content = content.map(part => part.text || JSON.stringify(part)).join('\n');
        }

        return {
          role,
          content: content || (role === 'reasoning' ? "Executing tool..." : "")
        };
      });
    },
    getSessionSummary: async (_: any, { sessionId }: { sessionId: string }) => {
      const [existing] = await db.select().from(sessionSummaries).where(eq(sessionSummaries.sessionId, sessionId));
      
      if (existing) {
        return {
          ...existing,
          createdAt: existing.createdAt.toISOString()
        };
      }

      // If missing, we return null to FE, which will show "Generating..." message.
      // But wait, the user said "BE will create the missing message using AI".
      // We can trigger it asynchronously or just do it here if it's not too slow.
      // Let's do it here for simplicity of "on-demand" generation, or trigger and return null.
      
      // Let's trigger it and return null for now, or just implement it here.
      // The user said "if missing return missing and UX show some informative message, BE will create... then BE push or/ FE pulling".
      
      // I'll implement a background generation and return null.
      (async () => {
        try {
          const history = await resolvers.Query.getSessionHistory(null, { sessionId });
          if (history.length === 0) return;

          const summary = await summarizeSession(history);
          await db.insert(sessionSummaries).values({
            sessionId,
            summaryTitle: summary.summaryTitle,
            userMessage: summary.userMessage,
            aiAnswer: summary.aiAnswer,
          }).onConflictDoUpdate({
            target: sessionSummaries.sessionId,
            set: {
              summaryTitle: summary.summaryTitle,
              userMessage: summary.userMessage,
              aiAnswer: summary.aiAnswer,
            }
          });
        } catch (e) {
          console.error("Async summary generation failed:", e);
        }
      })();

      return null;
    }
  },

  Session: {
    summary: async (parent: any) => {
      const [summary] = await db.select().from(sessionSummaries).where(eq(sessionSummaries.sessionId, parent.id));
      if (!summary) return null;
      return {
        ...summary,
        createdAt: summary.createdAt.toISOString()
      };
    }
  },

  Mutation: {
    startResearch: async (_: any, { query }: any) => {
      // Mutations can be used for non-streaming background tasks
      return "Research task acknowledged";
    },
    createSession: async (_: any, { id, title }: { id: string, title: string }) => {
      await db.insert(sessions).values({
        id,
        title,
      });
      const [newSession] = await db.select().from(sessions).where(eq(sessions.id, id));
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
      subscribe: async function* (_: any, { query, history = [], attachments = [], sessionId }: any, context: any) {
        const graph = createAgentGraph(checkpointer);
        const googleToken = context.request.headers.get('x-google-token');

        // Initial state for the graph
        const initialState = {
          messages: [
            ...history.map((h: any) => ({ role: h.role, content: h.content })),
            { role: "user", content: query }
          ],
          attachments,
          googleToken,
          sessionId,
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
              if (!nodeName) continue;
              
              const update = chunk[nodeName];

              // 1. Yield Status Update
              yield {
                agentEvents: {
                  type: "STATUS",
                  content: update.metadata?.status || `Entering ${nodeName} phase.`,
                  stage: update.metadata?.stage,
                }
              };

              // 2. Yield Messages
              if (update.messages && Array.isArray(update.messages)) {
                for (const msg of update.messages) {
                  if (msg.content && !msg.tool_calls?.length) {
                    // If the message comes from a node that isn't the final reasoning node, 
                    // it's likely an intermediate result (reasoning).
                    const isFinal = nodeName === 'reasoning';
                    
                    yield {
                      agentEvents: {
                        type: isFinal ? "MESSAGE" : "REASONING",
                        content: msg.content,
                      }
                    };
                  }
                }
              }
            } else if (mode === "messages") {
              // Extract text tokens from the reasoning node (streaming tokens)
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
