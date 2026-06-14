import { HumanMessage } from '@langchain/core/messages';
import { describe, expect, it } from 'vitest';

import {
  buildResearchWorkerSystemInstruction,
  buildSupervisorSystemInstruction,
  getGoogleWorkerFunctionDeclarations,
  getResearchWorkerFunctionDeclarations,
  getSupervisorFunctionDeclarations,
} from '@/backend/agent/nodes/prompts';
import type { AgentStateType } from '@/backend/agent/state';
import { STAGES, TOOL_NAMES } from '@/shared/jarvish.constants';

function state(overrides: Partial<AgentStateType> = {}): AgentStateType {
  return {
    messages: [new HumanMessage('hello')],
    memories: [],
    researchNotes: [],
    metadata: { stage: STAGES.PREPARE, status: 'idle' },
    attachments: [],
    processedAttachments: [],
    googleToken: null,
    lastWorker: null,
    toolConfidence: null,
    sessionId: null,
    userId: 'developer',
    ...overrides,
  };
}

describe('Jarvish prompt builders', () => {
  it('builds supervisor policy from memory and auth state', () => {
    const prompt = buildSupervisorSystemInstruction(
      state({
        googleToken: 'token',
        memories: [{ id: 'mem-1', text: 'User prefers terse status updates.', score: 0.9, metadata: {} }],
      }),
      new Date('2026-06-11T08:30:00.000Z'),
    );

    expect(prompt).toContain('HIGH-ACCURACY RESEARCH ORCHESTRATOR');
    expect(prompt).toContain('- User prefers terse status updates.');
    expect(prompt).toContain('Google Services: AUTHENTICATED');
    expect(prompt).toContain('MUST use a JSON array of UI blocks');
  });

  it('exposes deterministic supervisor delegation tools', () => {
    expect(getSupervisorFunctionDeclarations().map((declaration) => declaration.name)).toEqual([
      'delegate_to_research_worker',
      'delegate_to_google_worker',
      'delegate_to_coder_worker',
    ]);
  });

  it('includes processed attachment excerpts in the research worker prompt', () => {
    const prompt = buildResearchWorkerSystemInstruction(state({
      processedAttachments: [{
        name: 'brief.pdf',
        data: 'base64',
        mimeType: 'application/pdf',
        extractedText: 'Important source text',
      }],
    }));

    expect(prompt).toContain('[Document: brief.pdf]');
    expect(prompt).toContain('Important source text');
    expect(prompt).toContain('CITATION MANDATE');
    expect(prompt).toContain('MUST use a JSON array of UI blocks');
    expect(prompt).toContain("Do not say you cannot display a graph");
    expect(prompt).toContain('"displayType": "chart"');
  });

  it('keeps worker tool declarations separated from orchestration nodes', () => {
    expect(getResearchWorkerFunctionDeclarations().map((declaration) => declaration.name)).toEqual([
      TOOL_NAMES.WEB_SEARCH,
      TOOL_NAMES.FETCH_WEB_PAGE,
      TOOL_NAMES.READ_PDF,
      TOOL_NAMES.QUERY_ATTACHMENTS,
    ]);
    expect(getGoogleWorkerFunctionDeclarations().map((declaration) => declaration.name)).toEqual([
      TOOL_NAMES.LIST_CALENDAR,
      TOOL_NAMES.SEARCH_GMAIL,
      TOOL_NAMES.GET_GOOGLE_DOC,
      TOOL_NAMES.UPDATE_GOOGLE_DOC,
    ]);
  });
});
