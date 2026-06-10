import { AgentStateType } from "@/backend/agent/state";
import { addMemory, MEMORY_TYPES } from "@/backend/services/memory/memory.service";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ARCHIVE_MODEL } from "@/backend/agent/models";
import { PDFParse } from 'pdf-parse';
import { summarizeSession } from "@/backend/services/summarization.service";
import { extractAndStoreFacts, type ExtractedFact } from "@/backend/services/factExtraction.service";
import { db } from "@/backend/db/index";
import { sessionSummaries } from "@/backend/db/schema";
import { STAGES, ROLES } from "@/shared/jarvish.constants";
import { getMessageRole } from "./utils";
import { logger } from "@/backend/utils/logger";
import { createHash, randomUUID } from "node:crypto";

/**
 * Node: Memory Archiving
 * Responsibilities:
 * 1. Summarize the current interaction.
 * 2. Index all attachments (PDFs, Images, Text) into long-term memory.
 * 3. Persist recallable context through the vector-store boundary.
 * 4. Generate and store a high-level session summary for history UI.
 * 5. Extract static facts for the structured user profile.
 */
export async function archiveNode(state: AgentStateType) {
  logger.debug({ sessionId: state.sessionId, messagesCount: state.messages.length }, "Node: Archive");
  let summary: { summaryTitle: string; userMessage: string; aiAnswer: string } | null = null;
  let extractedFacts: ExtractedFact[] = [];
  const indexedAttachments: string[] = [];
  const userId = state.userId;

  // 1. Generate Session Summary for UI History (New Requirement)
  if (state.sessionId) {
    logger.info({ sessionId: state.sessionId }, "Generating session summary");
    try {
      const history = state.messages.map(m => {
        const role = getMessageRole(m);
        const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        return {
          role: isUserRole(role) ? ROLES.USER : ROLES.ASSISTANT,
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
      if (process.env.ARCHIVE_AI_ENRICHMENT_ENABLED === "true") {
        extractedFacts = await extractAndStoreFacts(state.sessionId, userId, history);
        logger.debug({ sessionId: state.sessionId, extractedFactsCount: extractedFacts.length }, "Extracted facts");
      } else {
        logger.debug({ sessionId: state.sessionId }, "Fact extraction skipped because archive AI enrichment is disabled.");
      }

    } catch (err) {
      logger.error({ sessionId: state.sessionId, error: err }, "Archive Node Error: Session Summary");
    }
  }

  // 2. Archive Conversation Summary to Vector Store
  const lastUserMessage = state.messages.findLast(m => {
    const r = getMessageRole(m);
    return isUserRole(r);
  });

  const lastModelMessage = state.messages.findLast(m => {
    const r = getMessageRole(m);
    return isAssistantRole(r);
  });

  if (lastUserMessage && lastModelMessage) {
    logger.info({ sessionId: state.sessionId }, "Saving interaction to memory");

    const userContent = typeof lastUserMessage.content === 'string' ? lastUserMessage.content : JSON.stringify(lastUserMessage.content);
    const modelContent = typeof lastModelMessage.content === 'string' ? lastModelMessage.content : JSON.stringify(lastModelMessage.content);

    const conversationSummary = `Conversation Summary [${new Date().toLocaleTimeString()}]:
    User: ${userContent}
    Assistant: ${modelContent}`;

    await addMemory(conversationSummary, {
      type: MEMORY_TYPES.HISTORY,
      sourceKind: MEMORY_TYPES.HISTORY,
      sessionId: state.sessionId,
      userId,
      timestamp: new Date().toISOString(),
      isActive: true,
      isLatest: true,
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
          const normalizedName = normalizeFileName(att.name);
          const contentHash = hashText(contentToIndex);
          const documentGroupKey = hashText(`${userId}:${normalizedName}`);
          const createdAt = new Date().toISOString();
          await addMemory(contentToIndex, {
            type: MEMORY_TYPES.ATTACHMENT,
            sourceKind: MEMORY_TYPES.ATTACHMENT,
            sourceId: randomUUID(),
            name: att.name,
            normalizedName,
            mimeType: att.mimeType,
            sessionId: state.sessionId,
            userId,
            contentHash,
            documentGroupKey,
            versionId: randomUUID(),
            timestamp: createdAt,
            createdAt,
            isActive: true,
            isLatest: true,
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

    const storedFacts = extractedFacts.filter((fact) => fact.status === "stored");
    if (storedFacts.length > 0) {
      overallAgentSummary += `Extracted Facts: ${storedFacts.map((fact) => fact.fact).join('; ')}\n`;
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
        type: MEMORY_TYPES.OVERALL_SESSION_SUMMARY,
        sourceKind: MEMORY_TYPES.OVERALL_SESSION_SUMMARY,
        sessionId: state.sessionId,
        userId,
        timestamp: new Date().toISOString(),
        isActive: true,
        isLatest: true,
      });
      logger.info({ sessionId: state.sessionId }, "Overall agent interaction summary added to vector store");
    } catch (err) {
      logger.error({ sessionId: state.sessionId, error: err }, "Archive Node Error: Overall Summary Archival");
    }
  }

  const conflictCount = extractedFacts.filter((fact) => fact.status === "conflict").length;
  const duplicateCount = extractedFacts.filter((fact) => fact.status === "duplicate").length;
  const conflictSummary = extractedFacts
    .filter((fact) => fact.status === "conflict")
    .map((fact) => `"${fact.fact}" conflicts with "${fact.conflictWith || "an existing fact"}"`)
    .join("; ");
  const status = conflictCount > 0
    ? `Jarvish indexed this session, but ${conflictCount} memory conflict${conflictCount === 1 ? "" : "s"} need clarification.`
    : "Jarvish has remembered this session and indexed all documents. Confidence: 100%.";
  const validationReason = conflictCount > 0
    ? `Archive node skipped conflicting facts so the user can clarify which version is correct: ${conflictSummary}`
    : `Archive node completed persistence and indexing flow. Duplicate facts skipped: ${duplicateCount}.`;

  return {
    metadata: {
      stage: STAGES.FINALIZE,
      status,
      confidence: conflictCount > 0 ? 80 : 100,
      validationReason,
    }
  };
}

function normalizeFileName(name: string): string {
  const baseName = name.split(/[\\/]/).pop() || name;
  return baseName.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function hashText(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isUserRole(role: string): boolean {
  return role === ROLES.USER || role === ROLES.HUMAN;
}

function isAssistantRole(role: string): boolean {
  return role === ROLES.ASSISTANT || role === ROLES.AGENT || role === ROLES.MODEL || role === "ai";
}
