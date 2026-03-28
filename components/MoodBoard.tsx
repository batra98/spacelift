"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ShoppingBag, Wand2, ChevronDown, ChevronUp, CopyPlus } from "lucide-react";
import ProductCard from "./ProductCard";
import type { Product } from "@/app/api/products/route";

interface MoodBoardProps {
  products: Product[];
  isLoading: boolean;
  selectedIds: Set<string>;
  isApplying: boolean;
  showSaveToGallery?: boolean;
  onSelect: (product: Product) => void;
  onApply: () => void;
  onSaveToGallery?: () => void;
}

export default function MoodBoard({
  products,
  isLoading,
  selectedIds,
  isApplying,
  showSaveToGallery,
  onSelect,
  onApply,
  onSaveToGallery,
}: MoodBoardProps) {
  const selectedCount = (selectedIds ?? new Set()).size;
  const safeSelectedIds = selectedIds ?? new Set<string>();

  // Group products by category
  const categories = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    products.forEach((p) => {
      const cat = p.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return Object.entries(groups).map(([name, items]) => ({ name, items }));
  }, [products]);

  // Keep track of which categories are expanded. Default first one to open.
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(categories[0] ? [categories[0].name] : []));

  const toggleCategory = (name: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div
      className="flex flex-col h-full rounded-3xl glass-card overflow-hidden"
      style={{ border: "1px solid var(--border-card)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-card)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(124, 58, 237, 0.2)" }}
          >
            <ShoppingBag size={16} style={{ color: "var(--accent-secondary)" }} />
          </div>
          <div>
            <h2 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
              Mood Board
            </h2>
            {products.length > 0 && (
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {selectedCount > 0
                  ? `${selectedCount} item${selectedCount > 1 ? "s" : ""} selected`
                  : `${products.length} items — tap to select`}
              </p>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showSaveToGallery && onSaveToGallery && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSaveToGallery}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl"
              style={{
                background: "rgba(124, 58, 237, 0.15)",
                border: "1px solid rgba(124, 58, 237, 0.3)",
                color: "var(--accent-secondary)",
              }}
            >
              <CopyPlus size={14} />
              Save to Gallery
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-2 hide-scrollbar">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                className="rounded-2xl h-48"
                style={{ background: "var(--bg-card)" }}
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(124, 58, 237, 0.1)" }}
            >
              <Sparkles size={24} style={{ color: "var(--accent-primary)" }} />
            </motion.div>
            <div className="text-center">
              <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                Your mood board is empty
              </p>
              <p className="text-xs mt-1 max-w-[180px]" style={{ color: "var(--text-secondary)" }}>
                Upload a room photo and chat to get curated product picks
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {categories.map(({ name, items }, idx) => {
              // Auto-expand first category if expandedCats is empty (initial load)
              const isExpanded = expandedCats.size === 0 ? idx === 0 : expandedCats.has(name);
              return (
                <div key={name} className="flex flex-col gap-2">
                  <button
                    onClick={() => toggleCategory(name)}
                    className="flex justify-between items-center w-full px-2 py-1 text-sm font-bold text-white/80 hover:text-white transition-colors"
                  >
                    <span className="capitalize">{name} <span className="text-white/40 text-xs ml-1">({items.length})</span></span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-3 pb-2 pt-1">
                          {items.map((product, i) => (
                            <ProductCard
                              key={product.id}
                              product={product}
                              index={i}
                              isSelected={safeSelectedIds.has(product.id)}
                              onSelect={onSelect}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Apply to Room sticky footer */}
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex-shrink-0 p-4 pt-3"
            style={{ borderTop: "1px solid var(--border-card)", background: "var(--glass-bg)" }}
          >
            {/* Selected thumbnails strip */}
            <div className="flex gap-2 mb-3 overflow-x-auto hide-scrollbar pb-1">
              {products
                .filter((p) => selectedIds.has(p.id))
                .map((p) => (
                  <div key={p.id} className="relative flex-shrink-0">
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-10 h-10 rounded-xl object-cover"
                      style={{ border: "1.5px solid var(--accent-primary)" }}
                    />
                  </div>
                ))}
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onApply}
              disabled={isApplying}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm btn-glow"
              style={{
                color: "white",
                opacity: isApplying ? 0.7 : 1,
              }}
            >
              {isApplying ? (
                <>
                  <div
                    className="w-4 h-4 rounded-full border-2 spinner"
                    style={{ borderColor: "white", borderTopColor: "transparent" }}
                  />
                  Styling your room...
                </>
              ) : (
                <>
                  <Wand2 size={16} />
                  Style My Room ({selectedCount} item{selectedCount > 1 ? "s" : ""})
                </>
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
