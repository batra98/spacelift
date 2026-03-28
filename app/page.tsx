"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CopyPlus, Clock, ArrowLeft, Trash2 } from "lucide-react";
import ChatPane from "@/components/ChatPane";
import MoodBoard from "@/components/MoodBoard";
import RoomCanvas from "@/components/RoomCanvas";
import type { Product } from "@/app/api/products/route";

export interface SavedSession {
  id: string;
  date: string;
  originalImage: string;
  editedImage: string;
  products: Product[];
  totalCost: number;
}

export default function Home() {
  const [view, setView] = useState<"design" | "gallery">("design");
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<SavedSession | null>(null);

  // Design state
  const [roomImage, setRoomImage] = useState<string | null>(null);
  const [roomMimeType, setRoomMimeType] = useState("image/jpeg");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editedImageBase64, setEditedImageBase64] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Load gallery
  useEffect(() => {
    const saved = localStorage.getItem("spaceliftSessions");
    if (saved) {
      try {
        setSavedSessions(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load sessions", e);
      }
    }
  }, []);

  const saveSessionToGallery = useCallback(() => {
    if (!roomImage || !editedImageBase64 || selectedIds.size === 0) return;
    const selectedProducts = products.filter((p) => selectedIds.has(p.id));
    const totalCost = selectedProducts.reduce((sum, p) => sum + p.price, 0);

    const newSession: SavedSession = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
      originalImage: roomImage,
      editedImage: editedImageBase64,
      products: selectedProducts,
      totalCost,
    };

    const updated = [newSession, ...savedSessions];
    setSavedSessions(updated);
    localStorage.setItem("spaceliftSessions", JSON.stringify(updated));
    alert("Saved to Gallery!");
  }, [roomImage, editedImageBase64, selectedIds, products, savedSessions]);

  const deleteSession = useCallback((id: string) => {
    const updated = savedSessions.filter((s) => s.id !== id);
    setSavedSessions(updated);
    localStorage.setItem("spaceliftSessions", JSON.stringify(updated));
    if (selectedSession?.id === id) setSelectedSession(null);
  }, [savedSessions, selectedSession]);

  const handleImageUpload = useCallback((dataUrl: string) => {
    setRoomImage(dataUrl);
    setEditedImageBase64(null);
    setSelectedIds(new Set());
    setSelectedProduct(null);
    const mime = dataUrl.split(":")[1]?.split(";")[0] || "image/jpeg";
    setRoomMimeType(mime);
  }, []);

  const handleVisionResult = useCallback(
    async (result: { chat_response: string; search_queries: string[] }) => {
      if (!result.search_queries?.length) return;
      setIsLoadingProducts(true);
      setProducts([]);
      setSelectedIds(new Set());
      setEditedImageBase64(null);

      try {
        const fetches = result.search_queries.map((q) =>
          fetch(`/api/products?q=${encodeURIComponent(q)}`).then((r) => r.json())
        );
        const arrays = (await Promise.all(fetches)) as Product[][];
        const seen = new Set<string>();
        const all: Product[] = [];
        for (const arr of arrays) {
          for (const p of arr) {
            if (!seen.has(p.id)) {
              seen.add(p.id);
              all.push(p);
            }
          }
        }
        setProducts(all.slice(0, 12));
      } catch (e) {
        console.error("Failed to fetch products:", e);
      } finally {
        setIsLoadingProducts(false);
      }
    },
    []
  );

  const handleSelect = useCallback((product: Product) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(product.id)) {
        next.delete(product.id);
      } else {
        // No more 3-item limit
        next.add(product.id);
      }
      return next;
    });
    setSelectedProduct(product);
  }, []);

  const handleApply = useCallback(async () => {
    if (!roomImage || selectedIds.size === 0) return;
    const selectedProducts = products.filter((p) => selectedIds.has(p.id));
    setIsApplying(true);
    try {
      const base64 = roomImage.split(",")[1];
      const res = await fetch("/api/edit-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomImage: base64,
          roomMimeType,
          products: selectedProducts.map((p) => ({
            name: p.name,
            imageUrl: p.imageUrl,
          })),
        }),
      });
      const data = await res.json();
      if (data.editedImageBase64) {
        setEditedImageBase64(data.editedImageBase64);
      } else {
        console.error("Edit room failed:", data.error);
        alert("Room editing failed: " + (data.error || "Unknown error"));
      }
    } catch (e) {
      console.error("Apply failed:", e);
    } finally {
      setIsApplying(false);
    }
  }, [roomImage, roomMimeType, selectedIds, products]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top Bar */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between px-8 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-card)", height: "80px" }}
      >
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center pulse-glow"
              style={{ background: "linear-gradient(135deg, #7c3aed, #e040fb)" }}
            >
              <span className="text-sm font-black text-white">S</span>
            </div>
            <div>
              <span className="font-black text-lg" style={{ color: "var(--text-primary)" }}>
                Space
                <span
                  style={{
                    background: "linear-gradient(90deg, #a855f7, #e040fb)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Lift
                </span>
              </span>
              <p className="text-xs leading-none" style={{ color: "var(--text-secondary)" }}>
                AI Room Stylist
              </p>
            </div>
          </div>

          <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/5 mx-8 gap-1">
            <button
              onClick={() => setView("design")}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                view === "design" ? "bg-white/10 text-white shadow-sm" : "text-white/50 hover:text-white/80"
              }`}
            >
              Design
            </button>
            <button
              onClick={() => setView("gallery")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                view === "gallery" ? "bg-white/10 text-white shadow-sm" : "text-white/50 hover:text-white/80"
              }`}
            >
              Gallery
              {savedSessions.length > 0 && (
                <span className="bg-purple-500/30 text-purple-300 text-[10px] px-1.5 py-0.5 rounded-full">
                  {savedSessions.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="badge"
            style={{
              background: "rgba(124, 58, 237, 0.15)",
              color: "var(--accent-secondary)",
              border: "1px solid rgba(124, 58, 237, 0.3)",
            }}
          >
            Gemini 2.5 Flash + 3.1 Image
          </div>
        </div>
      </motion.header>

      {/* Main Layout */}
      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key="design"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: view === "design" ? 1 : 0, x: view === "design" ? 0 : -20 }}
            className="h-full grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_420px] gap-4 p-4 md:p-6"
            style={{ 
              display: view === "design" ? "grid" : "none",
              pointerEvents: view === "design" ? "auto" : "none" 
            }}
          >
              {/* Left: Chat + Room Canvas */}
              <div className="flex flex-col gap-4 h-full overflow-hidden">
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                >
                  <RoomCanvas
                    imageUrl={roomImage}
                    isPlacing={false}
                    isApplying={isApplying}
                    selectedProduct={selectedProduct}
                    editedImageUrl={editedImageBase64}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="flex-1 min-h-0"
                >
                  <ChatPane
                    onVisionResult={handleVisionResult}
                    onImageUpload={handleImageUpload}
                  />
                </motion.div>
              </div>

              {/* Right: Mood Board */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="h-full overflow-hidden"
              >
                <MoodBoard
                  products={products}
                  isLoading={isLoadingProducts}
                  selectedIds={selectedIds}
                  isApplying={isApplying}
                  showSaveToGallery={!!editedImageBase64}
                  onSelect={handleSelect}
                  onApply={handleApply}
                  onSaveToGallery={saveSessionToGallery}
                />
              </motion.div>
            </motion.div>

            <motion.div
              key="gallery"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: view === "gallery" ? 1 : 0, x: view === "gallery" ? 0 : 20 }}
              className="absolute inset-0 h-full w-full overflow-y-auto p-8"
              style={{ 
                display: view === "gallery" ? "block" : "none",
                pointerEvents: view === "gallery" ? "auto" : "none" 
              }}
            >
              {selectedSession ? (
                <div className="max-w-6xl mx-auto flex flex-col gap-6">
                  <button
                    onClick={() => setSelectedSession(null)}
                    className="flex items-center gap-2 text-white/50 hover:text-white w-fit transition-colors"
                  >
                    <ArrowLeft size={16} /> Back to Gallery
                  </button>
                  <div className="grid grid-cols-[1fr_320px] gap-8">
                    <div>
                      <RoomCanvas
                        imageUrl={selectedSession.originalImage}
                        editedImageUrl={selectedSession.editedImage}
                        isPlacing={false}
                        isApplying={false}
                        selectedProduct={null}
                      />
                    </div>
                    <div className="glass-card rounded-3xl p-6 h-fit border border-white/5">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-lg">Styled Room</h3>
                        <span className="text-white/50 text-sm">{selectedSession.date}</span>
                      </div>
                      <div className="space-y-4 mb-6">
                        {selectedSession.products.map(p => (
                          <div key={p.id} className="flex gap-3 items-center">
                            <img src={p.imageUrl} alt={p.name} className="w-12 h-12 rounded-lg object-cover bg-black/50" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{p.name}</p>
                              <p className="text-white/50 text-xs">{p.brand}</p>
                            </div>
                            <span className="text-purple-400 font-bold">${p.price}</span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                        <span className="text-white/70">Total Cost</span>
                        <span className="text-xl font-black text-white">${selectedSession.totalCost}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : savedSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-white/50">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                    <CopyPlus size={24} />
                  </div>
                  <p>No saved rooms yet. Style a room and hit "Save to Gallery".</p>
                </div>
              ) : (
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedSessions.map(session => (
                    <motion.div
                      key={session.id}
                      whileHover={{ y: -4 }}
                      className="glass-card rounded-2xl overflow-hidden cursor-pointer group"
                      onClick={() => setSelectedSession(session)}
                    >
                      <div className="h-48 relative">
                        <img src={`data:image/jpeg;base64,${session.editedImage}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs text-white/80">
                          <Clock size={12} /> {session.date}
                        </div>
                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur border border-white/10 px-2 py-1 rounded text-xs font-bold font-mono">
                          ${session.totalCost}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                          className="absolute top-3 left-3 bg-red-500/20 text-red-300 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/40 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="p-4 flex gap-2 overflow-x-auto hide-scrollbar">
                        {session.products.map(p => (
                          <img key={p.id} src={p.imageUrl} className="w-10 h-10 rounded-lg object-cover border border-white/10 flex-shrink-0" />
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
