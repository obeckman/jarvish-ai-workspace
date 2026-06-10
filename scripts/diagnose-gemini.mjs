import 'dotenv/config'
import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY
const modelName = process.env.GEMINI_REASONING_MODEL || 'gemini-2.5-flash'

if (!apiKey) {
  console.error('GEMINI_API_KEY is missing.')
  process.exit(1)
}

try {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: modelName })
  const result = await model.generateContent('Reply with exactly: ok')
  const text = result.response.text().trim()

  console.log(JSON.stringify({
    ok: true,
    model: modelName,
    response: text,
  }, null, 2))
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    model: modelName,
    status: error?.status,
    statusText: error?.statusText,
    message: error?.message,
  }, null, 2))
  process.exit(1)
}
