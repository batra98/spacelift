"use client";

import { motion } from "framer-motion";
import { ShoppingCart, Star, Check } from "lucide-react";
import type { Product } from "@/app/api/products/route";

interface ProductCardProps {
  product: Product;
  index: number;
  isSelected: boolean;
  onSelect: (product: Product) => void;
}

export default function ProductCard({ product, index, isSelected, onSelect }: ProductCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -3, scale: 1.02 }}
      className="glass-card rounded-2xl overflow-hidden cursor-pointer group relative"
      onClick={() => onSelect(product)}
      style={{
        border: isSelected
          ? "1.5px solid var(--accent-primary)"
          : "1px solid rgba(124, 58, 237, 0.15)",
        boxShadow: isSelected ? "0 0 18px rgba(124, 58, 237, 0.35)" : undefined,
      }}
    >
      {/* Selection checkbox */}
      <div
        className="absolute top-2.5 left-2.5 z-10 w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200"
        style={{
          background: isSelected
            ? "var(--accent-primary)"
            : "rgba(0,0,0,0.5)",
          border: isSelected ? "none" : "1.5px solid rgba(255,255,255,0.3)",
          backdropFilter: "blur(4px)",
        }}
      >
        {isSelected && <Check size={13} color="white" strokeWidth={3} />}
      </div>

      {/* Product Image */}
      <div className="relative h-36 overflow-hidden">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div
          className="absolute top-2.5 right-2.5 badge"
          style={{ background: "rgba(124, 58, 237, 0.85)", color: "white" }}
        >
          {product.category}
        </div>
        <div className="absolute bottom-2 right-2.5 flex items-center gap-1" style={{ color: "#fbbf24" }}>
          <Star size={10} fill="currentColor" />
          <span className="text-xs font-semibold text-white">{product.rating}</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-semibold text-sm leading-tight" style={{ color: "var(--text-primary)" }}>
          {product.name}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
          {product.brand}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="font-bold" style={{ color: "var(--accent-secondary)" }}>
            ${product.price}
          </span>
          <div
            className="text-xs font-medium px-2 py-1 rounded-full"
            style={{
              background: isSelected ? "rgba(124, 58, 237, 0.2)" : "rgba(255,255,255,0.05)",
              color: isSelected ? "var(--accent-secondary)" : "var(--text-secondary)",
            }}
          >
            {isSelected ? "Selected ✓" : "Tap to select"}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
