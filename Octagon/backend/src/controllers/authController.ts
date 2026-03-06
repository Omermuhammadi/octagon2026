import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { validationResult } from 'express-validator';
import { User } from '../models';
import { config } from '../config';
import { AuthRequest } from '../middleware';

// Generate JWT Token
const generateToken = (id: string): string => {
  return jwt.sign({ id }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
};

// Format user response (exclude password)
const formatUserResponse = (user: any) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  joinDate: user.joinDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  }),
  // Extended profile fields
  experienceLevel: user.experienceLevel || 'Beginner',
  trainingGoal: user.trainingGoal || 'Fitness',
  discipline: user.discipline || 'MMA',
  weight: user.weight || '',
  height: user.height || '',
  // Stats
  predictionsMade: user.predictionsMade || 0,
  trainingSessions: user.trainingSessions || 0,
  accuracyRate: user.accuracyRate || 0,
  daysActive: user.daysActive || 0,
});

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        errors: errors.array(),
      });
      return;
    }

    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
      return;
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'fan',
    });

    // Generate token
    const token = generateToken(user._id.toString());

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: formatUserResponse(user),
        token,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        errors: errors.array(),
      });
      return;
    }

    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
      return;
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
      return;
    }

    // Generate token
    const token = generateToken(user._id.toString());

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: formatUserResponse(user),
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: formatUserResponse(user),
      },
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
export const updateProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { 
      name, 
      avatar, 
      experienceLevel, 
      trainingGoal, 
      discipline, 
      weight, 
      height 
    } = req.body;

    // Build update object with only provided fields
    const updateFields: Record<string, unknown> = {};
    if (name !== undefined) updateFields.name = name;
    if (avatar !== undefined) updateFields.avatar = avatar;
    if (experienceLevel !== undefined) updateFields.experienceLevel = experienceLevel;
    if (trainingGoal !== undefined) updateFields.trainingGoal = trainingGoal;
    if (discipline !== undefined) updateFields.discipline = discipline;
    if (weight !== undefined) updateFields.weight = weight;
    if (height !== undefined) updateFields.height = height;

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      updateFields,
      { new: true, runValidators: true }
    );

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: formatUserResponse(user),
      },
    });
  } catch (error) {
    console.error('UpdateProfile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/auth/password
 * @access  Private
 */
export const changePassword = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id).select('+password');

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
      return;
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('ChangePassword error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Forgot password - send reset code
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if email exists or not for security
      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a reset code has been generated',
      });
      return;
    }

    // Generate reset token
    const resetCode = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // In production, you would send this via email
    // For now, we'll log it and return it in development
    console.log(`\n📧 Password Reset Code for ${email}: ${resetCode}\n`);

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a reset code has been generated',
      // Only include code in development for testing
      ...(process.env.NODE_ENV !== 'production' && { resetCode }),
    });
  } catch (error) {
    console.error('ForgotPassword error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Reset password with code
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, code, newPassword } = req.body;

    // Hash the provided code to compare with stored hash
    const hashedCode = crypto
      .createHash('sha256')
      .update(code)
      .digest('hex');

    const user = await User.findOne({
      email,
      resetPasswordToken: hashedCode,
      resetPasswordExpires: { $gt: Date.now() },
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired reset code',
      });
      return;
    }

    // Update password and clear reset fields
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.',
    });
  } catch (error) {
    console.error('ResetPassword error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
