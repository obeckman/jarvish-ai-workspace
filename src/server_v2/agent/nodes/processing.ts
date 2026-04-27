import { GoogleGenerativeAI } from "@google/generative-ai";
import { AgentStateType } from "../state.js";

/**
 * Node: Attachment Processing
 * Responsibilities:
 * 1. Identify new attachments that haven't been processed.
 * 2. Use Gemini to extract a "Final Version" of the text/data from the file.
 * 3. Store the clean extraction in the 'processedAttachments' state.
 */
export async function processingNode(state: AgentStateType) {
  const attachments = state.attachments || [];
  const processedCount = state.processedAttachments?.length || 0;
  
  // Only process attachments that haven't been processed yet in this session
  const newAttachments = attachments.slice(processedCount);

  if (newAttachments.length === 0) {
    return {};
  }

  console.log(`[Agent Graph] Node: Processing | Extracting clean text from ${newAttachments.length} new files.`);
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  
  const results: any[] = [];

  for (const att of newAttachments) {
    try {
      const prompt = `Extract all relevant text and data from this file. 
      Format it into a clean, highly readable, and structured text version. 
      If it's a PDF or Image, perform OCR and layout analysis to preserve meaning.
      This will be used as the 'Final Reference Version' in our database.
      
      File Name: ${att.name}
      MIME Type: ${att.mimeType}`;

      const result = await model.generateContent([
        prompt,
        { inlineData: { data: att.data, mimeType: att.mimeType } }
      ]);
      
      const extractedText = result.response.text();
      
      results.push({
        name: att.name,
        mimeType: att.mimeType,
        extractedText: extractedText,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error(`[Processing Node Error: ${att.name}]`, error);
      results.push({
        name: att.name,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  return {
    processedAttachments: results,
    metadata: { 
      stage: 2, 
      status: `Successfully converted ${results.length} files to clean text versions.` 
    }
  };
}
