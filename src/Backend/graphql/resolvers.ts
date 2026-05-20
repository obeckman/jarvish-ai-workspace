import { AgentEvent, Resolvers } from './__generated__/resolvers-types';
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

type GraphQLContext = {
  request: Request;
};

/**
 * GraphQL Resolvers
 * Maps the GraphQL operations to the underlying LangGraph logic.
 */
export const resolvers: Resolvers<GraphQLContext> = {
  Query: {
    status: () => "Backend graphQL is healthy",
    getSessions: async (_parent, args) => getSessions(args),
    getSessionHistory: async (_parent, args) => getSessionHistory(args),
    getSessionSummary: async (_parent, args) => getSessionSummary(args),
    getStructuredFacts: async () => getStructuredFacts()
  },

  Session: {
    summary: async (parent) => getSessionSummaryBySessionId(parent.id)
  },

  Mutation: {
    startResearch: async (_parent, args) => startResearch(args),
    createSession: async (_parent, args) => createSession(args),
    deleteSession: async (_parent, args) => deleteSession(args),
    deleteStructuredFact: async (_parent, args) => deleteStructuredFact(args)
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
        });
      },
      resolve: (payload: { agentEvents: AgentEvent }) => payload.agentEvents
    }
  }
};
