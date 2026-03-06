import { Router } from 'express';
import { getProducts, getProductById, createOrder, getOrders, seedProducts } from '../controllers/gearController';
import { protect } from '../middleware';

const router = Router();

// GET /api/gear - Get products catalog
router.get('/', getProducts);

// GET /api/gear/orders - Get user's orders
router.get('/orders', protect, getOrders);

// POST /api/gear/seed - Seed product data (requires auth)
router.post('/seed', protect, seedProducts);

// POST /api/gear/checkout - Create an order
router.post('/checkout', protect, createOrder);

// GET /api/gear/:id - Get single product
router.get('/:id', getProductById);

export default router;
