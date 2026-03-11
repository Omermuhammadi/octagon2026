import { Request, Response } from 'express';
import Stripe from 'stripe';
import { Product, Order } from '../models';
import { AuthRequest } from '../middleware';
import { config } from '../config';

// Initialize Stripe (only if key exists)
const stripe = config.stripe.secretKey
  ? new Stripe(config.stripe.secretKey, { apiVersion: '2024-12-18.acacia' as any })
  : null;

// Escape user input for safe use in $regex (prevents ReDoS)
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/gear - Get products with filters and pagination
export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, search, sort, featured, page, limit: limitParam } = req.query;
    const filter: Record<string, any> = {};

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (search) {
      const safeSearch = escapeRegex(search as string);
      filter.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    if (featured === 'true') {
      filter.featured = true;
    }

    let sortOption: Record<string, 1 | -1> = { featured: -1, rating: -1 };
    if (sort === 'price-low') sortOption = { price: 1 };
    else if (sort === 'price-high') sortOption = { price: -1 };
    else if (sort === 'rating') sortOption = { rating: -1 };
    else if (sort === 'newest') sortOption = { createdAt: -1 };

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitParam as string) || 100));
    const skip = (pageNum - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(filter).sort(sortOption).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: products,
      count: products.length,
      pagination: { page: pageNum, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/gear/:id - Get single product
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }
    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/gear/checkout - Create order (direct, non-Stripe fallback)
export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { items, shippingAddress } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'Items are required' });
      return;
    }

    // Validate all item quantities are positive integers
    for (const item of items) {
      if (!item.productId || !Number.isInteger(item.quantity) || item.quantity < 1) {
        res.status(400).json({ success: false, message: 'Each item must have a valid productId and a positive integer quantity' });
        return;
      }
    }

    // Validate products and calculate total — use atomic stock decrement
    let total = 0;
    const orderItems: { productId: any; name: string; price: number; quantity: number }[] = [];

    for (const item of items) {
      // Atomically decrement stock — only succeeds if enough stock exists
      const product = await Product.findOneAndUpdate(
        { _id: item.productId, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true }
      );
      if (!product) {
        // Rollback previously decremented stock for items that succeeded
        for (const prevItem of orderItems) {
          await Product.findByIdAndUpdate(prevItem.productId, {
            $inc: { stock: prevItem.quantity },
          });
        }
        // Check if product exists at all vs out of stock
        const exists = await Product.findById(item.productId);
        if (!exists) {
          res.status(404).json({ success: false, message: `Product not found: ${item.productId}` });
        } else {
          res.status(400).json({ success: false, message: `Insufficient stock for ${exists.name} (${exists.stock} available)` });
        }
        return;
      }
      total += product.price * item.quantity;
      orderItems.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
      });
    }

    const order = await Order.create({
      userId: req.user._id,
      items: orderItems,
      total,
      shippingAddress: typeof shippingAddress === 'object' ? JSON.stringify(shippingAddress) : (shippingAddress || ''),
    });

    res.status(201).json({ success: true, data: order, message: 'Order created' });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/gear/create-checkout-session - Stripe Checkout Session
export const createCheckoutSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (!stripe) {
      res.status(503).json({ success: false, message: 'Stripe is not configured' });
      return;
    }

    const { items, shippingAddress } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'Items are required' });
      return;
    }

    // Validate products exist and have stock
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    let subtotal = 0;

    for (const item of items) {
      if (!item.productId || !Number.isInteger(item.quantity) || item.quantity < 1) {
        res.status(400).json({ success: false, message: 'Invalid item format' });
        return;
      }

      const product = await Product.findById(item.productId);
      if (!product) {
        res.status(404).json({ success: false, message: `Product not found: ${item.productId}` });
        return;
      }
      if (product.stock < item.quantity) {
        res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });
        return;
      }

      subtotal += product.price * item.quantity;
      lineItems.push({
        price_data: {
          currency: 'pkr',
          product_data: {
            name: product.name,
            description: product.description?.substring(0, 500) || undefined,
            images: product.images?.length ? [product.images[0]] : undefined,
          },
          unit_amount: product.price * 100, // Stripe expects smallest currency unit (paisa)
        },
        quantity: item.quantity,
      });
    }

    // Add shipping if subtotal <= Rs 5,000
    if (subtotal <= 5000) {
      lineItems.push({
        price_data: {
          currency: 'pkr',
          product_data: { name: 'Shipping' },
          unit_amount: 50000, // Rs 500 in paisa
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${config.frontendUrl}/gear/cart?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.frontendUrl}/gear/cart?cancelled=true`,
      metadata: {
        userId: req.user._id.toString(),
        items: JSON.stringify(items),
        shippingAddress: shippingAddress || '',
      },
    });

    res.json({ success: true, data: { sessionId: session.id, url: session.url } });
  } catch (error) {
    console.error('Create checkout session error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/gear/webhook - Stripe Webhook
export const handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
  if (!stripe) {
    res.status(503).json({ success: false, message: 'Stripe is not configured' });
    return;
  }

  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, config.stripe.webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).json({ success: false, message: `Webhook Error: ${err.message}` });
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};

    try {
      const items = JSON.parse(metadata.items || '[]');
      const userId = metadata.userId;

      // Atomically decrement stock and build order items
      const orderItems: { productId: any; name: string; price: number; quantity: number }[] = [];
      let total = 0;

      for (const item of items) {
        const product = await Product.findOneAndUpdate(
          { _id: item.productId, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { new: true }
        );
        if (product) {
          total += product.price * item.quantity;
          orderItems.push({
            productId: product._id,
            name: product.name,
            price: product.price,
            quantity: item.quantity,
          });
        }
      }

      if (orderItems.length > 0) {
        await Order.create({
          userId,
          items: orderItems,
          total,
          status: 'confirmed',
          shippingAddress: metadata.shippingAddress || '',
          stripeSessionId: session.id,
        });
        console.log(`[Stripe] Order created for session ${session.id}`);
      }
    } catch (err) {
      console.error('[Stripe] Error processing webhook:', err);
    }
  }

  res.json({ received: true });
};

// GET /api/gear/orders - Get user's order history
export const getOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const orders = await Order.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/gear/seed - Seed products (admin utility)
export const seedProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    // Allow reseed by clearing existing data
    await Product.deleteMany({});

    const { productSeedData } = await import('../data/productSeedData');
    await Product.insertMany(productSeedData);
    res.json({ success: true, message: `Seeded ${productSeedData.length} products` });
  } catch (error) {
    console.error('Seed products error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
