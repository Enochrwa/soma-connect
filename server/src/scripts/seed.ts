import "dotenv/config";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import crypto from "crypto";
import { connectDB } from "../db.js";
import { User } from "../models/User.js";
import { Seller } from "../models/Seller.js";
import { Product } from "../models/Product.js";
import { Review } from "../models/Review.js";
import { slugify } from "../utils/slug.js";
import mongoose from "mongoose";

const SECTORS = ["Kimironko", "Remera", "Kacyiru", "Nyamirambo", "Gikondo", "Kibagabaga"];
const CATEGORIES = [
  "Electronics",
  "Fashion",
  "Food",
  "Health",
  "Home",
  "Agriculture",
  "Beauty",
  "Books",
  "Services",
];

const SELLERS = [
  { name: "Kigali Tech Hub", category: "Electronics", sector: "Remera" },
  { name: "Imigongo Fashion", category: "Fashion", sector: "Nyamirambo" },
  { name: "Musanze Coffee Co", category: "Food", sector: "Kacyiru" },
  { name: "Akagera Naturals", category: "Beauty", sector: "Kimironko" },
  { name: "Rwanda Reads", category: "Books", sector: "Kibagabaga" },
  { name: "Hillside Farm Fresh", category: "Agriculture", sector: "Gikondo" },
];

const PRODUCTS_BY_CATEGORY: Record<
  string,
  Array<{ title: string; price: number; description: string }>
> = {
  Electronics: [
    {
      title: "Samsung Galaxy A54 5G",
      price: 480_000,
      description: "6.4-inch Super AMOLED, 128GB, 8GB RAM. Includes 1-year warranty in Kigali.",
    },
    {
      title: "Anker PowerCore 20K",
      price: 38_000,
      description: "Fast-charge portable battery — survives a Kigali load-shed.",
    },
    {
      title: "Wireless Bluetooth Earbuds",
      price: 22_000,
      description: "8-hour battery, IPX5 sweat-proof.",
    },
    {
      title: "HP 15 Laptop, i5 11th Gen",
      price: 850_000,
      description: "8GB RAM, 512GB SSD, ideal for students at UR.",
    },
  ],
  Fashion: [
    {
      title: "Imigongo-print Kitenge Dress",
      price: 28_000,
      description: "Hand-tailored in Nyamirambo. Sizes S–XL.",
    },
    { title: "Men's Linen Shirt", price: 19_500, description: "Breathable for Kigali afternoons." },
    {
      title: "Leather Sandals (Made in RW)",
      price: 24_000,
      description: "Locally sourced cowhide.",
    },
    { title: "Embroidered Headwrap", price: 8_500, description: "Three-pack, assorted patterns." },
  ],
  Food: [
    {
      title: "Rwanda Bourbon Coffee 250g",
      price: 6_500,
      description: "Single-origin from Musanze. Whole bean or ground.",
    },
    {
      title: "Akabanga Chili Oil 25ml",
      price: 2_000,
      description: "The legendary Rwandan hot sauce.",
    },
    {
      title: "Honey from Nyungwe — 500g",
      price: 7_800,
      description: "Raw, unfiltered, forest-harvested.",
    },
    { title: "Cassava Flour — 5kg", price: 4_200, description: "Stone-ground, organic." },
  ],
  Beauty: [
    {
      title: "Shea Butter Body Cream 200ml",
      price: 9_500,
      description: "Cold-pressed, unscented.",
    },
    { title: "Black Soap Bar", price: 3_500, description: "Traditional African black soap." },
  ],
  Agriculture: [
    {
      title: "Avocado Sapling (Hass)",
      price: 5_000,
      description: "12-month-old grafted sapling, ready to plant.",
    },
    {
      title: "Drip Irrigation Kit — Small Farm",
      price: 145_000,
      description: "Covers up to 0.25 ha.",
    },
  ],
  Home: [
    {
      title: "Handwoven Agaseke Basket",
      price: 14_000,
      description: "Traditional peace basket, gift-ready.",
    },
    {
      title: "Solar LED Lamp",
      price: 18_500,
      description: "Charges in 6 hours of sun, lasts all night.",
    },
  ],
  Health: [
    {
      title: "First Aid Kit — Family",
      price: 22_000,
      description: "32-piece kit, MoH-approved contents.",
    },
  ],
  Books: [
    {
      title: "Things Fall Apart — Chinua Achebe",
      price: 7_000,
      description: "Paperback, English.",
    },
  ],
  Services: [
    {
      title: "Same-day Phone Screen Repair",
      price: 35_000,
      description: "Most Samsung & iPhone models, 30-min turnaround.",
    },
  ],
};

const PLACEHOLDER_IMG = (label: string) =>
  `https://placehold.co/800x800/0A2E1F/F5A623?text=${encodeURIComponent(label)}`;

async function main() {
  await connectDB();
  console.log("[seed] wiping collections…");
  await Promise.all([
    User.deleteMany({}),
    Seller.deleteMany({}),
    Product.deleteMany({}),
    Review.deleteMany({}),
  ]);

  // Generate secure random passwords — printed once and never stored in source
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? crypto.randomBytes(12).toString("hex");
  const buyerPassword = process.env.SEED_BUYER_PASSWORD ?? crypto.randomBytes(12).toString("hex");

  const adminHash = await bcrypt.hash(adminPassword, 10);
  await User.create({
    phone: "+250 788 000 001",
    email: "admin@somamarket.rw",
    passwordHash: adminHash,
    role: "admin",
    profile: { name: "SOMA Admin" },
    referralCode: "ADMIN001",
  });

  const buyerHash = await bcrypt.hash(buyerPassword, 10);
  await User.create({
    phone: "+250 788 000 002",
    email: "buyer@somamarket.rw",
    passwordHash: buyerHash,
    role: "buyer",
    profile: { name: "Demo Buyer" },
    referralCode: "BUYER001",
  });

  console.log("[seed] creating sellers + products…");
  let total = 0;
  for (const s of SELLERS) {
    const sellerUserHash = await bcrypt.hash("seller1234", 10);
    const sellerUser = await User.create({
      phone: `+250 788 1${String(Math.floor(Math.random() * 100000)).padStart(5, "0")}`,
      email: `${slugify(s.name)}@somamarket.rw`,
      passwordHash: sellerUserHash,
      role: "seller",
      profile: { name: s.name + " Owner" },
      referralCode: nanoid(8).toUpperCase(),
    });
    const seller = await Seller.create({
      userId: sellerUser._id,
      storeName: s.name,
      storeSlug: slugify(s.name),
      description: `${s.name} — proudly based in ${s.sector}, Kigali.`,
      accountType: "business",
      location: { sector: s.sector, district: "Gasabo" },
      verificationTier: "verified",
      approvalStatus: "approved", // seed sellers are pre-approved
      isActive: true,
      rating: 4.4 + Math.random() * 0.5,
      ratingCount: 20 + Math.floor(Math.random() * 200),
      totalSales: 50 + Math.floor(Math.random() * 500),
      logo: PLACEHOLDER_IMG(s.name[0]),
      banner: PLACEHOLDER_IMG(s.name),
    });

    const items = PRODUCTS_BY_CATEGORY[s.category] ?? [];
    for (const item of items) {
      const isFlash = Math.random() < 0.2;
      await Product.create({
        sellerId: seller._id,
        title: item.title,
        slug: `${slugify(item.title)}-${nanoid(4)}`,
        description: item.description,
        category: s.category,
        price: item.price,
        comparePrice: isFlash ? Math.round(item.price * 1.2) : undefined,
        images: [
          PLACEHOLDER_IMG(item.title.slice(0, 12)),
          PLACEHOLDER_IMG(item.title.slice(0, 8) + " 2"),
        ],
        stock: 5 + Math.floor(Math.random() * 50),
        tags: [s.category.toLowerCase(), s.sector.toLowerCase()],
        avgRating: 4 + Math.random(),
        reviewCount: Math.floor(Math.random() * 80),
        salesCount: Math.floor(Math.random() * 200),
        flashSale: isFlash
          ? {
              isActive: true,
              endsAt: new Date(Date.now() + (2 + Math.floor(Math.random() * 22)) * 60 * 60 * 1000),
              discountPct: 15 + Math.floor(Math.random() * 20),
            }
          : undefined,
      });
      total += 1;
    }
  }

  // Ensure text search index exists (required for $text queries)
  try {
    await Product.collection.createIndex(
      { title: "text", description: "text", tags: "text" },
      { weights: { title: 10, tags: 5, description: 1 }, name: "product_text_search" },
    );
    console.log("[seed] text index ensured on products");
  } catch (e) {
    console.warn("[seed] text index already exists or failed:", (e as Error).message);
  }

  console.log(`[seed] done. ${total} products, ${SELLERS.length} sellers.`);
  console.log(`\n========== SEED CREDENTIALS (save these now) ==========`);
  console.log(`[seed] admin  → email admin@somamarket.rw  | pw: ${adminPassword}`);
  console.log(`[seed] buyer  → email buyer@somamarket.rw  | pw: ${buyerPassword}`);
  console.log(`[seed] seller → email kigali-tech-hub@somamarket.rw | pw: seller1234`);
  console.log(`=======================================================\n`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[seed:fatal]", err);
  process.exit(1);
});

// keep CATEGORIES/SECTORS referenced for future use
void CATEGORIES;
void SECTORS;
