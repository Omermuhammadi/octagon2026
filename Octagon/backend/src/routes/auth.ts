import { Router } from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
} from '../controllers';
import { protect } from '../middleware';

const router = Router();

// Strong password regex: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 symbol
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
const passwordRequirementsMessage = 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 symbol';

// Validation rules
const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .matches(strongPasswordRegex)
    .withMessage(passwordRequirementsMessage),
  body('role')
    .optional()
    .isIn(['coach', 'fan', 'fighter', 'beginner'])
    .withMessage('Role must be coach, fan, fighter, or beginner'),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('avatar').optional().isURL().withMessage('Avatar must be a valid URL'),
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .matches(strongPasswordRegex)
    .withMessage(passwordRequirementsMessage),
];

const forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email'),
];

const resetPasswordValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Reset code is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('Reset code must be 6 digits'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .matches(strongPasswordRegex)
    .withMessage(passwordRequirementsMessage),
];

// Routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/reset-password', resetPasswordValidation, resetPassword);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfileValidation, updateProfile);
router.put('/password', protect, changePasswordValidation, changePassword);

export default router;
