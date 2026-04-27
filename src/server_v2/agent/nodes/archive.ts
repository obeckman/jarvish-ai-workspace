import { AgentStateType } from "../state.js";
import { addMemory } from "../../services/memory/memory.service.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ARCHIVE_MODEL } from "../models.js";
import { PDFParse } from 'pdf-parse';

/**
 * Node: Memory Archiving
 * Responsibilities:
 * 1. Summarize the current interaction.
 * 2. Index all attachments (PDFs, Images, Text) into long-term memory.
 * 3. Persist everything to Weaviate for long-term recall.
 */
export async function archiveNode(state: AgentStateType) {
  // 1. Archive Conversation Summary
  const lastUserMessage = state.messages.findLast(m => m.role === 'user');
  const lastModelMessage = state.messages.findLast(m => m.role === 'assistant' || (m.role === 'model' && !m.tool_calls));

  if (lastUserMessage && lastModelMessage) {
    console.log(`[Agent Graph] Node: Archive | Saving interaction to memory.`);
    
    const summary = `Conversation Summary [${new Date().toLocaleTimeString()}]:
    User: ${lastUserMessage.content}
    Assistant: ${lastModelMessage.content}`;

    await addMemory(summary, { 
      type: 'history', 
      timestamp: new Date().toISOString() 
    }).catch(err => console.error("[Archive Node Error: Summary]", err));
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
