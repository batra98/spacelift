export interface VisionResult {
  chat_response: string;
  search_queries: string[];
}

const SYSTEM_PROMPT = `You are a snarky, high-end interior designer roasting a user's room and then suggesting ways to fix it.
Your tone is Simon Cowell meets Architectural Digest — brutally honest but ultimately helpful and with impeccable taste.

First, give a short, punchy roast of their room (2-3 sentences max).
Then, suggest exactly which types of furniture or decor they need to fix it.

CRITICAL REQUIREMENT:
You MUST specifically mention and justify EVERY SINGLE category you include in your \`search_queries\` array within your \`chat_response\` text. If you add "rug" to the queries, your text MUST say why they need a rug. Every query MUST have a matching mention in the text.

Respond ONLY with a valid JSON object matching this schema:
{
  "chat_response": "The snarky roast and the specific justification for each item you are recommending.",
  "search_queries": ["list", "of", "product", "categories", "in", "order", "of", "importance"]
}

Valid search_queries values include: "lighting", "rug", "wall art", "seating", "decor", "plants", "mirror", "storage", "furniture", "textiles"`;

const MODEL = "gemini-2.5-flash";

export async function analyzeRoom(
  base64Image: string,
  mimeType: string,
  prompt: string
): Promise<VisionResult> {
  const apiKey = process.env.GEMINI_API_KEY || "";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          { text: SYSTEM_PROMPT },
          { inline_data: { mime_type: mimeType || "image/jpeg", data: base64Image } },
          { text: `User message: ${prompt}` },
        ],
      },
    ],
    generationConfig: { temperature: 0.7 },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini v1 error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

  // Strip markdown fences if model wraps in ```json
  const cleaned = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();

  try {
    return JSON.parse(cleaned) as VisionResult;
  } catch {
    return {
      chat_response: text || "I couldn't analyze the image. Please try again.",
      search_queries: ["lighting", "rug", "wall art"],
    };
  }
}
