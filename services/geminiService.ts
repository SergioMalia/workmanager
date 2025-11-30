import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const estimateTaskDuration = async (taskDescription: string, workType: string): Promise<number> => {
  try {
    // If no API key is set, mock a response to prevent app crash in demo mode
    if (!process.env.API_KEY) {
      console.warn("Gemini API Key missing. Returning mock data.");
      return 8; 
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are an expert industrial project manager. 
      Estimate the hours needed for a task described as: "${taskDescription}" in the context of "${workType}". 
      Return ONLY a number representing estimated man-hours. Do not explain.`,
    });

    const text = response.text.trim();
    const hours = parseInt(text, 10);
    return isNaN(hours) ? 8 : hours;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return 8; // Default fallback
  }
};
