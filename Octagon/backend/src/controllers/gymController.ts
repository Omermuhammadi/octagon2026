import { Request, Response } from 'express';
import { Gym } from '../models';

// Escape user input for safe use in $regex (prevents ReDoS)
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/gyms - Get gyms with filters
export const getGyms = async (req: Request, res: Response): Promise<void> => {
  try {
    const { city, discipline, search, sort, priceRange } = req.query;
    const filter: Record<string, any> = {};

    if (city && city !== 'All Cities') {
      filter.city = { $regex: escapeRegex(city as string), $options: 'i' };
    }

    if (discipline && discipline !== 'All') {
      filter.disciplines = discipline as string;
    }

    if (priceRange && priceRange !== 'All') {
      filter.priceRange = { $regex: escapeRegex(priceRange as string), $options: 'i' };
    }

    if (search) {
      const safeSearch = escapeRegex(search as string);
      filter.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { area: { $regex: safeSearch, $options: 'i' } },
        { city: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    let sortOption: Record<string, 1 | -1> = { rating: -1 };
    if (sort === 'reviews') sortOption = { reviewCount: -1 };
    else if (sort === 'name') sortOption = { name: 1 };

    const gyms = await Gym.find(filter).sort(sortOption).lean();
    res.json({ success: true, data: gyms, count: gyms.length });
  } catch (error) {
    console.error('Get gyms error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/gyms/nearby - Get nearby gyms by lat/lng
export const getNearbyGyms = async (req: Request, res: Response): Promise<void> => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = parseFloat(req.query.radius as string) || 50; // km

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ success: false, message: 'lat and lng are required' });
      return;
    }

    // Simple distance calculation using bounding box
    const latDelta = radius / 111; // ~111km per degree of latitude
    const lngDelta = radius / (111 * Math.cos(lat * Math.PI / 180));

    const gyms = await Gym.find({
      lat: { $gte: lat - latDelta, $lte: lat + latDelta },
      lng: { $gte: lng - lngDelta, $lte: lng + lngDelta },
    }).sort({ rating: -1 }).lean();

    // Calculate actual distance and sort by it
    const gymsWithDistance = gyms.map(gym => {
      const dLat = (gym.lat - lat) * Math.PI / 180;
      const dLng = (gym.lng - lng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat * Math.PI / 180) * Math.cos(gym.lat * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = 6371 * c; // Earth radius in km
      return { ...gym, distance: Math.round(distance * 10) / 10 };
    }).filter(g => g.distance <= radius).sort((a, b) => a.distance - b.distance);

    res.json({ success: true, data: gymsWithDistance, count: gymsWithDistance.length });
  } catch (error) {
    console.error('Get nearby gyms error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/gyms/seed - Seed gyms from static data (admin utility)
export const seedGyms = async (req: Request, res: Response): Promise<void> => {
  try {
    // Allow reseed by clearing existing data
    await Gym.deleteMany({});

    const { gymSeedData } = await import('../data/gymSeedData');
    await Gym.insertMany(gymSeedData);
    res.json({ success: true, message: `Seeded ${gymSeedData.length} gyms` });
  } catch (error) {
    console.error('Seed gyms error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
