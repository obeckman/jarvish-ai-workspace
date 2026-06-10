import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import Database from 'better-sqlite3'
import { validateNodeResponseContent } from '@/backend/agent/validation/node-response.validator'
import { validateToolOutput } from '@/backend/agent/validation/tool-output.validator'
import { createGeminiErrorBlockContent, getGeminiErrorDetails } from '@/backend/services/gemini-error'
import { SQLiteVectorStore } from '@/backend/services/memory/sqlite-vector.store'
import { parseAgentMessageContent } from '@/frontend/features/jarvishAgent/utils/parser'
import { parseAgentEventPayload } from '@/frontend/features/jarvishAgent/utils/eventMapper'
import { BLOCK_TYPES, EVENT_TYPES, TOOL_NAMES } from '@/shared/jarvish.constants'

function testAgentMessageParser() {
  const blocks = parseAgentMessageContent(JSON.stringify([
    { type: BLOCK_TYPES.TEXT, content: 'hello' },
  ]))

  assert.equal(blocks.length, 1)
  assert.equal(blocks[0].type, BLOCK_TYPES.TEXT)
  assert.equal(blocks[0].content, 'hello')

  const fenced = parseAgentMessageContent('```json\n[{"type":"text","content":"from fence"}]\n```')
  assert.equal(fenced[0].content, 'from fence')

  const fallback = parseAgentMessageContent('plain text')
  assert.equal(fallback[0].type, BLOCK_TYPES.TEXT)
  assert.equal(fallback[0].content, 'plain text')
}

function testAgentEventMapping() {
  const event = parseAgentEventPayload({
    agentEvents: {
      type: 'REASONING',
      content: 'checking memory',
      stage: 2,
      metadata: {
        confidence: 88,
        validationReason: 'retrieved matching context',
      },
    },
  })

  assert.equal(event.type, EVENT_TYPES.REASONING)
  assert.equal(event.content, 'checking memory')
  assert.equal(event.stage, 2)
  assert.equal(event.metadata?.confidence, 88)
}

function testNodeResponseValidation() {
  const valid = validateNodeResponseContent(JSON.stringify([
    { type: BLOCK_TYPES.TEXT, content: 'valid block' },
  ]))

  assert.equal(valid.valid, true)
  assert.equal(valid.confidence, 100)

  const invalid = validateNodeResponseContent('not a block')
  assert.equal(invalid.valid, false)
  assert.equal(invalid.confidence, 0)
}

function testToolOutputValidation() {
  const searchResult = validateToolOutput(TOOL_NAMES.WEB_SEARCH, 'Title: Result\nUrl: https://example.com')
  assert.equal(searchResult.valid, true)
  assert.equal(searchResult.confidence, 100)

  const emptySearch = validateToolOutput(TOOL_NAMES.WEB_SEARCH, 'No results found')
  assert.equal(emptySearch.valid, false)
  assert.equal(emptySearch.confidence, 50)

  const structured = validateToolOutput(TOOL_NAMES.READ_FILE, { content: 'ok' })
  assert.equal(structured.valid, true)
  assert.equal(structured.confidence, 100)
}

function testGeminiErrorFormatting() {
  const details = getGeminiErrorDetails({ status: 403, statusText: 'Forbidden' })
  assert.equal(details.status, 403)
  assert.equal(details.isAuthOrPermissionError, true)

  const blocks = parseAgentMessageContent(createGeminiErrorBlockContent({ status: 403 }))
  assert.equal(blocks[0].type, BLOCK_TYPES.TEXT)
  assert.match(blocks[0].content, /not authorized/)
}

async function testSQLiteVectorStore() {
  const directory = mkdtempSync(join(tmpdir(), 'jarvish-vector-store-'))
  const database = new Database(join(directory, 'vector-smoke.db'))

  try {
    const store = new SQLiteVectorStore(database)
    await store.ensureSchema()

    const firstId = await store.add('alpha memory', [1, 0, 0], { type: 'smoke', userId: 'test-user' })
    const secondId = await store.add('beta memory', [0, 1, 0], { type: 'smoke', userId: 'test-user' })

    const results = await store.search([1, 0, 0], { limit: 2 })

    assert.equal(results.length, 2)
    assert.equal(results[0].id, firstId)
    assert.equal(results[0].text, 'alpha memory')
    assert.equal(results[1].id, secondId)

    await store.delete(firstId)
    const afterDelete = await store.search([1, 0, 0], { limit: 2 })
    assert.equal(afterDelete.some((memory) => memory.id === firstId), false)
  } finally {
    database.close()
    rmSync(directory, { recursive: true, force: true })
  }
}

testAgentMessageParser()
testAgentEventMapping()
testNodeResponseValidation()
testToolOutputValidation()
testGeminiErrorFormatting()
await testSQLiteVectorStore()

console.log('Jarvish smoke checks passed')
