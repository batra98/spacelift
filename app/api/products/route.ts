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
    imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&q=80", // Clear background lamp
    placementImage: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=900&q=85",
    tags: ["lamp", "lighting", "floor lamp", "warm light", "cozy"],
    rating: 4.8,
    brand: "Lumino",
  },
  {
    id: "p2",
    name: "Jute Woven Area Rug 5x8",
    price: 145,
    category: "rugs",
    imageUrl: "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=400&q=80", // Clean rug overview
    placementImage: "https://images.unsplash.com/photo-1585412727339-54e4bae3bbf9?w=900&q=85",
    tags: ["rug", "carpet", "floor", "texture", "natural"],
    rating: 4.6,
    brand: "Terrain",
  },
  {
    id: "p3",
    name: "Abstract Canvas Wall Art",
    price: 55,
    category: "wall art",
    imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400&q=80", // Straight-on canvas
    placementImage: "https://images.unsplash.com/photo-1615529182904-14819c35db37?w=900&q=85",
    tags: ["art", "wall", "painting", "decor", "canvas", "abstract"],
    rating: 4.7,
    brand: "ArtHaus",
  },
  {
    id: "p4",
    name: "Velvet Accent Chair",
    price: 299,
    category: "seating",
    imageUrl: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&q=80", // Chair isolated
    placementImage: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=900&q=85",
    tags: ["chair", "seating", "velvet", "accent", "living room"],
    rating: 4.9,
    brand: "Plush & Co",
  },
  {
    id: "p5",
    name: "Ceramic Vase Set (3pc)",
    price: 42,
    category: "decor",
    imageUrl: "https://images.unsplash.com/photo-1581783342308-f792db8132ca?w=400&q=80", // Isolated vase
    placementImage: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=900&q=85",
    tags: ["vase", "ceramic", "decor", "plants", "minimalist"],
    rating: 4.5,
    brand: "Vessel Studio",
  },
  {
    id: "p6",
    name: "Linen Throw Blanket",
    price: 68,
    category: "textiles",
    imageUrl: "https://images.unsplash.com/photo-1580870059781-a169b3260a92?w=400&q=80", // Clean blanket
    placementImage: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900&q=85",
    tags: ["blanket", "throw", "cozy", "linen", "sofa"],
    rating: 4.7,
    brand: "Weave",
  },
  {
    id: "p7",
    name: "Mid-Century Side Table",
    price: 175,
    category: "furniture",
    imageUrl: "https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=400&q=80", // Studio wood table
    placementImage: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900&q=85",
    tags: ["table", "side table", "furniture", "wood", "mid-century"],
    rating: 4.6,
    brand: "Nordic Form",
  },
  {
    id: "p8",
    name: "Geometric Mirror 24\"",
    price: 110,
    category: "mirrors",
    imageUrl: "https://images.unsplash.com/photo-1618220048045-10a6dbdf83e0?w=400&q=80", // Isolated mirror
    placementImage: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=900&q=85",
    tags: ["mirror", "wall", "geometric", "reflection", "decor"],
    rating: 4.8,
    brand: "Reflect",
  },
  {
    id: "p9",
    name: "Bamboo Bookshelf 5-Tier",
    price: 138,
    category: "storage",
    imageUrl: "https://images.unsplash.com/photo-1594620302200-9a762244a156?w=400&q=80", // Clean shelf
    placementImage: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=900&q=85",
    tags: ["shelf", "bookshelf", "storage", "bamboo", "organization"],
    rating: 4.4,
    brand: "Grove",
  },
  {
    id: "p10",
    name: "Macramé Wall Hanging",
    price: 38,
    category: "wall art",
    imageUrl: "https://images.unsplash.com/photo-1522758971460-1d21fac9f53f?w=400&q=80", // Clean wall art
    placementImage: "https://images.unsplash.com/photo-1615529182904-14819c35db37?w=900&q=85",
    tags: ["macrame", "wall", "boho", "texture", "art", "hanging"],
    rating: 4.6,
    brand: "KnotWork",
  },
  {
    id: "p11",
    name: "Monstera Potted Plant",
    price: 35,
    category: "plants",
    imageUrl: "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=400&q=80", // Clean plant
    placementImage: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=900&q=85",
    tags: ["plant", "monstera", "green", "nature", "indoor", "living"],
    rating: 4.9,
    brand: "Greenleaf",
  },
  {
    id: "p12",
    name: "Lava Stone Diffuser",
    price: 49,
    category: "decor",
    imageUrl: "https://images.unsplash.com/photo-1602928321679-560bb453f190?w=400&q=80", // Isolated diffuser
    placementImage: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=900&q=85",
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
