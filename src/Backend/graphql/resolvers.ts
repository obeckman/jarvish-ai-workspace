import { EVENT_TYPES } from '@/shared/jarvish.constants.ts';
import { Resolvers } from './__generated__/resolvers-types';
import {
  getSessionHistory,
  getSessions,
} from '@/Backend/graphql/services/session.resolver.service';
import {
  getSessionSummary,
  getSessionSummaryBySessionId,
} from '@/Backend/graphql/services/summary.resolver.service';
import {
  deleteStructuredFact,
  getStructuredFacts,
} from '@/Backend/graphql/services/fact.resolver.service';
import {
  createSession,
  deleteSession,
  startResearch,
} from '@/Backend/graphql/services/mutation.resolver.service';
import { streamAgentEvents } from '@/Backend/graphql/services/agent-event.service';

/**
 * GraphQL Resolvers
 * Maps the GraphQL operations to the underlying LangGraph logic.
 */
export const resolvers: Resolvers = {
  EventType: Object.fromEntries(
    Object.entries(EVENT_TYPES)
  ),
  Query: {
    status: () => "Backend graphQL is healthy",
    getSessions: async (_: any, args) => getSessions(args),
    getSessionHistory: async (_: any, args) => getSessionHistory(args),
    getSessionSummary: async (_: any, args) => getSessionSummary(args),
    getStructuredFacts: async () => getStructuredFacts()
  },

  Session: {
    summary: async (parent: any) => getSessionSummaryBySessionId(parent.id)
  },

  Mutation: {
    startResearch: async (_: any, args) => startResearch(args),
    createSession: async (_: any, args) => createSession(args),
    deleteSession: async (_: any, args) => deleteSession(args),
    deleteStructuredFact: async (_: any, args) => deleteStructuredFact(args)
  },

  Subscription: {
    agentEvents: {
      subscribe: async function* (_: any, { query, history = [], attachments = [], sessionId }: any, context: any) {
        const googleToken = context.request.headers.get('x-google-token');
        yield* streamAgentEvents({
          query,
          history,
          attachments,
          sessionId,
          googleToken,
        });
      },
      resolve: (payload: any) => payload.agentEvents
    }
  }
};
