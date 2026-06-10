import { EventType as GraphQLEventType } from "@/backend/graphql/__generated__/resolvers-types";
import { EVENT_TYPES, type EventType as DomainEventType } from "@/shared/jarvish.constants.ts";

export const DOMAIN_TO_GRAPHQL_EVENT_TYPE = {
  [EVENT_TYPES.STATUS]: GraphQLEventType.Status,
  [EVENT_TYPES.MESSAGE]: GraphQLEventType.Message,
  [EVENT_TYPES.REASONING]: GraphQLEventType.Reasoning,
  [EVENT_TYPES.ERROR]: GraphQLEventType.Error,
  [EVENT_TYPES.RETRY]: GraphQLEventType.Retry,
} as const satisfies Record<DomainEventType, GraphQLEventType>;

export function mapDomainEventTypeToGraphQL(type: DomainEventType): GraphQLEventType {
  return DOMAIN_TO_GRAPHQL_EVENT_TYPE[type];
}
