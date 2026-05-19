import { createAgentGraph } from "@/Backend/agent/graph";
import { SubscriptionAgentEventsArgs } from "@/Backend/graphql/__generated__/resolvers-types";
import {
  mapInputToLangChainMessages,
  shouldStreamMessageFromNode,
  stringifyMessageContent,
} from "@/Backend/graphql/mappers/message.mapper";
import {
  StreamAgentEventsInputSchema,
} from "@/Backend/graphql/schemas/resolver.schema";
import {
  getCheckpointer,
  touchSession,
} from "@/Backend/graphql/services/session.resolver.service";
import { logger } from "@/Backend/utils/logger";
import { EVENT_TYPES, STAGES } from "@/shared/jarvish.constants.ts";
import { HumanMessage } from "@langchain/core/messages";

type AgentEventPayload = {
  agentEvents: {
    type: string;
    content?: string;
    stage?: number;
  };
};

type StreamAgentEventsInput = SubscriptionAgentEventsArgs & {
  googleToken?: string | null;
};

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
    streamMode: ["updates"] as any,
  });

  try {
    for await (const [mode, chunk] of stream as any) {
      if (mode !== "updates") {
        continue;
      }

      for (const [nodeName, update] of Object.entries(chunk as any)) {
        if (!update) {
          continue;
        }

        yield* mapNodeUpdateToEvents(nodeName, update);
      }
    }
  } catch (error: any) {
    yield {
      agentEvents: {
        type: EVENT_TYPES.ERROR,
        content: error.message || "Unknown graph execution error",
      },
    };
  }
}

function* mapNodeUpdateToEvents(nodeName: string, update: any): Generator<AgentEventPayload> {
  if (update.metadata?.status) {
    yield {
      agentEvents: {
        type: EVENT_TYPES.STATUS,
        content: update.metadata.status,
        stage: update.metadata.stage,
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
        type: shouldStreamMessageFromNode(nodeName) ? EVENT_TYPES.MESSAGE : EVENT_TYPES.REASONING,
        content: stringifyMessageContent(message.content),
      },
    };
  }
}
