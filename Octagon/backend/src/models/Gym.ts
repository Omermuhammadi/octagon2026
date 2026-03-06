import mongoose, { Document, Schema } from 'mongoose';

export interface IGym extends Document {
  name: string;
  city: string;
  area: string;
  address: string;
  rating: number;
  reviewCount: number;
  disciplines: string[];
  phone: string;
  website?: string;
  hours: string;
  image: string;
  description: string;
  features: string[];
  priceRange: string;
  lat: number;
  lng: number;
}

const gymSchema = new Schema<IGym>({
  name: { type: String, required: true, index: true },
  city: { type: String, required: true, index: true },
  area: { type: String, default: '' },
  address: { type: String, required: true },
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  disciplines: [{ type: String }],
  phone: { type: String, default: '' },
  website: { type: String },
  hours: { type: String, default: '' },
  image: { type: String, default: '' },
  description: { type: String, default: '' },
  features: [{ type: String }],
  priceRange: { type: String, default: '' },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
}, { timestamps: true });

gymSchema.index({ lat: 1, lng: 1 });
gymSchema.index({ name: 'text', city: 'text', area: 'text' });

export const Gym = mongoose.model<IGym>('Gym', gymSchema);
