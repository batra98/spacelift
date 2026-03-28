import { NextResponse } from "next/server";

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl: string;
  placementImage: string; // styled room shown when product is "placed"
  tags: string[];
  rating: number;
  brand: string;
}

const PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Edison Arc Floor Lamp",
    price: 89,
    category: "lighting",
    imageUrl: "/products/lamp.png",
    placementImage: "/products/lamp.png",
    tags: ["lamp", "lighting", "floor lamp", "warm light", "cozy"],
    rating: 4.8,
    brand: "Lumino",
  },
  {
    id: "p2",
    name: "Jute Woven Area Rug 5x8",
    price: 145,
    category: "rugs",
    imageUrl: "/products/rug.png",
    placementImage: "/products/rug.png",
    tags: ["rug", "carpet", "floor", "texture", "natural"],
    rating: 4.6,
    brand: "Terrain",
  },
  {
    id: "p3",
    name: "Abstract Canvas Wall Art",
    price: 55,
    category: "wall art",
    imageUrl: "/products/canvas.png",
    placementImage: "/products/canvas.png",
    tags: ["art", "wall", "painting", "decor", "canvas", "abstract"],
    rating: 4.7,
    brand: "ArtHaus",
  },
  {
    id: "p4",
    name: "Velvet Accent Chair",
    price: 299,
    category: "seating",
    imageUrl: "/products/chair.png",
    placementImage: "/products/chair.png",
    tags: ["chair", "seating", "velvet", "accent", "living room"],
    rating: 4.9,
    brand: "Plush & Co",
  },
  {
    id: "p5",
    name: "Ceramic Vase Set (3pc)",
    price: 42,
    category: "decor",
    imageUrl: "/products/vase.png",
    placementImage: "/products/vase.png",
    tags: ["vase", "ceramic", "decor", "plants", "minimalist"],
    rating: 4.5,
    brand: "Vessel Studio",
  },
  {
    id: "p6",
    name: "Linen Throw Blanket",
    price: 68,
    category: "textiles",
    imageUrl: "/products/blanket.png",
    placementImage: "/products/blanket.png",
    tags: ["blanket", "throw", "cozy", "linen", "sofa"],
    rating: 4.7,
    brand: "Weave",
  },
  {
    id: "p7",
    name: "Mid-Century Side Table",
    price: 175,
    category: "furniture",
    imageUrl: "/products/table.png",
    placementImage: "/products/table.png",
    tags: ["table", "side table", "furniture", "wood", "mid-century"],
    rating: 4.6,
    brand: "Nordic Form",
  },
  {
    id: "p8",
    name: "Geometric Mirror 24\"",
    price: 110,
    category: "mirrors",
    imageUrl: "/products/mirror.png",
    placementImage: "/products/mirror.png",
    tags: ["mirror", "wall", "geometric", "reflection", "decor"],
    rating: 4.8,
    brand: "Reflect",
  },
  {
    id: "p9",
    name: "Bamboo Bookshelf 5-Tier",
    price: 138,
    category: "storage",
    imageUrl: "/products/shelf.png",
    placementImage: "/products/shelf.png",
    tags: ["shelf", "bookshelf", "storage", "bamboo", "organization"],
    rating: 4.4,
    brand: "Grove",
  },
  {
    id: "p10",
    name: "Macramé Wall Hanging",
    price: 38,
    category: "wall art",
    imageUrl: "/products/macrame.png",
    placementImage: "/products/macrame.png",
    tags: ["macrame", "wall", "boho", "texture", "art", "hanging"],
    rating: 4.6,
    brand: "KnotWork",
  },
  {
    id: "p11",
    name: "Monstera Potted Plant",
    price: 35,
    category: "plants",
    imageUrl: "/products/plant.png",
    placementImage: "/products/plant.png",
    tags: ["plant", "monstera", "green", "nature", "indoor", "living"],
    rating: 4.9,
    brand: "Greenleaf",
  },
  {
    id: "p12",
    name: "Lava Stone Diffuser",
    price: 49,
    category: "decor",
    imageUrl: "/products/diffuser.png",
    placementImage: "/products/diffuser.png",
    tags: ["diffuser", "aromatherapy", "candle", "cozy", "wellness"],
    rating: 4.7,
    brand: "Aroma Lab",
  },
];



export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category")?.toLowerCase();
  const query = searchParams.get("q")?.toLowerCase();

  let results = PRODUCTS;

  if (query) {
    results = PRODUCTS.filter(
      (p) =>
        p.tags.some((t) => t.includes(query) || query.includes(t)) ||
        p.category.toLowerCase().includes(query) ||
        p.name.toLowerCase().includes(query)
    );
  } else if (category) {
    results = PRODUCTS.filter(
      (p) =>
        p.category.toLowerCase().includes(category) ||
        p.tags.some((t) => t.includes(category) || category.includes(t))
    );
  }

  return NextResponse.json(results);
}
