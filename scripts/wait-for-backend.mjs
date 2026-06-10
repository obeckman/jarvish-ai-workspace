const port = process.env.PORT || '3000'
const url = `http://localhost:${port}/api/health`
const timeoutMs = Number(process.env.BACKEND_WAIT_TIMEOUT_MS || 15000)
const intervalMs = Number(process.env.BACKEND_WAIT_INTERVAL_MS || 250)
const startedAt = Date.now()

while (Date.now() - startedAt < timeoutMs) {
  try {
    const response = await fetch(url)
    if (response.ok) {
      process.exit(0)
    }
  } catch {
    // Backend is still starting.
  }

  await new Promise((resolve) => setTimeout(resolve, intervalMs))
}

console.error(`Timed out waiting for backend health check at ${url}`)
process.exit(1)
