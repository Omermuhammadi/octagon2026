import mongoose from 'mongoose';
import { config } from './index';

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(config.mongodbUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', (error as Error).message);
    console.warn('⚠️  Server starting without MongoDB — DB-dependent routes will fail. Please start MongoDB.');
  }
};
