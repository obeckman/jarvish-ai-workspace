import { z } from "zod";
import { EVENT_TYPES, type EventType as DomainEventType } from "@/shared/jarvish.constants";
import type {
  AgentChatSubscription,
  EventType as GraphQLEventType,
} from "@/features/jarvishAgent/graphql/__generated__/graphql";

const GRAPHQL_TO_DOMAIN_EVENT_TYPE = {
  STATUS: EVENT_TYPES.STATUS,
  MESSAGE: EVENT_TYPES.MESSAGE,
  REASONING: EVENT_TYPES.REASONING,
  ERROR: EVENT_TYPES.ERROR,
  RETRY: EVENT_TYPES.RETRY,
} as const satisfies Record<GraphQLEventType, DomainEventType>;

const AgentEventTransportSchema = z.object({
  type: z.string(),
  content: z.string().nullable(),
  stage: z.number().int().nullable(),
}) satisfies z.ZodType<{
  type: string;
  content: AgentChatSubscription["agentEvents"]["content"];
  stage: AgentChatSubscription["agentEvents"]["stage"];
}>;

const AgentChatSubscriptionTransportSchema = z.object({
  agentEvents: AgentEventTransportSchema,
});

export type DomainAgentEvent = {
  type: DomainEventType;
  content: string;
  stage: number | null;
};

export function mapGraphQLEventTypeToDomain(type: string): DomainEventType | null {
  const normalizedType = type.toUpperCase();

  if (normalizedType in GRAPHQL_TO_DOMAIN_EVENT_TYPE) {
    return GRAPHQL_TO_DOMAIN_EVENT_TYPE[normalizedType as GraphQLEventType];
  }

  return null;
}

export function parseAgentEventPayload(payload: unknown): DomainAgentEvent {
  const parsedPayload = AgentChatSubscriptionTransportSchema.parse(payload);
  const domainType = mapGraphQLEventTypeToDomain(parsedPayload.agentEvents.type);

  if (!domainType) {
    throw new Error(`Unsupported agent event type: ${parsedPayload.agentEvents.type}`);
  }

  return {
    type: domainType,
    content: parsedPayload.agentEvents.content ?? "",
    stage: parsedPayload.agentEvents.stage,
  };
}
