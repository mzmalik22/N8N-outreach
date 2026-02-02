
import { GoogleGenAI, Type } from "@google/genai";
import { Prospect, ResearchResult, EmailResult } from "../types";

const SYSTEM_INSTRUCTION = `
You are an AI research + copywriting agent inside an n8n (self-hosted) workflow used by a marketing agency that runs the podcast "The Art of Selling Online Courses."

Your Role:
You handle ONLY research synthesis + outreach email writing. 
Podcast Theme: Selling online courses + digital education businesses for founders, coaches, and educators.

Email Rules (STRICT):
- Return ONLY the email body.
- No subject line.
- DO NOT sound like a template.
- No emojis.
- No hype or buzzwords.
- No generic compliments.
- Be specific to the person based on research.
- Length: 120–180 words.
- One clear CTA: invite them to be a guest.
- Tone: Direct, Professional, Human, Founder-to-founder energy.
`;

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing VITE_GEMINI_API_KEY");
  }

  this.ai = new GoogleGenAI({ apiKey });
  }

  async performResearch(prospect: Partial<Prospect>): Promise<ResearchResult> {
    const prompt = `
      Act as the research enrichment node in an n8n workflow. 
      Analyze the following prospect data and provide a synthesis.
      
      Name: ${prospect.name}
      Business: ${prospect.business}
      Website: ${prospect.website}
      Internal Notes: ${prospect.pastNotes}
      
      Tasks:
      1. Extract their niche.
      2. Identify their main offer / course / product.
      3. List authority signals (audience size, achievements, press, notable clients).
      
      Return as a JSON object matching the requested schema.
    `;

    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "A synthesis of web research from Serper/SerpAPI context." },
            insights: {
              type: Type.OBJECT,
              properties: {
                niche: { type: Type.STRING },
                mainOffer: { type: Type.STRING },
                authoritySignals: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING } 
                }
              },
              required: ['niche', 'mainOffer', 'authoritySignals']
            }
          },
          required: ['summary', 'insights']
        }
      }
    });

    return JSON.parse(response.text || '{}');
  }

  async generateEmail(prospect: Prospect): Promise<EmailResult> {
    const prompt = `
      Generate the outreach email body based on the following n8n workflow data:
      
      Name: ${prospect.name}
      Business/Role: ${prospect.business}
      Website: ${prospect.website}
      Internal Notes: ${prospect.pastNotes}
      Research Synthesis: ${prospect.researchSummary}
      Extracted Insights: ${JSON.stringify(prospect.insights)}
      
      Remember:
      - 120-180 words.
      - No emojis.
      - Professional, founder-to-founder tone.
      - Clear CTA for the "Art of Selling Online Courses" podcast guest invitation.
      - Return ONLY the body text.
    `;

    const response = await this.ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });

    return { body: response.text || '' };
  }
}

export const geminiService = new GeminiService();
