"use server"

import { generateText } from "ai"
import { google } from "@ai-sdk/google"
import { DEFAULT_GEMINI_MODEL } from "@/lib/integrations/llm"

export type RunLlmParams = {
  prompt: string
  inputText: string
  modelType: string
  reasoningLevel: "none" | "low" | "high"
  outputMethod: "text" | "json"
}

export async function runGeminiAction(params: RunLlmParams) {
  const { prompt, inputText, reasoningLevel, outputMethod } = params
  
  const systemPrompt = `You are a data processing node in a workflow.
${reasoningLevel !== "none" ? `You should think ${reasoningLevel}ly before answering.` : ''}
Your task is to process the user's input text according to the following instructions:
${prompt}`

  try {
    const model = google(DEFAULT_GEMINI_MODEL)

    if (outputMethod === "json") {
      const { text } = await generateText({
        model,
        system: systemPrompt + "\nRespond with valid JSON only.",
        prompt: `Input text to process:\n\n${inputText}`,
      })
      
      // Attempt to clean JSON if it includes markdown code blocks
      const cleanJson = text.replace(/^```json\n?/, '').replace(/\n?```$/, '')
      return { success: true, text: cleanJson }
    } else {
      const { text } = await generateText({
        model,
        system: systemPrompt,
        prompt: `Input text to process:\n\n${inputText}`,
      })
      
      return { success: true, text }
    }
  } catch (error) {
    console.error("Gemini API Error:", error)
    return { success: false, error: String(error) }
  }
}
