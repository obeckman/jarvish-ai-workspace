import { createSchema } from 'graphql-yoga';
import type { GraphQLContext } from '@/backend/graphql/context';
import { resolvers } from '@/backend/graphql/resolvers';

/**
 * GraphQL Schema Definition
 * Defines the contract between the frontend and the research agent.
 */
export const schema = createSchema<GraphQLContext>({
  resolvers,
  typeDefs: /* GraphQL */ `
    type Query {
      status: String!
      """
      Retrieves all persistent research sessions with pagination and optional search.
      """
      getSessions(limit: Int, offset: Int, search: String): [Session!]!
      """
      Retrieves the message history for a specific session.
      """
      getSessionHistory(sessionId: String!): [Message!]!
      """
      Retrieves or generates a summary for a specific session.
      """
      getSessionSummary(sessionId: String!): SessionSummary
      """
      Retrieves extracted static facts about the user.
      """
      getStructuredFacts: [StructuredFact!]!
    }

    type Mutation {
      """
      Starts a new research task.
      """
      startResearch(query: String!, history: [MessageInput!]!): String!
      """
      Creates a new session record.
      """
      createSession(title: String!, initialQuery: String): Session!
      """
      Deletes a session and its associated state.
      """
      deleteSession(id: String!): Boolean!
      """
      Deletes an extracted static fact by ID.
      """
      deleteStructuredFact(id: String!): Boolean!
    }

    type Subscription {
      """
      Streams events from the Jarvish Agent (logs, tokens, stage updates).
      """
      agentEvents(query: String!, history: [MessageInput!], attachments: [AttachmentInput!], sessionId: String): AgentEvent!
    }

    type StructuredFact {
      id: String!
      sessionId: String
      fact: String!
      category: String!
      confidence: Int!
      createdAt: String!
    }

    type Session {
      id: String!
      title: String!
      createdAt: String!
      updatedAt: String!
      summary: SessionSummary
    }

    type SessionSummary {
      sessionId: String!
      summaryTitle: String!
      userMessage: String!
      aiAnswer: String!
      createdAt: String!
    }

    type Message {
      type: String!
      role: String!
      content: String!
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
      REASONING
      ERROR
      RETRY
    }

    scalar JSON
  `
});
