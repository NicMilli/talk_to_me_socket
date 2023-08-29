require('dotenv').config()
const WebSocket = require('ws')
const { v4: uuidv4 } = require('uuid')
const OpenAI = require('openai')

const wss = new WebSocket.Server({ port: 7071 })

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const clients = new Map()

wss.on('connection', (ws) => {
  const id = uuidv4()
  const metadata = {
    id,
    messages: [],
  }
  clients.set(ws, metadata)

  ws.on('message', async (dataAsString) => {
    const metadata = clients.get(ws)
    const data = JSON.parse(dataAsString)
    const targetAudience = data.targetAudience || 'the general public'

    if (metadata.messages.length === 0) {
      metadata.messages.push({
        role: 'system',
        content: `You are a professional writer. I am preparing a speech for ${targetAudience}. Please format this text into a speech with punctuation and paragraphs. Please do not add extra words or paragraphs except for clarity`,
      })
    }

    metadata.messages.push({
      role: 'user',
      content: data.content,
    })

    //TODO: STOP THE STREAM FROM OPENAI ON END
    const completion = await openai.chat.completions.create({
      messages: metadata.messages,
      model: 'gpt-3.5-turbo',
      stream: true,
    })

    for await (const part of completion) {
      console.log('choice:', JSON.stringify(part.choices[0].delta.content))
      ws.send(part.choices[0]?.delta.content || '')
    }
  })

  ws.on('close', () => {
    clients.delete(ws)
  })
})

console.log('wss up')
