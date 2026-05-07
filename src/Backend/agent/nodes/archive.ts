import { AgentStateType } from "@/Backend/agent/state";
import { addMemory } from "@/Backend/services/memory/memory.service";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ARCHIVE_MODEL } from "@/Backend/agent/models";
import { PDFParse } from 'pdf-parse';
import { summarizeSession } from "@/Backend/services/summarization.service";
import { extractAndStoreFacts } from "@/Backend/services/factExtraction.service";
import { db } from "@/Backend/db/index";
import { sessionSummaries } from "@/Backend/db/schema";
import { STAGES, ROLES } from "@/Backend/agent/constants";
import { getMessageRole, getMessageType } from "./utils";

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
  let summary: { summaryTitle: string; userMessage: string; aiAnswer: string } | null = null;
  let extractedFacts: any[] = [];
  let indexedAttachments: string[] = [];

  // 1. Generate Session Summary for UI History (New Requirement)
  if (state.sessionId) {
    console.log(`[Agent Graph] Node: Archive | Generating session summary for ${state.sessionId}`);
    try {
      const history = state.messages.map(m => {
        const role = getMessageRole(m);
        const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        return {
          role: (role === ROLES.USER.toLowerCase() || role === ROLES.HUMAN.toLowerCase() || role === 'human') ? 'user' : 'assistant',
          content: content
        };
      });

      summary = await summarizeSession(history);
      if(summary) {
        
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
      console.log(`[Agent Graph] Node: Archive | Session summary stored: ${JSON.stringify(summary)}`);
    }
      // 5. Extract Static Facts
      extractedFacts = await extractAndStoreFacts(state.sessionId, history);
      //console.log(`[Agent Graph] Node: Archive | Extracted facts: ${extractedFacts.length}`);

    } catch (err) {      console.error("[Archive Node Error: Session Summary]", err);
    }
  }

  // 2. Archive Conversation Summary to Vector Store
  const lastUserMessage = state.messages.findLast(m => {
    const r = getMessageRole(m);
    return r === ROLES.USER.toLowerCase() || r === ROLES.HUMAN.toLowerCase() || r === 'human';
  });
  
  const lastModelMessage = state.messages.findLast(m => {
    const r = getMessageRole(m);
    return r === ROLES.ASSISTANT.toLowerCase() || r === ROLES.AGENT.toLowerCase() || r === ROLES.MODEL.toLowerCase() || r === 'ai' || r === 'assistant';
  });

  if (lastUserMessage && lastModelMessage) {
    console.log(`[Agent Graph] Node: Archive | Saving interaction to memory.`);

    const userContent = typeof lastUserMessage.content === 'string' ? lastUserMessage.content : JSON.stringify(lastUserMessage.content);
    const modelContent = typeof lastModelMessage.content === 'string' ? lastModelMessage.content : JSON.stringify(lastModelMessage.content);

    const conversationSummary = `Conversation Summary [${new Date().toLocaleTimeString()}]:
    User: ${userContent}
    Assistant: ${modelContent}`;

    await addMemory(conversationSummary, { 
      type: 'history', 
      sessionId: state.sessionId,
      timestamp: new Date().toISOString() 
    }).catch(err => console.error("[Archive Node Error: Summary Archival]", err));
  } else {
    const roles = state.messages.map(m => getMessageRole(m));
    console.log(`[Agent Graph] Node: Archive | Interaction skipped (missing User or Model message). Roles present: ${roles.join(', ')}`);
  }


  // 2. Index Attachments
  if (state.attachments && state.attachments.length > 0) {
    console.log(`[Agent Graph] Node: Archive | Indexing ${state.attachments.length} attachments.`);
    
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
          console.log(`[Agent Graph] Indexed attachment: ${att.name}`);
        }
      } catch (err) {
        console.error(`[Archive Node Error: Attachment ${att.name}]`, err);
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
      console.log(`[Agent Graph] Node: Archive | Overall agent interaction summary added to vector store.`);
    } catch (err) {
      console.error("[Archive Node Error: Overall Summary Archival]", err);
    }
  }

  console.log(`[Agent Graph] Node: Archive | State messages before return:`, state.messages.map(m => {
    const r = getMessageRole(m);
    const c = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
    return {role: r, content: c ? c.substring(0, 50) + '...' : ''};
  }));
  return {
    messages: state.messages,
    metadata: { stage: STAGES.FINALIZE, status: "Jarvish has remembered this session and indexed all documents." }
  };
}

