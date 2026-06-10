import { describe, expect, it } from 'vitest';

import {
  DOMAIN_TO_GRAPHQL_EVENT_TYPE,
  mapDomainEventTypeToGraphQL,
} from '@/backend/graphql/mappers/event.mapper';
import { EventType as GraphQLEventType } from '@/backend/graphql/__generated__/resolvers-types';
import { EVENT_TYPES } from '@/shared/jarvish.constants';

describe('Jarvish backend event mapper', () => {
  it('maps every shared event type into the GraphQL enum boundary', () => {
    expect(DOMAIN_TO_GRAPHQL_EVENT_TYPE).toEqual({
      [EVENT_TYPES.STATUS]: GraphQLEventType.Status,
      [EVENT_TYPES.MESSAGE]: GraphQLEventType.Message,
      [EVENT_TYPES.REASONING]: GraphQLEventType.Reasoning,
      [EVENT_TYPES.ERROR]: GraphQLEventType.Error,
      [EVENT_TYPES.RETRY]: GraphQLEventType.Retry,
    });

    expect(mapDomainEventTypeToGraphQL(EVENT_TYPES.ERROR)).toBe(GraphQLEventType.Error);
  });
});
