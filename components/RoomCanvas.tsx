"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon, Sparkles } from "lucide-react";
import { useRef, useState, useCallback } from "react";
import type { Product } from "@/app/api/products/route";

interface RoomCanvasProps {
  imageUrl: string | null;
  isPlacing: boolean;
  isApplying: boolean;
  selectedProduct: Product | null;
  editedImageUrl: string | null;
}

export default function RoomCanvas({
  imageUrl,
  isPlacing,
  isApplying,
  selectedProduct,
  editedImageUrl,
}: RoomCanvasProps) {
  const [sliderX, setSliderX] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateSlider = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setSliderX(pct);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) updateSlider(e.clientX);
    },
    [isDragging, updateSlider]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isDragging) updateSlider(e.touches[0].clientX);
    },
    [isDragging, updateSlider]
  );

  const showSlider = imageUrl && editedImageUrl;

  return (
    <div
      ref={containerRef}
      className="relative rounded-3xl overflow-hidden select-none"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-card)",
        minHeight: "280px",
        cursor: showSlider ? (isDragging ? "ew-resize" : "col-resize") : "default",
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => setIsDragging(false)}
    >
      <AnimatePresence mode="wait">
        {!imageUrl ? (
          /* Empty state */
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center h-72 gap-4"
            style={{ color: "var(--text-secondary)" }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center pulse-glow"
              style={{ background: "rgba(181, 144, 106, 0.10)" }}
            >
              <ImageIcon size={28} style={{ color: "var(--accent-primary)" }} />
            </div>
            <div className="text-center">
              <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                Upload a room photo
              </p>
              <p className="text-sm mt-1">Your AI design session starts here</p>
            </div>
          </motion.div>
        ) : showSlider ? (
          /* Before / After slider */
          <motion.div
            key="slider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative w-full"
          >
            {/* After (edited) — full width underneath */}
            <img
              src={`data:image/jpeg;base64,${editedImageUrl}`}
              alt="Styled room"
              className="w-full object-cover"
              style={{ maxHeight: "500px", display: "block" }}
            />

            {/* Before (original) clipped on left */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderX}%` }}
            >
              <img
                src={imageUrl}
                alt="Original room"
                className="w-full object-cover"
                style={{
                  maxHeight: "500px",
                  width: containerRef.current?.offsetWidth
                    ? `${containerRef.current.offsetWidth}px`
                    : "100%",
                }}
              />
            </div>

            {/* Slider handle */}
            <div
              className="absolute top-0 bottom-0 flex items-center justify-center z-10"
              style={{ left: `${sliderX}%`, transform: "translateX(-50%)", width: "2px" }}
              onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
              onTouchStart={() => setIsDragging(true)}
            >
              <div
                className="absolute inset-0"
                style={{ background: "rgba(255,255,255,0.6)" }}
              />
              <div
                className="relative w-9 h-9 rounded-full flex items-center justify-center z-20 cursor-ew-resize"
                style={{
                  background: "var(--accent-primary)",
                  boxShadow: "0 0 16px rgba(124,58,237,0.6)",
                  border: "2px solid white",
                }}
              >
                <span className="text-white text-xs font-bold select-none">↔</span>
              </div>
            </div>

            {/* Labels */}
            <div className="absolute top-3 left-3">
              <span className="badge" style={{ background: "rgba(0,0,0,0.6)", color: "white" }}>
                Before
              </span>
            </div>
            <div className="absolute top-3 right-3">
              <span className="badge" style={{ background: "rgba(124,58,237,0.8)", color: "white" }}>
                After ✨
              </span>
            </div>
          </motion.div>
        ) : (
          /* Single room image */
          <motion.div
            key={imageUrl}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <img
              src={imageUrl}
              alt="Your room"
              className="w-full object-cover"
              style={{ maxHeight: "500px" }}
            />
            {selectedProduct && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{
                  background: "rgba(22, 22, 42, 0.9)",
                  border: "1px solid var(--accent-primary)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <Sparkles size={14} style={{ color: "var(--accent-secondary)" }} />
                <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                  Select items → Style My Room
                </span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Applying overlay */}
      <AnimatePresence>
        {(isPlacing || isApplying) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-3xl"
            style={{ background: "rgba(10, 10, 20, 0.88)", backdropFilter: "blur(8px)" }}
          >
            <div
              className="w-16 h-16 rounded-full border-2 spinner"
              style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }}
            />
            <div className="text-center">
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                {isApplying ? "AI is styling your room..." : "Placing item..."}
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                {isApplying ? "This takes 10–20 seconds" : "AI rendering in progress"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
