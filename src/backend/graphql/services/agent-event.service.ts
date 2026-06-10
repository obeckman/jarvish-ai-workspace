import { createAgentGraph } from "@/backend/agent/graph";
import {
  AgentEvent,
  SubscriptionAgentEventsArgs,
} from "@/backend/graphql/__generated__/resolvers-types";
import { mapDomainEventTypeToGraphQL } from "@/backend/graphql/mappers/event.mapper";
import {
  mapInputToLangChainMessages,
  shouldStreamMessageFromNode,
  stringifyMessageContent,
} from "@/backend/graphql/mappers/message.mapper";
import {
  StreamAgentEventsInputSchema,
} from "@/backend/graphql/schemas/resolver.schema";
import {
  getCheckpointer,
  touchSession,
} from "@/backend/graphql/services/session.resolver.service";
import { logger } from "@/backend/utils/logger";
import { DEFAULT_USER_ID, EVENT_TYPES, STAGES } from "@/shared/jarvish.constants.ts";
import { HumanMessage, type MessageContent, type ToolCall } from "@langchain/core/messages";

type AgentEventPayload = {
  agentEvents: Pick<AgentEvent, "type" | "content" | "stage" | "metadata">;
};

type StreamAgentEventsInput = SubscriptionAgentEventsArgs & {
  googleToken?: string | null;
};

type GraphStreamMode = "updates";

type GraphStreamUpdate = {
  metadata?: {
    status?: string;
    stage?: number;
    confidence?: number;
    validationReason?: string;
  };
  messages?: Array<{
    content?: MessageContent;
    tool_calls?: ToolCall[];
  }>;
};

type GraphStreamChunk = Record<string, GraphStreamUpdate | null | undefined>;
type GraphUpdateStream = AsyncIterable<[GraphStreamMode, GraphStreamChunk]>;

export async function* streamAgentEvents({
  query,
  history = [],
  attachments = [],
  sessionId,
  googleToken,
}: StreamAgentEventsInput): AsyncGenerator<AgentEventPayload> {
  const parsed = StreamAgentEventsInputSchema.parse({
    query,
    history,
    attachments,
    sessionId,
    googleToken,
  });
  const graph = createAgentGraph(getCheckpointer());

  const initialState = {
    messages: [
      ...mapInputToLangChainMessages(parsed.history),
      new HumanMessage({ content: parsed.query }),
    ],
    attachments: parsed.attachments,
    googleToken: parsed.googleToken,
    sessionId: parsed.sessionId,
    userId: DEFAULT_USER_ID,
    metadata: { stage: STAGES.PREPARE, status: "Initializing..." },
  };

  const config = parsed.sessionId ? { configurable: { thread_id: parsed.sessionId } } : {};

  if (parsed.sessionId) {
    try {
      await touchSession(parsed.sessionId);
    } catch (error) {
      logger.error({ sessionId: parsed.sessionId, error }, "Failed to update session updatedAt");
    }
  }

  const stream = await graph.stream(initialState, {
    ...config,
    streamMode: ["updates"],
  });

  try {
    for await (const [mode, chunk] of stream as GraphUpdateStream) {
      if (mode !== "updates") {
        continue;
      }

      for (const [nodeName, update] of Object.entries(chunk)) {
        if (!update) {
          continue;
        }

        yield* mapNodeUpdateToEvents(nodeName, update);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown graph execution error";
    yield {
      agentEvents: {
        type: mapDomainEventTypeToGraphQL(EVENT_TYPES.ERROR),
        content: message,
        stage: null,
        metadata: { confidence: 0, validationReason: message },
      },
    };
  }
}

function* mapNodeUpdateToEvents(nodeName: string, update: GraphStreamUpdate): Generator<AgentEventPayload> {
  if (update.metadata?.status) {
    yield {
      agentEvents: {
        type: mapDomainEventTypeToGraphQL(EVENT_TYPES.STATUS),
        content: update.metadata.status,
        stage: update.metadata.stage ?? null,
        metadata: {
          confidence: update.metadata.confidence ?? null,
          validationReason: update.metadata.validationReason ?? null,
        },
      },
    };
  }

  if (!update.messages || !Array.isArray(update.messages)) {
    return;
  }

  for (const message of update.messages) {
    if (!message.content || message.tool_calls?.length) {
      continue;
    }

    yield {
      agentEvents: {
        type: mapDomainEventTypeToGraphQL(
          shouldStreamMessageFromNode(nodeName) ? EVENT_TYPES.MESSAGE : EVENT_TYPES.REASONING,
        ),
        content: stringifyMessageContent(message.content),
        stage: null,
        metadata: null,
      },
    };
  }
}
