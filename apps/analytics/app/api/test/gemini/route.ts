import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function GET() {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
  
  if (!geminiKey) {
    return NextResponse.json({
      status: 'error',
      message: 'Gemini API key not found in server environment',
      env: {
        GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
        GOOGLE_AI_API_KEY: !!process.env.GOOGLE_AI_API_KEY
      }
    })
  }
  
  try {
    const genAI = new GoogleGenerativeAI(geminiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    
    const prompt = 'Say "Gemini is working!" in 5 words or less.'
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    return NextResponse.json({
      status: 'success',
      message: 'Gemini API is working!',
      response: text,
      keyPresent: true
    })
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: 'Gemini API call failed',
      error: error.message || 'Unknown error',
      keyPresent: true
    })
  }
}