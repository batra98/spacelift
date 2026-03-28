import { NextRequest, NextResponse } from "next/server";

const MODEL = "gemini-3.1-flash-image-preview";

interface ProductRef {
  name: string;
  imageUrl: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

async function urlToBase64(url: string): Promise<{ data: string; mimeType: string }> {
  // Resolve relative paths to absolute — server-side fetch requires full URLs
  const absoluteUrl = url.startsWith("/") ? `${BASE_URL}${url}` : url;
  const res = await fetch(absoluteUrl, { redirect: "follow" });
  // Strip charset suffix — e.g. "image/jpeg; charset=utf-8" → "image/jpeg"
  const rawMime = res.headers.get("content-type") || "";
  const mimeType = rawMime.split(";")[0].trim() || "image/jpeg";

  // Reject if not an image (e.g. Unsplash HTML redirect)
  if (!mimeType.startsWith("image/")) {
    throw new Error(`Expected image, got ${mimeType} from ${url}`);
  }

  const buffer = await res.arrayBuffer();
  const data = Buffer.from(buffer).toString("base64");
  return { data, mimeType };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomImage, roomMimeType, products } = body as {
      roomImage: string;
      roomMimeType: string;
      products: ProductRef[];
    };

    const apiKey = process.env.GEMINI_API_KEY || "";

    // Log what we received for debugging
    const effectiveRoomMime = (roomMimeType || "image/jpeg").split(";")[0].trim();
    console.log("[edit-room] roomMimeType received:", roomMimeType, "→ using:", effectiveRoomMime);
    console.log("[edit-room] products:", products.map(p => p.name));

    if (!effectiveRoomMime.startsWith("image/")) {
      return NextResponse.json({ error: `Invalid room mime type: ${roomMimeType}` }, { status: 400 });
    }

    // Fetch all product images as base64
    const productImages = await Promise.all(
      products.map(async (p) => {
        try {
          const img = await urlToBase64(p.imageUrl);
          console.log("[edit-room] fetched product image:", p.name, img.mimeType);
          return img;
        } catch (e) {
          console.warn("[edit-room] skipping product image:", p.name, String(e));
          return null;
        }
      })
    );

    const itemNames = products.map((p) => p.name).join(", ");

    // Build parts: room image + each product image + instruction
    const parts: object[] = [
      {
        text: `You are an expert interior design photo editor. Your task is to edit the provided room photo by placing the specific items shown in the reference images into the scene.

CRITICAL INSTRUCTIONS:
1. You MUST include EVERY SINGLE ITEM provided in the reference images. Do not omit any.
2. The items MUST look IDENTICAL to the reference images — do not change their brand, color, texture, or design features.
3. Place items in logical, professional interior design positions:
   - Rugs: flat on the floor, under furniture where appropriate.
   - Art/Mirrors: centered on walls at eye level.
   - Lamps: on the floor or side tables.
   - Plants: in corners or on surfaces.
4. Match the room's existing lighting EXACTLY (color temperature, shadows, highlights).
5. Scale each item realistically relative to the room's architecture.
6. The final output must be a single, cohesive, high-quality image of the room with these items naturally integrated. Do not include any text, UI elements, or watermark.`,
      },
      {
        inline_data: {
          mime_type: effectiveRoomMime,
          data: roomImage,
        },
      },
    ];

    // Add each product image as reference
    for (let i = 0; i < products.length; i++) {
      const img = productImages[i];
      if (img) {
        parts.push({ text: `Reference item ${i + 1}: ${products[i].name}` });
        parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } });
      }
    }

    parts.push({
      text: "Now generate the edited room photo with these items placed in it.",
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Edit room error:", err);
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();

    // Log full response for debugging
    const responseParts = data?.candidates?.[0]?.content?.parts ?? [];
    console.log("[edit-room] response parts count:", responseParts.length);
    responseParts.forEach((p: Record<string, unknown>, i: number) => {
      if (p.inline_data) {
        console.log(`[edit-room] part ${i}: inline_data mime=${(p.inline_data as Record<string,string>).mime_type}, dataLen=${((p.inline_data as Record<string,string>).data || "").length}`);
      } else if (p.text) {
        console.log(`[edit-room] part ${i}: text="${String(p.text).slice(0, 100)}"`);
      } else {
        console.log(`[edit-room] part ${i}: keys=${Object.keys(p).join(",")}`);
      }
    });

    // Find the image part — API returns camelCase inlineData, not snake_case inline_data
    type InlineDataPart = { inlineData?: { mimeType: string; data: string }; inline_data?: { mime_type: string; data: string } };
    const imagePart = responseParts.find(
      (p: InlineDataPart) => p.inlineData?.data || p.inline_data?.data
    ) as InlineDataPart | undefined;

    const imageData = imagePart?.inlineData ?? imagePart?.inline_data;
    const imageMime = imagePart?.inlineData?.mimeType ?? imagePart?.inline_data?.mime_type;

    if (!imageData?.data) {
      const textPart = responseParts.find((p: { text?: string }) => p.text);
      return NextResponse.json(
        { error: "No image returned from model", modelText: textPart?.text },
        { status: 422 }
      );
    }

    return NextResponse.json({
      editedImageBase64: imageData.data,
      mimeType: imageMime || "image/jpeg",
    });
  } catch (err) {
    console.error("Edit room route error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
