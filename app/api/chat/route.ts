import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, zodSchema, stepCountIs } from "ai";
import type { ModelMessage } from "ai";
import { tool } from "ai";
import { Ratelimit } from "@unkey/ratelimit";
import { z } from "zod";
import { NextRequest } from "next/server";

export const maxDuration = 60;

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

// Unkey ratelimiter for render_design — 5 renders/hour/IP
const ratelimit = process.env.UNKEY_ROOT_KEY
  ? new Ratelimit({
      rootKey: process.env.UNKEY_ROOT_KEY,
      namespace: "spacelift.render",
      limit: 5,
      duration: "1h",
    })
  : null;

const searchFurnitureSchema = z.object({
  queries: z
    .array(z.string())
    .describe(
      "2-4 natural language style queries, e.g. ['mid-century floor lamp', 'jute area rug']"
    ),
});

const renderDesignSchema = z.object({
  productIds: z
    .array(z.string())
    .describe("Array of product IDs to place in the room."),
  roomImageBase64: z
    .string()
    .describe(
      "Base64-encoded room image (without data: prefix) from the user's upload."
    ),
  roomMimeType: z
    .string()
    .default("image/jpeg")
    .describe("MIME type of the room image."),
});

type SearchInput = z.infer<typeof searchFurnitureSchema>;
type RenderInput = z.infer<typeof renderDesignSchema>;

type ProductItem = {
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl: string;
  tags: string[];
  rating: number;
  brand: string;
};

export async function POST(req: NextRequest) {
  const { messages: uiMessages } = await req.json();

  // Safely convert UIMessage[] → ModelMessage[] without crashing on unknown part types
  type UIPart = {
    type: string;
    text?: string;
    toolCallId?: string;
    toolName?: string;
    input?: unknown;
    output?: unknown;
  };
  type UIMsg = { role: string; parts?: UIPart[] };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: ModelMessage[] = (uiMessages as UIMsg[]).flatMap((msg): any[] => {
    if (msg.role === "user") {
      const rawText = (msg.parts ?? [])
        .filter((p) => p.type === "text")
        .map((p) => p.text ?? "")
        .join("\n");

      // Extract [room_image_base64:...|mime:...] annotation if present
      const imageMatch = rawText.match(/\[room_image_base64:([^|]+)\|mime:([^\]]+)\]/);
      const cleanText = rawText.replace(/\[room_image_base64:[^\]]+\]/g, "").trim();

      if (!cleanText && !imageMatch) return [];

      if (imageMatch) {
        // Build multimodal content so Gemini can SEE the room photo
        const [, b64, mime] = imageMatch;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const content: any[] = [];
        if (cleanText) content.push({ type: "text", text: cleanText });
        content.push({ type: "image", image: b64, mimeType: mime });
        return [{ role: "user", content }];
      }

      return [{ role: "user", content: cleanText }];
    }


    if (msg.role === "assistant") {
      const toolParts = (msg.parts ?? []).filter(
        (p) => p.type.startsWith("tool-") || p.type === "dynamic-tool"
      );
      const textContent = (msg.parts ?? [])
        .filter((p) => p.type === "text")
        .map((p) => ({ type: "text", text: p.text ?? "" }));

      const toolCalls = toolParts.map((p) => {
        const toolName = p.type.startsWith("tool-") ? p.type.slice(5) : (p.toolName ?? "");
        return {
          type: "tool-call",
          toolCallId: p.toolCallId ?? toolName,
          toolName,
          input: p.input ?? {},
        };
      });

      const assistantContent = [...textContent, ...toolCalls];
      if (assistantContent.length === 0) return [];

      const result: unknown[] = [{ role: "assistant", content: assistantContent }];

      // Emit tool-result messages for completed tool calls
      const completed = toolParts.filter((p) => p.output !== undefined);
      if (completed.length > 0) {
        result.push({
          role: "tool",
          content: completed.map((p) => {
            const toolName = p.type.startsWith("tool-") ? p.type.slice(5) : (p.toolName ?? "");
            return {
              type: "tool-result",
              toolCallId: p.toolCallId ?? toolName,
              toolName,
              output: p.output,
            };
          }),
        });
      }
      return result;
    }

    return [];
  });


  const userIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anonymous";

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: `You are SpaceLift, a brutally honest but charming interior design AI.
Your job is to analyze room photos, recommend furniture, and render redesigned rooms.

When a user uploads a room photo (look for [room_image_base64:...|mime:...] in their message):
1. Roast it lovingly — be witty and specific about what's wrong.
2. Call search_furniture with 2-4 specific style queries (e.g. "mid-century modern floor lamp", "boho jute rug").
3. Tell the user what you found and ask if they want you to render the room with those items.
4. When the user confirms, extract the room_image_base64 value from their earlier message and call render_design with the product IDs and that base64 image.
5. After rendering, give a short punchy review of the finished look.

If the user hasn't uploaded a photo yet, ask them to upload one first.
Keep responses concise, witty, and warm.`,
    messages,
    tools: {
      search_furniture: tool<SearchInput, { products: ProductItem[] }>({
        description:
          "Search the product catalog for furniture and decor items matching a style query.",
        inputSchema: zodSchema(searchFurnitureSchema),
        execute: async ({ queries }) => {
          const fetches = queries.map((q) =>
            fetch(
              `${baseUrl}/api/products?q=${encodeURIComponent(q)}`
            ).then((r) => r.json())
          );
          const arrays = (await Promise.all(fetches)) as ProductItem[][];
          const seen = new Set<string>();
          const all: ProductItem[] = [];
          for (const arr of arrays) {
            for (const p of arr) {
              if (!seen.has(p.id)) {
                seen.add(p.id);
                all.push(p);
              }
            }
          }
          return { products: all.slice(0, 12) };
        },
      }),

      render_design: tool<
        RenderInput,
        | { error: string; message: string }
        | { editedImageBase64: string; mimeType: string }
      >({
        description:
          "Render the room photo with selected furniture items composited in. Call this after the user confirms which products to place.",
        inputSchema: zodSchema(renderDesignSchema),
        execute: async ({ productIds, roomImageBase64, roomMimeType }) => {
          // Unkey rate limit check
          if (ratelimit) {
            const { success } = await ratelimit.limit(userIp);
            if (!success) {
              return {
                error: "rate_limited",
                message:
                  "You've used all 5 renders for this hour. Please wait before rendering again!",
              };
            }
          }

          const allProductsRes = await fetch(`${baseUrl}/api/products`);
          const allProducts = (await allProductsRes.json()) as ProductItem[];
          const selectedProducts = allProducts.filter((p) =>
            productIds.includes(p.id)
          );

          if (selectedProducts.length === 0) {
            return { error: "no_products", message: "No matching products found." };
          }

          const editRes = await fetch(`${baseUrl}/api/edit-room`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              roomImage: roomImageBase64,
              roomMimeType: roomMimeType || "image/jpeg",
              products: selectedProducts.map((p) => ({
                name: p.name,
                imageUrl: p.imageUrl,
              })),
            }),
          });

          const editData = (await editRes.json()) as {
            editedImageBase64?: string;
            mimeType?: string;
            error?: string;
          };

          if (editData.error || !editData.editedImageBase64) {
            return {
              error: "render_failed",
              message: editData.error || "Render failed — try again.",
            };
          }

          return {
            editedImageBase64: editData.editedImageBase64,
            mimeType: editData.mimeType || "image/jpeg",
          };
        },
      }),
    },
    stopWhen: stepCountIs(10),
  });

  return result.toUIMessageStreamResponse();
}
