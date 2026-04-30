import { createAgentGraph } from '@/server_v2/agent/graph';
import { db, sqlite } from '@/server_v2/db/index';
import { sessions, sessionSummaries, structuredFacts } from '@/server_v2/db/schema';
import { desc, eq, like, or } from 'drizzle-orm';
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import { summarizeSession } from '@/server_v2/services/summarization.service';
import { generateTitle } from '@/server_v2/services/titling.service';
import { extractAndStoreFacts } from '@/server_v2/services/factExtraction.service';
import { EVENT_TYPES, NODE_NAMES, ROLES, STAGES } from '@/server_v2/agent/constants';

// ... (rest of imports)

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
        const rawType = (m._getType?.() || m.type || "").toLowerCase();
        const rawRole = (m.role || m.lc_kwargs?.role || "").toLowerCase();
        const rawName = (m.name || m.lc_kwargs?.name || "").toLowerCase();
        
        // Determine role with fallback to AGENT
        let role: string = ROLES.AGENT;
        
        if (rawType === 'human' || rawRole === 'user' || rawRole === 'human') {
          role = ROLES.USER;
        } else if (
          rawType === 'tool' || 
          rawRole === 'tool' || 
          rawRole === 'reasoning' || 
          (m.tool_calls && m.tool_calls.length > 0) ||
          (rawName && ![NODE_NAMES.REASONING, NODE_NAMES.SUPERVISOR, NODE_NAMES.CLARIFICATION, "clarification_agent", NODE_NAMES.CODER_WORKER, NODE_NAMES.RESEARCH_WORKER, NODE_NAMES.GOOGLE_WORKER].includes(rawName))
        ) {
          role = ROLES.REASONING;
        }

        // Handle content which can be string or array of parts
        let content = m.content;
        if (Array.isArray(content)) {
          content = content.map((part: any) => part.text || JSON.stringify(part)).join('\n');
        } else if (typeof content !== 'string') {
          content = content ? JSON.stringify(content) : "";
        }

        return {
          role,
          content: content || (role === (ROLES.REASONING as string) ? "Processing research step..." : "")
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
    },
    getStructuredFacts: async () => {
      const results = await db.select().from(structuredFacts).orderBy(desc(structuredFacts.createdAt));
      return results.map(f => ({
        ...f,
        createdAt: f.createdAt instanceof Date ? f.createdAt.toISOString() : String(f.createdAt)
      }));
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
    createSession: async (_: any, { id, title, initialQuery }: { id: string, title?: string, initialQuery?: string }) => {
      let finalTitle = title || "New Research";
      
      if (initialQuery) {
        finalTitle = await generateTitle(initialQuery);
      }

      await db.insert(sessions).values({
        id,
        title: finalTitle,
      });
      const [newSession] = await db.select().from(sessions).where(eq(sessions.id, id));
      return newSession;
    },
    deleteSession: async (_: any, { id }: { id: string }) => {
      await db.delete(sessions).where(eq(sessions.id, id));
      // Note: In a full implementation, we'd also delete checkpoints from SqliteSaver's tables
      return true;
    },
    deleteStructuredFact: async (_: any, { id }: { id: string }) => {
      await db.delete(structuredFacts).where(eq(structuredFacts.id, id));
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
            { role: ROLES.USER, content: query }
          ],
          attachments,
          googleToken,
          sessionId,
          metadata: { stage: STAGES.PREPARE, status: "Initializing..." }
        };

        const config = sessionId ? { configurable: { thread_id: sessionId } } : {};

        // LangGraph's streaming modes allow us to catch different types of data.
        // We use 'updates' to see node transitions (for status logs).
        const stream = await graph.stream(initialState, {
          ...config,
          streamMode: ["updates"] as any
        });

        try {
          for await (const [mode, chunk] of (stream as any)) {
            if (mode === "updates") {
              for (const [nodeName, update] of Object.entries(chunk as any)) {
                if (!update) continue;
                const nodeUpdate = update as any;

                // 1. Yield Status Update
                if (nodeUpdate.metadata?.status) {
                  yield {
                    agentEvents: {
                      type: EVENT_TYPES.STATUS,
                      content: nodeUpdate.metadata.status,
                      stage: nodeUpdate.metadata.stage,
                    }
                  };
                }

                // 2. Yield Messages
                if (nodeUpdate.messages && Array.isArray(nodeUpdate.messages)) {
                  for (const msg of nodeUpdate.messages) {
                    if (msg.content && !msg.tool_calls?.length) {
                      // Nodes that produce user-facing final or intermediate answers
                      const isUserFacingNode = [
                        NODE_NAMES.REASONING, 
                        NODE_NAMES.SUPERVISOR, 
                        NODE_NAMES.CLARIFICATION,
                        NODE_NAMES.RESEARCH_WORKER,
                        NODE_NAMES.GOOGLE_WORKER,
                        NODE_NAMES.CODER_WORKER
                      ].includes(nodeName as any);
                      
                      // Ensure content is a string (tool outputs might be objects/arrays)
                      const stringContent = typeof msg.content === 'string' 
                        ? msg.content 
                        : JSON.stringify(msg.content);
                      
                      yield {
                        agentEvents: {
                          type: isUserFacingNode ? EVENT_TYPES.MESSAGE : EVENT_TYPES.REASONING,
                          content: stringContent,
                        }
                      };
                    }
                  }
                }
              }
            }
          }
        } catch (error: any) {
          yield {
            agentEvents: {
              type: EVENT_TYPES.ERROR,
              content: error.message || "Unknown graph execution error",
            }
          };
        }
      }
    }
  }
};
