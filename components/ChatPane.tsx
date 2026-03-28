"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Paperclip, Send, X, Bot, User, Loader2, Sparkles } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
}

interface ChatPaneProps {
  onVisionResult: (result: { chat_response: string; search_queries: string[] }) => void;
  onImageUpload: (dataUrl: string) => void;
}

export default function ChatPane({ onVisionResult, onImageUpload }: ChatPaneProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hey! I'm SpaceLift ✨ Upload a photo of your room and I'll give you my brutally honest design take — plus a shopping list to fix it.",
    },
  ]);
  const [input, setInput] = useState("");
  const [imageFile, setImageFile] = useState<{ dataUrl: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImageFile({ dataUrl, name: file.name });
      onImageUpload(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async () => {
    const prompt = input.trim() || "Roast my room and tell me what it needs";
    if (!prompt && !imageFile) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: prompt,
      imageUrl: imageFile?.dataUrl,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    scrollToBottom();

    try {
      // Extract base64 from data URL
      let base64: string | undefined;
      let mimeType = "image/jpeg";
      if (imageFile?.dataUrl) {
        const parts = imageFile.dataUrl.split(",");
        base64 = parts[1];
        mimeType = parts[0].split(":")[1].split(";")[0];
      }

      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType, prompt }),
      });

      const data = await res.json();

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.chat_response || "Something went wrong analyzing your room.",
      };

      setMessages((prev) => [...prev, assistantMsg]);
      onVisionResult(data);
      setImageFile(null);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Oops! Something went wrong. Check your API keys and try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  return (
    <div
      className="flex flex-col h-full rounded-3xl glass-card overflow-hidden"
      style={{ border: "1px solid var(--border-card)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-4"
        style={{ borderBottom: "1px solid var(--border-card)" }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center pulse-glow"
          style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
        >
          <Sparkles size={16} style={{ color: "white" }} />
        </div>
        <div>
          <h1 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
            SpaceLift AI
          </h1>
          <p className="text-xs" style={{ color: "var(--accent-secondary)" }}>
            ● Online
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background:
                    msg.role === "assistant"
                      ? "linear-gradient(135deg, #7c3aed, #a855f7)"
                      : "rgba(255,255,255,0.08)",
                }}
              >
                {msg.role === "assistant" ? (
                  <Bot size={13} style={{ color: "white" }} />
                ) : (
                  <User size={13} style={{ color: "var(--text-secondary)" }} />
                )}
              </div>

              {/* Bubble */}
              <div className="max-w-[80%] space-y-2">
                {msg.imageUrl && (
                  <img
                    src={msg.imageUrl}
                    alt="Uploaded room"
                    className="rounded-2xl max-h-36 object-cover"
                    style={{ border: "1px solid var(--border-subtle)" }}
                  />
                )}
                <div
                  className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                  style={{
                    background:
                      msg.role === "assistant"
                        ? "rgba(124, 58, 237, 0.12)"
                        : "rgba(255,255,255,0.06)",
                    border:
                      msg.role === "assistant"
                        ? "1px solid rgba(124, 58, 237, 0.2)"
                        : "1px solid rgba(255,255,255,0.06)",
                    color: "var(--text-primary)",
                    borderRadius:
                      msg.role === "assistant"
                        ? "4px 18px 18px 18px"
                        : "18px 4px 18px 18px",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-2.5"
            >
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
              >
                <Bot size={13} style={{ color: "white" }} />
              </div>
              <div
                className="px-4 py-3 rounded-2xl flex items-center gap-2"
                style={{
                  background: "rgba(124, 58, 237, 0.12)",
                  border: "1px solid rgba(124, 58, 237, 0.2)",
                  borderRadius: "4px 18px 18px 18px",
                }}
              >
                <Loader2 size={14} className="spinner" style={{ color: "var(--accent-secondary)" }} />
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Analyzing your room...
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Image preview */}
      <AnimatePresence>
        {imageFile && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-2"
          >
            <div className="relative inline-block">
              <img
                src={imageFile.dataUrl}
                alt="Preview"
                className="h-16 w-24 object-cover rounded-xl"
                style={{ border: "1px solid var(--accent-primary)" }}
              />
              <button
                onClick={() => setImageFile(null)}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
              >
                <X size={10} style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="px-4 pb-4">
        <div
          className="flex items-end gap-2 rounded-2xl px-3 py-2"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110"
            style={{
              background: imageFile ? "rgba(124, 58, 237, 0.25)" : "rgba(255,255,255,0.06)",
              color: imageFile ? "var(--accent-secondary)" : "var(--text-secondary)",
            }}
          >
            <Paperclip size={15} />
          </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={imageFile ? "Ask me to roast your room..." : "Upload a photo to get started..."}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm py-1.5 focus:outline-none"
            style={{
              color: "var(--text-primary)",
              maxHeight: "120px",
            }}
          />

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={isLoading || (!input.trim() && !imageFile)}
            className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
              isLoading || (!input.trim() && !imageFile) ? "opacity-30" : "btn-glow hover:scale-110"
            }`}
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
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
