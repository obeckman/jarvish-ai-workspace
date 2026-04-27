import { createSchema } from 'graphql-yoga';
import { resolvers } from './resolvers.js';

/**
 * GraphQL Schema Definition
 * Defines the contract between the frontend and the research agent.
 */
export const schema = createSchema({
  resolvers,
  typeDefs: /* GraphQL */ `
    type Query {
      status: String!
    }

    type Mutation {
      """
      Starts a new research task.
      """
      startResearch(query: String!, history: [MessageInput!]!): String!
    }

    type Subscription {
      """
      Streams events from the Jarvish Agent (logs, tokens, stage updates).
      """
      agentEvents(query: String!, history: [MessageInput!], attachments: [AttachmentInput!]): AgentEvent!
    }

    input MessageInput {
      role: String!
      content: String!
    }

    input AttachmentInput {
      name: String!
      data: String!
      mimeType: String!
    }

    type AgentEvent {
      type: EventType!
      content: String
      stage: Int
      metadata: JSON
    }

    enum EventType {
      STATUS
      MESSAGE
      ERROR
      RETRY
    }

    scalar JSON
  `
});
