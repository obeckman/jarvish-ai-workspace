import { InMemoryVectorStore } from '@/backend/services/memory/in-memory.store'
import { SQLiteVectorStore } from '@/backend/services/memory/sqlite-vector.store'
import { sqlite } from '@/backend/db'
import { setVectorStore } from '@/backend/services/memory/memory.service'
import type { IVectorStore } from '@/backend/services/memory/vector_store.interface'
import { logger } from '@/backend/utils/logger'

const VECTOR_STORE_PROVIDERS = {
  SQLITE: 'sqlite',
  MEMORY: 'memory',
} as const

type VectorStoreProvider = typeof VECTOR_STORE_PROVIDERS[keyof typeof VECTOR_STORE_PROVIDERS]

export async function runVectorDatabase() {
  const provider = getVectorStoreProvider()
  logger.info({ provider }, '[Memory] Initializing vector store')

  const vectorStore = createVectorStore(provider)
  await vectorStore.ensureSchema()
  setVectorStore(vectorStore)

  logger.info({ provider }, '[Memory] Vector store ready')
}

function getVectorStoreProvider(): VectorStoreProvider {
  const configuredProvider = process.env.VECTOR_STORE_PROVIDER?.trim().toLowerCase()

  if (configuredProvider === VECTOR_STORE_PROVIDERS.MEMORY) {
    return VECTOR_STORE_PROVIDERS.MEMORY
  }

  return VECTOR_STORE_PROVIDERS.SQLITE
}

function createVectorStore(provider: VectorStoreProvider): IVectorStore {
  if (provider === VECTOR_STORE_PROVIDERS.MEMORY) {
    return new InMemoryVectorStore()
  }

  return new SQLiteVectorStore(sqlite)
}
