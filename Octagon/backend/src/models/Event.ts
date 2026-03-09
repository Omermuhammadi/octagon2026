import mongoose, { Document, Schema } from 'mongoose';

export interface IEventFight {
  position: number;
  fighter1: string;
  fighter2: string;
  winner: string | null;
  fighter1Detail: string | null;
  fighter2Detail: string | null;
}

export interface IEvent extends Document {
  url: string;
  eventId: string;
  name: string;
  date: Date;
  location: string;
  status: 'upcoming' | 'completed';
  // TheSportsDB fields
  sportsDbId: string | null;
  venue: string;
  city: string;
  country: string;
  poster: string;
  thumb: string;
  fights: IEventFight[];
  lastSynced: Date | null;
}

const eventFightSchema = new Schema<IEventFight>(
  {
    position: { type: Number, required: true },
    fighter1: { type: String, required: true },
    fighter2: { type: String, required: true },
    winner: { type: String, default: null },
    fighter1Detail: { type: String, default: null },
    fighter2Detail: { type: String, default: null },
  },
  { _id: false }
);

const eventSchema = new Schema<IEvent>(
  {
    url: { type: String, required: true, unique: true },
    eventId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    date: { type: Date, required: true, index: true },
    location: { type: String, default: '' },
    status: { type: String, enum: ['upcoming', 'completed'], default: 'completed' },
    // TheSportsDB fields
    sportsDbId: { type: String, default: null, index: true, sparse: true },
    venue: { type: String, default: '' },
    city: { type: String, default: '' },
    country: { type: String, default: '' },
    poster: { type: String, default: '' },
    thumb: { type: String, default: '' },
    fights: { type: [eventFightSchema], default: [] },
    lastSynced: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Event = mongoose.model<IEvent>('Event', eventSchema);
