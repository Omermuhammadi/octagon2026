import { Request, Response } from 'express';
import { Product, Order } from '../models';
import { AuthRequest } from '../middleware';

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
    const limit = Math.min(50, Math.max(1, parseInt(limitParam as string) || 50));
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

// POST /api/gear/checkout - Create order
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
    const count = await Product.countDocuments();
    if (count > 0) {
      res.json({ success: true, message: `Already seeded (${count} products exist)` });
      return;
    }

    const products = [
      { name: "Pro MMA Gloves", category: "gloves", price: 4999, images: ["https://images.unsplash.com/photo-1614632537197-38a17061c2bd?w=400"], description: "Professional-grade MMA training gloves with wrist support", stock: 50, rating: 4.8, reviewCount: 124, featured: true },
      { name: "Boxing Gloves 16oz", category: "gloves", price: 3999, images: ["https://images.unsplash.com/photo-1583473848882-f9a5bc1994d8?w=400"], description: "Premium leather boxing gloves for sparring and bag work", stock: 35, rating: 4.7, reviewCount: 89, featured: true },
      { name: "Thai Pads Pro", category: "pads", price: 5999, images: ["https://images.unsplash.com/photo-1615117950012-63c32b281fef?w=400"], description: "Heavy-duty Muay Thai kick pads with reinforced stitching", stock: 25, rating: 4.6, reviewCount: 67, featured: false },
      { name: "Focus Mitts", category: "pads", price: 2499, images: ["https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400"], description: "Curved focus mitts for precision striking drills", stock: 40, rating: 4.5, reviewCount: 56, featured: false },
      { name: "Head Guard Pro", category: "protection", price: 3499, images: ["https://images.unsplash.com/photo-1564415315949-7a0c4c73aab4?w=400"], description: "Full-face head protection for sparring", stock: 30, rating: 4.4, reviewCount: 45, featured: true },
      { name: "Shin Guards", category: "protection", price: 2999, images: ["https://images.unsplash.com/photo-1517438322307-e67111335449?w=400"], description: "Padded shin guards for Muay Thai and MMA", stock: 45, rating: 4.6, reviewCount: 78, featured: false },
      { name: "MMA Shorts", category: "apparel", price: 1999, images: ["https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400"], description: "Lightweight fight shorts with stretch panels", stock: 60, rating: 4.3, reviewCount: 92, featured: false },
      { name: "Rash Guard Long Sleeve", category: "apparel", price: 2499, images: ["https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400"], description: "Compression rash guard for grappling and training", stock: 50, rating: 4.5, reviewCount: 67, featured: true },
      { name: "Heavy Bag 100lb", category: "equipment", price: 12999, images: ["https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400"], description: "Professional heavy bag for home gym training", stock: 15, rating: 4.8, reviewCount: 34, featured: true },
      { name: "Speed Bag", category: "equipment", price: 3499, images: ["https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3?w=400"], description: "Double-end speed bag for timing and accuracy", stock: 20, rating: 4.4, reviewCount: 28, featured: false },
      { name: "Hand Wraps (Pair)", category: "protection", price: 499, images: ["https://images.unsplash.com/photo-1583473848882-f9a5bc1994d8?w=400"], description: "Mexican-style hand wraps for boxing and MMA", stock: 100, rating: 4.7, reviewCount: 156, featured: false },
      { name: "Protein Powder 2kg", category: "supplements", price: 4499, images: ["https://images.unsplash.com/photo-1579758629938-03607ccdbaba?w=400"], description: "Whey protein for muscle recovery after training", stock: 40, rating: 4.5, reviewCount: 89, featured: false },
    ];

    await Product.insertMany(products);
    res.json({ success: true, message: `Seeded ${products.length} products` });
  } catch (error) {
    console.error('Seed products error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
