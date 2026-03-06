import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  category: 'gloves' | 'pads' | 'protection' | 'apparel' | 'equipment' | 'supplements';
  price: number;
  images: string[];
  description: string;
  stock: number;
  rating: number;
  reviewCount: number;
  featured: boolean;
}

const productSchema = new Schema<IProduct>({
  name: { type: String, required: true, index: true },
  category: { type: String, enum: ['gloves', 'pads', 'protection', 'apparel', 'equipment', 'supplements'], required: true, index: true },
  price: { type: Number, required: true },
  images: [{ type: String }],
  description: { type: String, default: '' },
  stock: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  featured: { type: Boolean, default: false },
}, { timestamps: true });

export const Product = mongoose.model<IProduct>('Product', productSchema);
