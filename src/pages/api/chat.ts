import { StreamingTextResponse } from 'ai'
import GroqChat from 'groq-sdk'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { messages } = req.body
    
    console.log('Received messages:', messages)
    console.log('API Key:', process.env.GROQ_API_KEY ? 'Present' : 'Missing')
    
    const groq = new GroqChat({
      apiKey: process.env.GROQ_API_KEY
    })

    const response = await groq.chat.completions.create({
      messages: messages,
      model: 'llama3-small',
      stream: true
    })

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of response) {
          controller.enqueue(chunk.choices[0]?.delta?.content || '')
        }
        controller.close()
      }
    })

    return new StreamingTextResponse(stream)
  } catch (error) {
    console.error('Detailed error:', error)
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}