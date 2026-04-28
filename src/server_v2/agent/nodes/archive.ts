import { AgentStateType } from "../state.js";
import { addMemory } from "../../services/memory/memory.service.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ARCHIVE_MODEL } from "../models.js";
import { PDFParse } from 'pdf-parse';
import { summarizeSession } from "../../services/summarization.service.js";
import { db } from "../../db/index.js";
import { sessionSummaries } from "../../db/schema.js";

/**
 * Node: Memory Archiving
 * Responsibilities:
 * 1. Summarize the current interaction.
 * 2. Index all attachments (PDFs, Images, Text) into long-term memory.
 * 3. Persist everything to Weaviate for long-term recall.
 * 4. Generate and store a high-level session summary for history UI.
 */
export async function archiveNode(state: AgentStateType) {
  // 1. Generate Session Summary for UI History (New Requirement)
  if (state.sessionId) {
    console.log(`[Agent Graph] Node: Archive | Generating session summary for ${state.sessionId}`);
    try {
      const history = state.messages.map(m => ({
        role: m.role === 'user' || m.role === 'human' ? 'user' : 'assistant',
        content: m.content
      }));
      
      const summary = await summarizeSession(history);
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
      console.log(`[Agent Graph] Node: Archive | Session summary stored.`);
    } catch (err) {
      console.error("[Archive Node Error: Session Summary]", err);
    }
  }

  // 2. Archive Conversation Summary to Vector Store
  const lastUserMessage = state.messages.findLast(m => m.role === 'user');
  const lastModelMessage = state.messages.findLast(m => m.role === 'assistant' || m.role === 'agent' || (m.role === 'model' && !m.tool_calls));

  if (lastUserMessage && lastModelMessage) {
    console.log(`[Agent Graph] Node: Archive | Saving interaction to memory.`);

    const summary = `Conversation Summary [${new Date().toLocaleTimeString()}]:
    User: ${lastUserMessage.content}
    Assistant: ${lastModelMessage.content}`;

    await addMemory(summary, { 
      type: 'history', 
      timestamp: new Date().toISOString() 
    }).catch(err => console.error("[Archive Node Error: Summary Archival]", err));
  } else {
    console.log(`[Agent Graph] Node: Archive | Interaction skipped (missing User or Model message). Roles present: ${state.messages.map(m => m.role).join(', ')}`);
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
            timestamp: new Date().toISOString()
          });
          console.log(`[Agent Graph] Indexed attachment: ${att.name}`);
        }
      } catch (err) {
        console.error(`[Archive Node Error: Attachment ${att.name}]`, err);
      }
    }
  }

  return {
    metadata: { stage: 4, status: "Jarvish has remembered this session and indexed all documents." }
  };
}
