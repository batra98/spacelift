"use client";

import { useRef, useCallback, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { useChat } from "@ai-sdk/react";
import { isToolUIPart, getToolName, DefaultChatTransport } from "ai";
import {
  Sparkles,
  Paperclip,
  X,
  Send,
  Bot,
  User,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl: string;
  placementImage: string;
  tags: string[];
  rating: number;
  brand: string;
}

interface ChatPaneProps {
  onProductsFound: (products: Product[]) => void;
  onRoomEdited: (base64: string, mimeType: string) => void;
  onImageUpload: (dataUrl: string) => void;
  roomImageDataUrl?: string | null; // parent pushes updated room image (e.g. after edit)
}

export interface ChatPaneRef {
  postMessage: (text: string) => void;
}

// ─── ChatPane ────────────────────────────────────────────────────────────────

const ChatPane = forwardRef<ChatPaneRef, ChatPaneProps>(function ChatPane({
  onProductsFound,
  onRoomEdited,
  onImageUpload,
  roomImageDataUrl,
}, ref) {
  const [pendingImageDataUrl, setPendingImageDataUrl] = useState<string | null>(null);
  const [roomBase64, setRoomBase64] = useState<string | null>(null);
  const [roomMime, setRoomMime] = useState("image/jpeg");
  const [inputText, setInputText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // useChat from @ai-sdk/react gives us UIMessage[] with parts
  const { messages, status, sendMessage } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isRunning = status === "streaming" || status === "submitted";

  // Sync room image whenever parent pushes an updated one (e.g. after render_design)
  useEffect(() => {
    if (!roomImageDataUrl) return;
    const [header, b64] = roomImageDataUrl.split(",");
    if (!b64) return;
    const mime = header.split(":")[1]?.split(";")[0] || "image/jpeg";
    setRoomBase64(b64);
    setRoomMime(mime);
  }, [roomImageDataUrl]);

  // Expose postMessage so parent (page.tsx) can trigger messages (e.g. from Style This Room)
  useImperativeHandle(ref, () => ({
    postMessage: (text: string) => {
      const roomContext = roomBase64
        ? `\n\n[room_image_base64:${roomBase64}|mime:${roomMime}]`
        : "";
      sendMessage({ text: text + roomContext });
    },
  }), [roomBase64, roomMime, sendMessage]);

  // Auto-scroll on new messages
  useEffect(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  }, [messages]);

  // Deduplication: only fire callbacks once per toolCallId
  const processedIds = useRef<Set<string>>(new Set());

  // Side-effects: watch tool result parts and fire callbacks
  useEffect(() => {
    // Debug: log all message parts to see what's arriving
    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      console.log("[SpaceLift] Last msg role:", last.role, "parts:", last.parts.map(p => ({ type: p.type })));
    }

    for (const msg of messages) {
      if (msg.role !== "assistant") continue;
      for (const part of msg.parts) {
        const rawPart = part as unknown as Record<string, unknown>;
        const partType = rawPart.type as string;

        // Match both static tool parts (tool-{name}) and dynamic-tool
        const isToolPart = partType.startsWith("tool-") || partType === "dynamic-tool";
        if (!isToolPart) continue;

        const toolName = partType.startsWith("tool-") ? partType.slice(5) : (rawPart.toolName as string ?? "");
        const state = rawPart.state as string;

        // Log every tool part so we can see its state
        console.log("[SpaceLift] Tool part:", toolName, "state:", state, "hasOutput:", rawPart.output !== undefined);

        // Accept all 'output' variants — AI SDK uses 'output-available' for server-executed tools
        if (state !== "output" && state !== "result" && state !== "output-available") continue;

        // Deduplicate so we don't re-fire on every re-render
        const tid = (rawPart.toolCallId as string) ?? `${msg.id}-${toolName}`;
        if (processedIds.current.has(tid)) continue;
        processedIds.current.add(tid);

        console.log("[SpaceLift] Tool result:", toolName, rawPart.output);

        if (toolName === "search_furniture") {
          const result = rawPart.output as { products?: Product[] };
          if (result?.products?.length) {
            onProductsFound(result.products);
          }
        }
        if (toolName === "render_design") {
          const result = rawPart.output as {
            editedImageBase64?: string;
            mimeType?: string;
            error?: string;
          };
          if (result?.editedImageBase64) {
            onRoomEdited(result.editedImageBase64, result.mimeType || "image/jpeg");
          }
        }
      }
    }
  }, [messages, onProductsFound, onRoomEdited]);

  // File select handler
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setPendingImageDataUrl(dataUrl);
        const parts = dataUrl.split(",");
        const b64 = parts[1];
        const mime = parts[0].split(":")[1].split(";")[0];
        setRoomBase64(b64);
        setRoomMime(mime);
        onImageUpload(dataUrl);
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [onImageUpload]
  );

  // Send handler
  const handleSend = useCallback(async () => {
    const text =
      inputText.trim() ||
      (pendingImageDataUrl ? "Roast my room and tell me how to fix it!" : "");
    if (!text && !pendingImageDataUrl) return;

    // Embed room base64 as hidden context so the agent can extract it for render_design
    const roomContext = roomBase64
      ? `\n\n[room_image_base64:${roomBase64}|mime:${roomMime}]`
      : "";

    const fullText = text + roomContext;
    console.log("[SpaceLift] Sending, hasImage:", !!roomBase64, "textLen:", fullText.length);

    await sendMessage({ text: fullText });

    setInputText("");
    setPendingImageDataUrl(null);
  }, [inputText, pendingImageDataUrl, roomBase64, roomMime, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  const renderMessageParts = (msg: (typeof messages)[0]) => {
    return msg.parts.map((part, idx) => {
      // Text part
      if (part.type === "text") {
        const displayText = (part.text ?? "")
          .replace(/\[room_image_base64:[^\]]+\]/g, "")
          .trim();
        if (!displayText) return null;
        const isAssistant = msg.role === "assistant";
        return (
          <div
            key={idx}
            className="px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
            style={{
              background: isAssistant
                ? "rgba(181, 144, 106, 0.08)"
                : "rgba(255,255,255,0.06)",
              border: isAssistant
                ? "1px solid rgba(0, 0, 0, 0.1)"
                : "1px solid rgba(255,255,255,0.06)",
              color: "var(--text-primary)",
              borderRadius: isAssistant
                ? "4px 18px 18px 18px"
                : "18px 4px 18px 18px",
            }}
          >
            {displayText}
          </div>
        );
      }

      // Tool part — direct type check (bypasses isToolUIPart generic issues)
      {
        const rawP = part as unknown as Record<string, unknown>;
        const pType = rawP.type as string;
        if (pType.startsWith("tool-") || pType === "dynamic-tool") {
          const toolPartName = pType.startsWith("tool-") ? pType.slice(5) : (rawP.toolName as string ?? "");
          const pState = rawP.state as string;
          const isDone = pState === "output" || pState === "result" || pState === "output-available";
          const isError = isDone && (rawP.output as { error?: string })?.error;

          if (toolPartName === "search_furniture") {
            const input = rawP.input as Record<string, unknown> | undefined;
            const queries = (input?.queries as string[] | undefined) ?? [];
            return (
              <div
                key={idx}
                className="flex items-center gap-2 text-xs py-2 px-3 rounded-xl"
                style={{
                  background: "rgba(124,58,237,0.1)",
                  border: "1px solid rgba(124,58,237,0.2)",
                  color: "var(--text-secondary)",
                }}
              >
                {!isDone ? (
                  <>
                    <Loader2 size={12} className="spinner" />
                    Searching for: {queries.join(", ")}…
                  </>
                ) : (
                  <>✓ Found items for: {queries.join(", ")}</>
                )}
              </div>
            );
          }

          if (toolPartName === "render_design") {
            const errResult = isDone ? (rawP.output as { error?: string; message?: string }) : null;
            return (
              <div
                key={idx}
                className="flex items-center gap-2 text-xs py-2 px-3 rounded-xl"
                style={
                  isError
                    ? { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }
                    : !isDone
                      ? { background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", color: "var(--text-secondary)" }
                      : { background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#86efac" }
                }
              >
                {!isDone && <Loader2 size={12} className="spinner" />}
                {!isDone
                  ? "Rendering your redesigned room…"
                  : isError
                    ? errResult?.message || "Render failed"
                    : "✓ Room rendered!"}
              </div>
            );
          }

          return null;
        }
      }

      return null;
    });
  };

  const visibleMessages = messages.filter((m) => m.role !== "system");

  return (
    <div
      className="flex flex-col h-full rounded-3xl glass-card overflow-hidden"
      style={{ border: "1px solid var(--border-card)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-card)" }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center pulse-glow"
          style={{ background: "linear-gradient(135deg, #1C1C1E, #2c2c2e)" }}
        >
          <Sparkles size={16} style={{ color: "white" }} />
        </div>
        <div>
          <h1
            className="font-bold text-sm"
            style={{ color: "var(--text-primary)" }}
          >
            SpaceLift AI
          </h1>
          <p className="text-xs" style={{ color: "var(--accent-secondary)" }}>
            ● Online
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 min-h-0">
        {/* Welcome message when empty */}
        {visibleMessages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2.5"
          >
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-1"
              style={{
                background: "linear-gradient(135deg, #1C1C1E, #2c2c2e)",
              }}
            >
              <Bot size={13} style={{ color: "white" }} />
            </div>
            <div
              className="px-4 py-3 rounded-2xl text-sm leading-relaxed max-w-[80%]"
              style={{
                background: "rgba(181, 144, 106, 0.08)",
                border: "1px solid rgba(0, 0, 0, 0.1)",
                color: "var(--text-primary)",
                borderRadius: "4px 18px 18px 18px",
              }}
            >
              Hey! I&apos;m SpaceLift ✨ Upload a photo of your room and I&apos;ll give
              you my brutally honest design take — plus a shopping list and a
              render of the new look.
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {visibleMessages.map((msg, msgIdx) => {
            const isAssistant = msg.role === "assistant";
            return (
              <motion.div
                key={msg.id ?? msgIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex gap-2.5 ${isAssistant ? "flex-row" : "flex-row-reverse"
                  }`}
              >
                {/* Avatar */}
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-1"
                  style={{
                    background: isAssistant
                      ? "linear-gradient(135deg, #1C1C1E, #2c2c2e)"
                      : "rgba(255,255,255,0.08)",
                  }}
                >
                  {isAssistant ? (
                    <Bot size={13} style={{ color: "white" }} />
                  ) : (
                    <User size={13} style={{ color: "var(--text-secondary)" }} />
                  )}
                </div>

                {/* Parts */}
                <div className="max-w-[82%] space-y-2">
                  {renderMessageParts(msg)}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {isRunning && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-2.5"
            >
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #1C1C1E, #2c2c2e)",
                }}
              >
                <Bot size={13} style={{ color: "white" }} />
              </div>
              <div
                className="px-4 py-3 rounded-2xl flex items-center gap-2"
                style={{
                  background: "rgba(181, 144, 106, 0.08)",
                  border: "1px solid rgba(0, 0, 0, 0.1)",
                  borderRadius: "4px 18px 18px 18px",
                }}
              >
                <Loader2
                  size={14}
                  className="spinner"
                  style={{ color: "var(--accent-secondary)" }}
                />
                <span
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Thinking…
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Pending image preview */}
      <AnimatePresence>
        {pendingImageDataUrl && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-2 flex-shrink-0"
          >
            <div className="relative inline-block">
              <img
                src={pendingImageDataUrl}
                alt="Preview"
                className="h-16 w-24 object-cover rounded-xl"
                style={{ border: "1px solid var(--accent-primary)" }}
              />
              <button
                onClick={() => setPendingImageDataUrl(null)}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <X size={10} style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="px-5 pb-5 flex-shrink-0">
        <div
          className="flex items-end gap-2 rounded-2xl px-4 py-3"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
            style={{
              background: pendingImageDataUrl
                ? "rgba(0, 0, 0, 0.08)"
                : "rgba(255,255,255,0.06)",
              color: pendingImageDataUrl
                ? "var(--accent-secondary)"
                : "var(--text-secondary)",
            }}
          >
            <Paperclip size={15} />
          </button>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              pendingImageDataUrl
                ? "Ask me to roast your room…"
                : "Upload a photo to get started…"
            }
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm py-1.5 focus:outline-none"
            style={{ color: "var(--text-primary)", maxHeight: "120px" }}
          />

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={isRunning || (!inputText.trim() && !pendingImageDataUrl)}
            className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isRunning || (!inputText.trim() && !pendingImageDataUrl)
                ? "opacity-30"
                : "btn-glow hover:scale-110"
              }`}
            style={{ background: "linear-gradient(135deg, #1C1C1E, #2c2c2e)" }}
          >
            <Send size={14} style={{ color: "white" }} />
          </motion.button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    </div>
  );
}

);

export default ChatPane;
