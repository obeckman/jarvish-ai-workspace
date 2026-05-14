import { AgentStateType } from "@/Backend/agent/state";
import { addMemory } from "@/Backend/services/memory/memory.service";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ARCHIVE_MODEL } from "@/Backend/agent/models";
import { PDFParse } from 'pdf-parse';
import { summarizeSession } from "@/Backend/services/summarization.service";
import { extractAndStoreFacts } from "@/Backend/services/factExtraction.service";
import { db } from "@/Backend/db/index";
import { sessionSummaries } from "@/Backend/db/schema";
import { STAGES, ROLES } from "@/shared/jarvish.constants";
import { getMessageRole } from "./utils";
import { logger } from "@/Backend/utils/logger";

/**
 * Node: Memory Archiving
 * Responsibilities:
 * 1. Summarize the current interaction.
 * 2. Index all attachments (PDFs, Images, Text) into long-term memory.
 * 3. Persist everything to Weaviate for long-term recall.
 * 4. Generate and store a high-level session summary for history UI.
 * 5. Extract static facts for the structured user profile.
 */
export async function archiveNode(state: AgentStateType) {
  logger.debug({ sessionId: state.sessionId, messagesCount: state.messages.length }, "Node: Archive");
  let summary: { summaryTitle: string; userMessage: string; aiAnswer: string } | null = null;
  let extractedFacts: any[] = [];
  let indexedAttachments: string[] = [];

  // 1. Generate Session Summary for UI History (New Requirement)
  if (state.sessionId) {
    logger.info({ sessionId: state.sessionId }, "Generating session summary");
    try {
      const history = state.messages.map(m => {
        const role = getMessageRole(m);
        const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        return {
          role: (role === ROLES.USER || role === ROLES.HUMAN) ? ROLES.USER : ROLES.ASSISTANT,
          content: content
        };
      });

      summary = await summarizeSession(history);
      if (summary) {

        await db.insert(sessionSummaries).values({
          sessionId: state.sessionId,
          summaryTitle: summary.summaryTitle,
          userMessage: summary.userMessage,
          aiAnswer: summary.aiAnswer,
        }).onConflictDoUpdate({
          target: sessionSummaries.sessionId,
          set: {
            summaryTitle: summary.summaryTitle,
            userMessage: summary.userMessage,
            aiAnswer: summary.aiAnswer,
          }
        });
        logger.info({ sessionId: state.sessionId, summaryTitle: summary.summaryTitle }, "Session summary stored");
      }
      // 5. Extract Static Facts
      extractedFacts = await extractAndStoreFacts(state.sessionId, history);
      logger.debug({ sessionId: state.sessionId, extractedFactsCount: extractedFacts.length }, "Extracted facts");

    } catch (err) {
      logger.error({ sessionId: state.sessionId, error: err }, "Archive Node Error: Session Summary");
    }
  }

  // 2. Archive Conversation Summary to Vector Store
  const lastUserMessage = state.messages.findLast(m => {
    const r = getMessageRole(m);
    return r === ROLES.USER || r === ROLES.HUMAN;
  });

  const lastModelMessage = state.messages.findLast(m => {
    const r = getMessageRole(m);
    return r === ROLES.ASSISTANT || r === ROLES.AGENT || r === ROLES.MODEL;
  });

  if (lastUserMessage && lastModelMessage) {
    logger.info({ sessionId: state.sessionId }, "Saving interaction to memory");

    const userContent = typeof lastUserMessage.content === 'string' ? lastUserMessage.content : JSON.stringify(lastUserMessage.content);
    const modelContent = typeof lastModelMessage.content === 'string' ? lastModelMessage.content : JSON.stringify(lastModelMessage.content);

    const conversationSummary = `Conversation Summary [${new Date().toLocaleTimeString()}]:
    User: ${userContent}
    Assistant: ${modelContent}`;

    await addMemory(conversationSummary, {
      type: 'history',
      sessionId: state.sessionId,
      timestamp: new Date().toISOString()
    }).catch(err => logger.error({ sessionId: state.sessionId, error: err }, "Archive Node Error: Summary Archival"));
  } else {
    const roles = state.messages.map(m => getMessageRole(m));
    logger.debug({ sessionId: state.sessionId, roles }, "Interaction skipped (missing User or Model message)");
  }


  // 2. Index Attachments
  if (state.attachments && state.attachments.length > 0) {
    logger.info({ sessionId: state.sessionId, attachmentsCount: state.attachments.length }, "Indexing attachments");

    for (const att of state.attachments) {
      try {
        let contentToIndex = "";

        if (att.mimeType === 'application/pdf') {
          const buffer = Buffer.from(att.data, 'base64');
          const parser = new PDFParse({ data: new Uint8Array(buffer) });
          const result = await parser.getText();
          contentToIndex = result.text;
          await parser.destroy();
        } else if (att.mimeType.startsWith('text/')) {
          contentToIndex = Buffer.from(att.data, 'base64').toString('utf-8');
        } else if (att.mimeType.startsWith('image/')) {
          // Use Gemini to describe the image for indexing
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
          const model = genAI.getGenerativeModel({ model: ARCHIVE_MODEL });
          const prompt = "Describe this image in detail for a searchable research database. Focus on identifying objects, text, and context.";

          const result = await model.generateContent([
            prompt,
            { inlineData: { data: att.data, mimeType: att.mimeType } }
          ]);
          contentToIndex = `[Image Description for ${att.name}]: ${result.response.text()}`;
        }

        if (contentToIndex) {
          await addMemory(contentToIndex, {
            type: 'attachment',
            name: att.name,
            mimeType: att.mimeType,
            sessionId: state.sessionId,
            timestamp: new Date().toISOString()
          });
          indexedAttachments.push(att.name); // Track indexed attachments
          logger.debug({ sessionId: state.sessionId, attachmentName: att.name }, "Indexed attachment");
        }
      } catch (err) {
        logger.error({ sessionId: state.sessionId, attachmentName: att.name, error: err }, "Archive Node Error: Attachment indexing failed");
      }
    }
  }

  // Add a comprehensive summary of the agent's output and overall interaction to vector store
  if (state.sessionId && summary) { // Ensure summary is available
    let overallAgentSummary = `Overall Agent Interaction Summary for Session ${state.sessionId}:\n\n`;
    overallAgentSummary += `Session Title: ${summary.summaryTitle}\n`;
    overallAgentSummary += `User Message: ${summary.userMessage}\n`;
    overallAgentSummary += `AI Answer: ${summary.aiAnswer}\n`;

    if (extractedFacts.length > 0) {
      overallAgentSummary += `Extracted Facts: ${extractedFacts.map((f: any) => f.fact).join('; ')}\n`;
    }
    if (indexedAttachments.length > 0) {
      overallAgentSummary += `Indexed Attachments: ${indexedAttachments.join(', ')}\n`;
    }
    overallAgentSummary += `Full Conversation History:\n${state.messages.map(m => {
      const r = getMessageRole(m);
      const c = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      return `${r}: ${c}`;
    }).join('\n')}\n`;

    try {
      await addMemory(overallAgentSummary, {
        type: 'overall_session_summary',
        sessionId: state.sessionId,
        timestamp: new Date().toISOString(),
      });
      logger.info({ sessionId: state.sessionId }, "Overall agent interaction summary added to vector store");
    } catch (err) {
      logger.error({ sessionId: state.sessionId, error: err }, "Archive Node Error: Overall Summary Archival");
    }
  }

  return {
    metadata: { stage: STAGES.FINALIZE, status: "Jarvish has remembered this session and indexed all documents." }
  };
}

