import { logger } from '@/Backend/utils/logger';
import { createAgentGraph } from '@/Backend/agent/graph';
import { db, sqlite } from '@/Backend/db/index';
import { sessions, sessionSummaries, structuredFacts } from '@/Backend/db/schema';
import { desc, eq, like, or } from 'drizzle-orm';
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import { summarizeSession } from '@/Backend/services/summarization.service';
import { generateTitle } from '@/Backend/services/titling.service';
import { NODE_NAMES, ROLES, STAGES,EVENT_TYPES } from '@/shared/jarvish.constants.ts';
import { Resolvers, Message, Session, StructuredFact } from './__generated__/resolvers-types';
import { HumanMessage, AIMessage, ToolMessage, BaseMessage } from "@langchain/core/messages";
import { getMessageRole, getMessageType } from '@/Backend/agent/nodes/utils';

// Global checkpointer instance
const checkpointer = new SqliteSaver(sqlite);

/**
 * Maps raw message objects to LangChain message instances.
 */
function mapInputToLangChainMessages(history: { role: string, content: string }[] = []): BaseMessage[] {
  return history.map(h => {
    const role = (h.role || "").toLowerCase();
    if (role === ROLES.USER) {
      return new HumanMessage({ content: h.content });
    }
    
    if (role === ROLES.AGENT || role === ROLES.ASSISTANT || role === ROLES.MODEL) {
      return new AIMessage({ content: h.content });
    }
    if (role === ROLES.TOOL || role === ROLES.FUNCTION) {
      return new ToolMessage({ content: h.content, tool_call_id: "imported" });
    }
    return new HumanMessage({ content: h.content }); // Fallback
  });
}

/**
 * GraphQL Resolvers
 * Maps the GraphQL operations to the underlying LangGraph logic.
 */
export const resolvers: Resolvers = {
  Query: {
    status: () => "Backend graphQL is healthy",
    getSessions: async (_: any, { limit = 10, offset = 0, search }: { limit?: number | null, offset?: number | null, search?: string | null }) => {
      let results;
      
      const safeLimit = limit ?? 10;
      const safeOffset = offset ?? 0;

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
        .limit(safeLimit)
        .offset(safeOffset)
        .orderBy(desc(sessions.updatedAt));
      } else {
        results = await db.select().from(sessions)
          .limit(safeLimit)
          .offset(safeOffset)
          .orderBy(desc(sessions.updatedAt));
      }

      return results.map(s => ({
        ...s,
        createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt),
        updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : String(s.updatedAt)
      })) as Session[];
    },
    
    getSessionHistory: async (_: any, { sessionId }: { sessionId: string }) => {
      const graph = createAgentGraph(checkpointer);
      const state = await graph.getState({ configurable: { thread_id: sessionId } });

      if (!state || !state.values.messages) return [];
      
      return state.values.messages.map((m: any): Message => {
        // Map LangChain roles to FE roles
        const rawType = getMessageType(m);
        const rawRole = getMessageRole(m);
        const rawName = (m.name || m.lc_kwargs?.name || "").toLowerCase();
        
        // Determine role with fallback to AGENT
        let role: string = ROLES.AGENT;
        logger.debug({ sessionId, rawType, rawRole, rawName }, "Mapping message in getSessionHistory");
        if (rawType === ROLES.HUMAN || rawRole === ROLES.USER) {
          role = ROLES.USER;
        } else if (
          rawType === ROLES.TOOL || 
          rawRole === ROLES.REASONING || 
          rawType === ROLES.FUNCTION ||
          (m.tool_calls && m.tool_calls.length > 0) ||
          (rawName && !
            [
              NODE_NAMES.REASONING, 
              NODE_NAMES.SUPERVISOR, 
              NODE_NAMES.CLARIFICATION, 
              //fix me oren
              "clarification_agent", 
              NODE_NAMES.CODER_WORKER, 
              NODE_NAMES.RESEARCH_WORKER, 
              NODE_NAMES.GOOGLE_WORKER
            ].includes(rawName))
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
        const isUserFacingNode = [
                        NODE_NAMES.SUPERVISOR, 
                        NODE_NAMES.CLARIFICATION,
                      ].includes(rawName as any);
       
        return {
          type: isUserFacingNode ? EVENT_TYPES.MESSAGE : EVENT_TYPES.REASONING,
          role,
          content: content || (role === ROLES.REASONING ? "Processing research step..." : "")
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

      // Implement background generation as requested
      (async () => {
        try {
          const historyResolver = resolvers.Query!.getSessionHistory;
          const history = typeof historyResolver === 'function' 
            ? await historyResolver({}, { sessionId }, {} as any, {} as any)
            : await (historyResolver as any).resolve({}, { sessionId }, {} as any, {} as any);

          if (!history || (history as any).length === 0) return;

          const summary = await summarizeSession(history as any);
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
          logger.error({ sessionId, error: e }, "Async summary generation failed");
        }
      })();

      return null;
    },

    getStructuredFacts: async () => {
      const results = await db.select().from(structuredFacts).orderBy(desc(structuredFacts.createdAt));
      return results.map(f => ({
        ...f,
        sessionId: f.sessionId || null,
        createdAt: f.createdAt instanceof Date ? f.createdAt.toISOString() : String(f.createdAt)
      })) as StructuredFact[];
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
    createSession: async (_: any, { id, title, initialQuery }: { id: string, title?: string | null, initialQuery?: string | null }) => {
      let finalTitle = title || "New Research";
      
      if (initialQuery) {
        finalTitle = await generateTitle(initialQuery);
      }

      await db.insert(sessions).values({
        id,
        title: finalTitle,
      });
      const [newSession] = await db.select().from(sessions).where(eq(sessions.id, id));
      return {
        ...newSession,
        createdAt: newSession.createdAt.toISOString(),
        updatedAt: newSession.updatedAt.toISOString()
      } as unknown as Session;
    },
    deleteSession: async (_: any, { id }: { id: string }) => {
      await db.delete(sessions).where(eq(sessions.id, id));
      return true;
    },
    deleteStructuredFact: async (_: any, { id }: { id: string }) => {
      await db.delete(structuredFacts).where(eq(structuredFacts.id, id));
      return true;
    }
  },

  Subscription: {
    agentEvents: {
      subscribe: async function* (_: any, { query, history = [], attachments = [], sessionId }: any, context: any) {
        const graph = createAgentGraph(checkpointer);
        const googleToken = context.request.headers.get('x-google-token');

        // Initial state for the graph
        const initialState = {
          messages: [
            ...mapInputToLangChainMessages(history),
            new HumanMessage({ content: query })
          ],
          attachments,
          googleToken,
          sessionId,
          metadata: { stage: STAGES.PREPARE, status: "Initializing..." }
        };

        const config = sessionId ? { configurable: { thread_id: sessionId } } : {};

        if (sessionId) {
          try {
            await db.update(sessions)
              .set({ updatedAt: new Date() })
              .where(eq(sessions.id, sessionId));
          } catch (e) {
            logger.error({ sessionId, error: e }, "Failed to update session updatedAt");
          }
        }

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
                      type:  EVENT_TYPES.STATUS,
                      content: nodeUpdate.metadata.status,
                      stage: nodeUpdate.metadata.stage,
                    }
                  };
                }

                // 2. Yield Messages
                if (nodeUpdate.messages && Array.isArray(nodeUpdate.messages)) {
                  for (const msg of nodeUpdate.messages) {
                    if (msg.content && !msg.tool_calls?.length) {
                      const isUserFacingNode = [
                        NODE_NAMES.REASONING, 
                        NODE_NAMES.SUPERVISOR, 
                        NODE_NAMES.CLARIFICATION,
                        NODE_NAMES.RESEARCH_WORKER,
                        NODE_NAMES.GOOGLE_WORKER,
                        NODE_NAMES.CODER_WORKER
                      ].includes(nodeName as any);
                      
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
      },
      resolve: (payload: any) => payload.agentEvents
    }
  }
};

