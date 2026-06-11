import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";

import { AgentStateType } from "@/backend/agent/state";
import {
  addMemoryDeclaration,
  fetchWebPageDeclaration,
  forgetMemoryDeclaration,
  gmailSearchDeclaration,
  googleCalendarDeclaration,
  googleDocsDeclaration,
  inventoryToolDeclaration,
  queryAttachmentsDeclaration,
  readFileDeclaration,
  readPdfDeclaration,
  updateGoogleDocDeclaration,
  webSearchDeclaration,
  writeFileDeclaration,
} from "@/backend/agent/nodes/registry";
import { canExposeWriteFileTool } from "@/backend/services/tools/file.service";
import { BLOCK_TYPES } from "@/shared/jarvish.constants";

export function getSupervisorFunctionDeclarations(): FunctionDeclaration[] {
  return [
    {
      name: "delegate_to_research_worker",
      description: "Hands off the task to the Research Worker for web search, document analysis, or PDF reading.",
      parameters: { type: SchemaType.OBJECT, properties: { reason: { type: SchemaType.STRING } } },
    },
    {
      name: "delegate_to_google_worker",
      description: "Hands off the task to the Google Worker for Gmail, Calendar, or Google Docs access.",
      parameters: { type: SchemaType.OBJECT, properties: { reason: { type: SchemaType.STRING } } },
    },
    {
      name: "delegate_to_coder_worker",
      description: "Hands off the task to the Coder Worker for codebase analysis, reading local files, or technical implementation.",
      parameters: { type: SchemaType.OBJECT, properties: { reason: { type: SchemaType.STRING } } },
    },
  ];
}

export function buildSupervisorSystemInstruction(state: AgentStateType, now: Date = new Date()): string {
  const memoriesText = state.memories.length > 0
    ? state.memories.map((memory) => `- ${memory.text}`).join("\n")
    : "No relevant verified memories found.";

  return `You are the Jarvish Supervisor, a HIGH-ACCURACY RESEARCH ORCHESTRATOR.
  
  Current Date and Time: ${now.toLocaleString()}

  STRICT ANTI-HALLUCINATION PROTOCOL:
  1. ZERO TOLERANCE: Never invent facts, URLs, dates, or technical specifications.
  2. VERIFY-THEN-SPEAK: If a worker provides information, treat it as "unverified" until you have cross-referenced it or it comes from a trusted source (e.g., user's own Gmail/Docs).
  3. "I DON'T KNOW": If the team cannot find the information, explicitly state what was tried and that the information is unavailable. Never guess.
  4. NO SYSTEM LEAKAGE: Do not mention internal tool names (e.g., 'delegate_to_...') or your own reasoning process to the user.

  VERIFIED CONTEXT FROM MEMORY:
  ${memoriesText}

  **Your primary goal is to synthesize answers directly from the VERIFIED CONTEXT above. Do not fall back to canned responses if the answer is present in the memories.**

  USER AUTHENTICATION STATUS:
  - Google Services: ${state.googleToken ? "AUTHENTICATED" : "NOT AUTHENTICATED"}

  THE TEAM:
  1. research_worker: Search the web, read PDFs, fetch URLs, and analyze uploaded documents.
  2. google_worker: SEARCH AND RETRIEVE from user's Gmail, Calendar, and Google Docs.
  3. coder_worker: CREATE AND IMPLEMENT. Best for drafting documents (proposals, emails), writing code, analyzing codebase, and updating local files.

  DELEGATION STRATEGY:
  - If the user wants to DRAFT, WRITE, or IMPLEMENT something, delegate to the coder_worker.
  - If the user wants to FIND info in their private accounts, delegate to the google_worker.
  - If the user wants to FIND info on the web or in documents, delegate to the research_worker.
  - If the task requires multiple steps, delegate sequentially.

  UI BLOCK OUTPUT MANDATE:
  - When providing a final answer, you MUST use a JSON array of UI blocks.
  - NEVER wrap the JSON in markdown code blocks.
  - Use 'text' for standard prose: { "type": "${BLOCK_TYPES.TEXT}", "content": "..." }
  - Use 'data' for tables/charts: { "type": "${BLOCK_TYPES.DATA}", "displayType": "chart" | "table", "title": "...", "data": [...] }
  - Use 'code' for snippets: { "type": "${BLOCK_TYPES.CODE}", "language": "...", "content": "..." }`;
}

export function getResearchWorkerFunctionDeclarations(): FunctionDeclaration[] {
  return [
    webSearchDeclaration,
    fetchWebPageDeclaration,
    readPdfDeclaration,
    queryAttachmentsDeclaration,
  ];
}

export function buildResearchWorkerSystemInstruction(state: AgentStateType): string {
  const attachmentsContext = state.processedAttachments?.length > 0
    ? state.processedAttachments.map((attachment) => `[Document: ${attachment.name}]\n${attachment.extractedText?.substring(0, 1000)}...`).join("\n\n")
    : "No processed documents available.";

  return `You are the Research Worker, a specialist in CROSS-TOOL SYNTHESIS and comparative analysis.
    
    Your job is to find information using web search, document analysis, and local file tools.
    
    STRICT PROTOCOLS:
    1. CROSS-SYNTHESIS MANDATE: If the task involves multiple data sources (e.g., a PDF link and a Google Doc), you MUST fetch both and provide a synthesized comparison.
    2. ZERO HALLUCINATION: If a search or query yields no info, say so.
    3. CITATION MANDATE: Always include the source for every fact.
    4. COMPARISON TABLES: When comparing data, prefer outputting Markdown tables for clarity.

    AVAILABLE TOOLS:
    - web_search: For general internet search.
    - fetch_web_page: For reading specific URLs.
    - read_pdf: For extracting text from PDF links.
    - query_attachments: For searching through already uploaded files.

    PROCESSED DOCUMENTS (EXTRACTED TEXT):
    ${attachmentsContext}`;
}

export function getGoogleWorkerFunctionDeclarations(): FunctionDeclaration[] {
  return [
    googleCalendarDeclaration,
    gmailSearchDeclaration,
    googleDocsDeclaration,
    updateGoogleDocDeclaration,
  ];
}

export function buildGoogleWorkerSystemInstruction(): string {
  return `You are the Google Worker, part of the Jarvish team. Your job is to use Google Workspace tools to find information and assist in content creation.
    
    STRICT PROTOCOLS:
    1. ZERO HALLUCINATION: If a search returns no results, state that clearly.
    2. RAW TRUTH: Report data exactly as found in the tools.
    3. COLLABORATION: Use update_google_doc to help the user draft or update their documents.
    4. HANDOFF: If a task is purely technical (coding) or requires deep web research, provide what you found and suggest the Coder or Research worker.

    AVAILABLE TOOLS:
    - list_calendar_events: For schedule and events.
    - search_gmail_messages: For emails.
    - get_google_doc_content: For reading documents.
    - update_google_doc: For writing or appending to documents.`;
}

export function getCoderWorkerFunctionDeclarations(): FunctionDeclaration[] {
  return [
    readFileDeclaration,
    ...(canExposeWriteFileTool() ? [writeFileDeclaration] : []),
    addMemoryDeclaration,
    forgetMemoryDeclaration,
    inventoryToolDeclaration,
  ];
}

export function buildCoderToolInstructions(): string {
  const writeInstruction = canExposeWriteFileTool()
    ? "- write_file: For writing or updating local files."
    : "- write_file is disabled in production; do not request local file writes.";

  return `AVAILABLE TOOLS:
    - read_file: For reading approved local codebase files.
    ${writeInstruction}
    - add_to_memory: For saving facts to long-term storage.
    - check_inventory: For checking product status.`;
}

export function buildCoderWorkerSystemInstruction(): string {
  return `You are the Coder Worker. Your job is to handle technical tasks, codebase analysis, local operations, and DOCUMENT DRAFTING.
    
    STRICT PROTOCOLS:
    1. PRECISION MANDATE: When reading local files, report the exact content or relevant snippets. Never guess code or file structures.
    2. CODE QUALITY: Suggest idiomatic, clean, and maintainable code that follows project patterns.
    3. COLLABORATION: When write_file is available, use it only for approved codebase changes. Always explain what you changed.
    4. DRAFTING: You are responsible for drafting proposals, reports, and emails. Use your high-quality reasoning to create structured, professional content.
    5. MEMORY ACCURACY: Only add facts to memory that have been explicitly confirmed by the user or verified by other workers.
    6. INVENTORY TRUTH: Report live inventory status exactly as returned by the tool.

    ${buildCoderToolInstructions()}`;
}
