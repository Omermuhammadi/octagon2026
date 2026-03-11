import { Router } from 'express';
import { getProducts, getProductById, createOrder, getOrders, seedProducts, createCheckoutSession, handleStripeWebhook } from '../controllers/gearController';
import { protect } from '../middleware';

const router = Router();

// GET /api/gear - Get products catalog
router.get('/', getProducts);

// GET /api/gear/orders - Get user's orders
router.get('/orders', protect, getOrders);

// POST /api/gear/seed - Seed product data (requires auth)
router.post('/seed', protect, seedProducts);

// POST /api/gear/checkout - Create an order (direct fallback)
router.post('/checkout', protect, createOrder);

// POST /api/gear/create-checkout-session - Stripe Checkout
router.post('/create-checkout-session', protect, createCheckoutSession);

// POST /api/gear/webhook - Stripe webhook (no auth - uses Stripe signature)
router.post('/webhook', handleStripeWebhook);

// GET /api/gear/:id - Get single product
router.get('/:id', getProductById);

export default router;
