import { GoogleGenerativeAI, type FunctionDeclaration } from "@google/generative-ai";

import { REASONING_MODEL } from "@/backend/agent/models";

type GeminiModelConfig = {
  functionDeclarations: FunctionDeclaration[];
  model?: string;
  systemInstruction: string;
};

export function createGeminiModel({
  functionDeclarations,
  model = REASONING_MODEL,
  systemInstruction,
}: GeminiModelConfig) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

  return genAI.getGenerativeModel({
    model,
    systemInstruction,
    tools: [{ functionDeclarations }],
  });
}
