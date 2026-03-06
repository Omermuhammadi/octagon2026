import mongoose, { Document, Schema } from 'mongoose';

export interface IEvent extends Document {
  url: string;
  eventId: string;
  name: string;
  date: Date;
  location: string;
  status: 'upcoming' | 'completed';
}

const eventSchema = new Schema<IEvent>(
  {
    url: { type: String, required: true, unique: true },
    eventId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    date: { type: Date, required: true, index: true },
    location: { type: String, default: '' },
    status: { type: String, enum: ['upcoming', 'completed'], default: 'completed' },
  },
  { timestamps: true }
);

export const Event = mongoose.model<IEvent>('Event', eventSchema);
