import { Schema, model, type InferSchemaType } from "mongoose";

const VariantSchema = new Schema(
  {
    name: String,
    options: [String],
    priceDelta: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    sku: String,
  },
  { _id: true },
);

const ProductSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "Seller", required: true, index: true },
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: "" },
    category: { type: String, required: true, index: true },
    subcategory: String,
    tags: [String],
    price: { type: Number, required: true },
    comparePrice: Number,
    currency: { type: String, default: "RWF" },
    images: [String],
    videos: [String],
    variants: [VariantSchema],
    stock: { type: Number, default: 0 },
    condition: { type: String, enum: ["new", "used"], default: "new" },
    avgRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    salesCount: { type: Number, default: 0 },
    flashSale: {
      isActive: { type: Boolean, default: false },
      endsAt: Date,
      discountPct: Number,
    },
    isActive: { type: Boolean, default: true },
    embedding: { type: [Number], default: undefined }, // semantic search vector
  },
  { timestamps: true },
);

ProductSchema.index({ title: "text", description: "text", tags: "text" });
ProductSchema.index({ category: 1, price: 1 });

export type ProductDoc = InferSchemaType<typeof ProductSchema> & { _id: string };
export const Product = model("Product", ProductSchema);
