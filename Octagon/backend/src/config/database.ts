import mongoose from 'mongoose';
import { config } from './index';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer: MongoMemoryServer | null = null;

export const startMemoryMongo = async (): Promise<string> => {
  if (!memoryServer) {
    memoryServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'octagon-oracle',
      },
    });
  }

  return memoryServer.getUri();
};

export const stopMemoryMongo = async (): Promise<void> => {
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
};

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(config.mongodbUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', (error as Error).message);
    throw error;
  }
};

export const connectFallbackDB = async (): Promise<void> => {
  const uri = await startMemoryMongo();
  const conn = await mongoose.connect(uri);
  console.log(`MongoDB Connected (memory): ${conn.connection.host}`);
};
