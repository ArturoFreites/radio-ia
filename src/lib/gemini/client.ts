import { GoogleGenAI } from "@google/genai";

export const GEMINI_TEXT_MODEL = "gemini-2.5-flash";
export const GEMINI_TTS_MODEL = "gemini-2.5-flash-preview-tts";

let client: GoogleGenAI | null = null;

export function getGenAI(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY no definida");
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}
