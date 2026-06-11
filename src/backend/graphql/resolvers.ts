import { AgentEvent, Resolvers } from './__generated__/resolvers-types';
import {
  getSessionHistory,
  getSessions,
} from '@/backend/graphql/services/session.resolver.service';
import {
  getSessionSummary,
  getSessionSummaryBySessionId,
} from '@/backend/graphql/services/summary.resolver.service';
import {
  deleteStructuredFact,
  getStructuredFacts,
} from '@/backend/graphql/services/fact.resolver.service';
import {
  createSession,
  deleteSession,
  startResearch,
} from '@/backend/graphql/services/mutation.resolver.service';
import { streamAgentEvents } from '@/backend/graphql/services/agent-event.service';
import type { GraphQLContext } from '@/backend/graphql/context';

/**
 * GraphQL Resolvers
 * Maps the GraphQL operations to the underlying LangGraph logic.
 */
export const resolvers: Resolvers<GraphQLContext> = {
  Query: {
    status: () => "Backend graphQL is healthy",
    getSessions: async (_parent, args, context) => getSessions(args, context.auth.userId),
    getSessionHistory: async (_parent, args, context) => getSessionHistory(args, context.auth.userId),
    getSessionSummary: async (_parent, args, context) => getSessionSummary(args, context.auth.userId),
    getStructuredFacts: async (_parent, _args, context) => getStructuredFacts(context.auth.userId)
  },

  Session: {
    summary: async (parent, _args, context) => getSessionSummaryBySessionId(parent.id, context.auth.userId)
  },

  Mutation: {
    startResearch: async (_parent, args) => startResearch(args),
    createSession: async (_parent, args, context) => createSession(args, context.auth.userId),
    deleteSession: async (_parent, args, context) => deleteSession(args, context.auth.userId),
    deleteStructuredFact: async (_parent, args, context) => deleteStructuredFact(args, context.auth.userId)
  },

  Subscription: {
    agentEvents: {
      subscribe: async function* (_parent, { query, history = [], attachments = [], sessionId }, context) {
        const googleToken = context.request.headers.get('x-google-token');
        yield* streamAgentEvents({
          query,
          history,
          attachments,
          sessionId,
          googleToken,
          userId: context.auth.userId,
        });
      },
      resolve: (payload: { agentEvents: AgentEvent }) => payload.agentEvents
    }
  }
};
