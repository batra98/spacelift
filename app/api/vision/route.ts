import { NextRequest, NextResponse } from "next/server";
import { analyzeRoom, VisionResult } from "@/lib/gemini";

// Mock fallback when no Gemini API key is set
const MOCK_RESPONSE: VisionResult = {
  chat_response:
    "Oh sweetie. The bare walls are giving 'I just moved in three years ago and gave up.' The mystery floor situation is screaming for help, and that lighting? It belongs in a hospital waiting room. Here's what we're fixing first:",
  search_queries: ["lighting", "rug", "wall art", "plants"],
};

async function verifyUnkey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  const rootKey = process.env.UNKEY_ROOT_KEY;
  const apiId = process.env.UNKEY_API_ID;

  // Skip Unkey if not configured
  if (!rootKey || !apiId || rootKey === "your_unkey_root_key_here") {
    return { valid: true };
  }

  try {
    const res = await fetch("https://api.unkey.dev/v1/keys.verifyKey", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ apiId, key: apiKey }),
    });
    const data = await res.json();
    return { valid: data.valid === true, error: data.error };
  } catch {
    // If Unkey is unreachable, allow through (fail open for demo)
    return { valid: true };
  }
}

export async function POST(req: NextRequest) {
  try {
    // Unkey rate limiting (optional)
    const apiKey = req.headers.get("x-api-key") || "demo";
    const { valid, error } = await verifyUnkey(apiKey);

    if (!valid) {
      return NextResponse.json(
        { error: `Unauthorized: ${error || "Invalid API key"}` },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { image, mimeType, prompt } = body as {
      image?: string;
      mimeType?: string;
      prompt?: string;
    };

    // Use mock if no Gemini key or no image
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey || geminiKey === "your_gemini_api_key_here" || !image) {
      // Slight delay to simulate network for demo
      await new Promise((r) => setTimeout(r, 1200));
      return NextResponse.json(MOCK_RESPONSE);
    }

    const result = await analyzeRoom(image, mimeType || "image/jpeg", prompt || "Roast my room");
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Vision API error:", err);
    return NextResponse.json(
      { error: "Vision analysis failed", details: String(err) },
      { status: 500 }
    );
  }
}
