import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export type UserRole = 'fighter' | 'beginner' | 'coach' | 'fan';
export type AgeGroup = 'under-15' | '15-25' | '25+';
export type ExperienceLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Professional';
export type TrainingGoal = 'Self-Defense' | 'Fitness' | 'Competition Preparation' | 'Professional Fighting';
export type Discipline = 'MMA' | 'BJJ' | 'Muay Thai' | 'Boxing' | 'Karate' | 'Wrestling';

export interface IUserPreferences {
  preferredDisciplines: string[];
  notifications: boolean;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  avatar?: string;
  joinDate: Date;
  // Password reset fields
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  // Extended profile fields
  experienceLevel?: ExperienceLevel;
  trainingGoal?: TrainingGoal;
  discipline?: Discipline;
  weight?: string;
  height?: string;
  // New profile fields
  ageGroup?: AgeGroup;
  location?: string;
  preferences?: IUserPreferences;
  // Stats
  predictionsMade: number;
  trainingSessions: number;
  accuracyRate: number;
  daysActive: number;
  comparePassword(candidatePassword: string): Promise<boolean>;
  createPasswordResetToken(): string;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't include password in queries by default
    },
    role: {
      type: String,
      enum: ['fighter', 'beginner', 'coach', 'fan'],
      default: 'fan',
    },
    avatar: {
      type: String,
      default: '',
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },
    // Password reset fields
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    // Extended profile fields
    experienceLevel: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Professional'],
      default: 'Beginner',
    },
    trainingGoal: {
      type: String,
      enum: ['Self-Defense', 'Fitness', 'Competition Preparation', 'Professional Fighting'],
      default: 'Fitness',
    },
    discipline: {
      type: String,
      enum: ['MMA', 'BJJ', 'Muay Thai', 'Boxing', 'Karate', 'Wrestling'],
      default: 'MMA',
    },
    weight: {
      type: String,
      default: '',
    },
    height: {
      type: String,
      default: '',
    },
    // New profile fields
    ageGroup: {
      type: String,
      enum: ['under-15', '15-25', '25+'],
    },
    location: {
      type: String,
      default: '',
    },
    preferences: {
      preferredDisciplines: [{ type: String }],
      notifications: { type: Boolean, default: true },
    },
    // Stats
    predictionsMade: {
      type: Number,
      default: 0,
    },
    trainingSessions: {
      type: Number,
      default: 0,
    },
    accuracyRate: {
      type: Number,
      default: 0,
    },
    daysActive: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Create password reset token
userSchema.methods.createPasswordResetToken = function (): string {
  const resetCode = crypto.randomInt(100000, 999999).toString();
  
  // Hash the code before storing
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetCode)
    .digest('hex');
  
  // Token expires in 1 hour
  this.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
  
  return resetCode;
};

export const User = mongoose.model<IUser>('User', userSchema);
