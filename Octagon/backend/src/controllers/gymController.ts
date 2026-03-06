import { Request, Response } from 'express';
import { Gym } from '../models';

// GET /api/gyms - Get gyms with filters
export const getGyms = async (req: Request, res: Response): Promise<void> => {
  try {
    const { city, discipline, search, sort } = req.query;
    const filter: Record<string, any> = {};

    if (city && city !== 'All Cities') {
      filter.city = { $regex: city as string, $options: 'i' };
    }

    if (discipline && discipline !== 'All') {
      filter.disciplines = discipline as string;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search as string, $options: 'i' } },
        { area: { $regex: search as string, $options: 'i' } },
        { city: { $regex: search as string, $options: 'i' } },
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
    const count = await Gym.countDocuments();
    if (count > 0) {
      res.json({ success: true, message: `Already seeded (${count} gyms exist)` });
      return;
    }

    const gymsData = [
      { name: "Synergy MMA Academy", city: "Karachi", area: "DHA Phase 6", address: "Plot 15-C, Khayaban-e-Shahbaz, DHA Phase 6, Karachi", rating: 4.9, reviewCount: 234, disciplines: ["MMA", "BJJ", "Muay Thai", "Wrestling"], phone: "+92 321 2345678", website: "https://synergymma.pk", hours: "6:00 AM - 10:00 PM", image: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&auto=format&fit=crop", description: "Premier MMA training facility in Karachi with world-class coaches and equipment.", features: ["Air Conditioned", "Showers", "Pro Shop", "Parking"], priceRange: "Rs 8,000 - 15,000/mo", lat: 24.8007, lng: 67.0644 },
      { name: "Karachi Boxing Club", city: "Karachi", area: "Clifton", address: "Block 5, Clifton, Near Bilawal House, Karachi", rating: 4.7, reviewCount: 189, disciplines: ["Boxing", "Kickboxing"], phone: "+92 333 4567890", hours: "7:00 AM - 9:00 PM", image: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&auto=format&fit=crop", description: "Traditional boxing gym with experienced trainers.", features: ["Boxing Ring", "Heavy Bags", "Speed Bags", "Cardio Area"], priceRange: "Rs 5,000 - 10,000/mo", lat: 24.8138, lng: 67.0300 },
      { name: "Gracie Barra Karachi", city: "Karachi", area: "Gulshan-e-Iqbal", address: "Block 13-A, Gulshan-e-Iqbal, Karachi", rating: 4.8, reviewCount: 156, disciplines: ["BJJ", "MMA"], phone: "+92 300 1234567", website: "https://graciebarra.pk", hours: "6:30 AM - 9:30 PM", image: "https://images.unsplash.com/photo-1564415315949-7a0c4c73aab4?w=800&auto=format&fit=crop", description: "Official Gracie Barra affiliate offering authentic BJJ.", features: ["Mat Area", "Gi & No-Gi Classes", "Kids Program", "Women Only Classes"], priceRange: "Rs 10,000 - 18,000/mo", lat: 24.9215, lng: 67.0934 },
      { name: "Lahore Fight Club", city: "Lahore", area: "DHA Phase 5", address: "Main Boulevard, DHA Phase 5, Lahore", rating: 4.8, reviewCount: 312, disciplines: ["MMA", "Boxing", "Muay Thai", "Wrestling"], phone: "+92 300 8765432", website: "https://lahorefightclub.com", hours: "6:00 AM - 11:00 PM", image: "https://images.unsplash.com/photo-1517438322307-e67111335449?w=800&auto=format&fit=crop", description: "Lahore's premier combat sports facility.", features: ["Octagon Cage", "Boxing Ring", "Strength Area", "Recovery Room"], priceRange: "Rs 12,000 - 20,000/mo", lat: 31.4697, lng: 74.4048 },
      { name: "Punjab Martial Arts Academy", city: "Lahore", area: "Gulberg III", address: "Liberty Market, Gulberg III, Lahore", rating: 4.6, reviewCount: 198, disciplines: ["Karate", "Taekwondo", "Kickboxing"], phone: "+92 321 9876543", hours: "4:00 PM - 10:00 PM", image: "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=800&auto=format&fit=crop", description: "Traditional martial arts school.", features: ["Traditional Training", "Belt System", "Competition Team", "Self-Defense"], priceRange: "Rs 4,000 - 8,000/mo", lat: 31.5204, lng: 74.3587 },
      { name: "Elite MMA Lahore", city: "Lahore", area: "Johar Town", address: "Block G1, Johar Town, Lahore", rating: 4.7, reviewCount: 145, disciplines: ["MMA", "BJJ", "Wrestling"], phone: "+92 333 1122334", hours: "7:00 AM - 10:00 PM", image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop", description: "Modern MMA gym focusing on ground game.", features: ["Grappling Mats", "Video Analysis", "Private Training", "Open Mat Sessions"], priceRange: "Rs 8,000 - 15,000/mo", lat: 31.4697, lng: 74.2728 },
      { name: "Capital MMA Academy", city: "Islamabad", area: "F-7 Markaz", address: "Jinnah Super Market, F-7 Markaz, Islamabad", rating: 4.9, reviewCount: 267, disciplines: ["MMA", "BJJ", "Muay Thai", "Boxing"], phone: "+92 300 5556677", website: "https://capitalmma.pk", hours: "6:00 AM - 10:00 PM", image: "https://images.unsplash.com/photo-1579758629938-03607ccdbaba?w=800&auto=format&fit=crop", description: "Islamabad's top-rated MMA facility.", features: ["Full Cage", "Striking Area", "Grappling Zone", "Fitness Center"], priceRange: "Rs 15,000 - 25,000/mo", lat: 33.7215, lng: 73.0433 },
      { name: "Islamabad Boxing Academy", city: "Islamabad", area: "G-9 Markaz", address: "G-9 Markaz, Islamabad", rating: 4.5, reviewCount: 134, disciplines: ["Boxing", "Kickboxing"], phone: "+92 321 4455667", hours: "5:00 AM - 9:00 PM", image: "https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3?w=800&auto=format&fit=crop", description: "Professional boxing training with former national champions.", features: ["Olympic Boxing Ring", "Heavy Bags", "Speed Training", "Sparring Sessions"], priceRange: "Rs 6,000 - 12,000/mo", lat: 33.6844, lng: 73.0479 },
      { name: "Bahria MMA Center", city: "Islamabad", area: "Bahria Town Phase 4", address: "Commercial Area, Bahria Town Phase 4, Islamabad", rating: 4.6, reviewCount: 178, disciplines: ["MMA", "BJJ", "Muay Thai"], phone: "+92 333 7788990", hours: "6:30 AM - 10:30 PM", image: "https://images.unsplash.com/photo-1517438322307-e67111335449?w=800&auto=format&fit=crop", description: "State-of-the-art facility in Bahria Town.", features: ["Modern Equipment", "Sauna", "Nutrition Guidance", "Fight Team"], priceRange: "Rs 10,000 - 18,000/mo", lat: 33.5312, lng: 73.1234 },
      { name: "Pindi Warriors Gym", city: "Rawalpindi", area: "Saddar", address: "Bank Road, Saddar, Rawalpindi", rating: 4.4, reviewCount: 112, disciplines: ["MMA", "Boxing", "Wrestling"], phone: "+92 300 1112233", hours: "6:00 AM - 9:00 PM", image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop", description: "Rawalpindi's oldest martial arts gym.", features: ["Wrestling Mats", "Boxing Area", "Strength Training", "Cardio Zone"], priceRange: "Rs 5,000 - 10,000/mo", lat: 33.5973, lng: 73.0479 },
      { name: "Rawalpindi Martial Arts Club", city: "Rawalpindi", area: "Satellite Town", address: "Commercial Market, Satellite Town, Rawalpindi", rating: 4.3, reviewCount: 89, disciplines: ["Karate", "Taekwondo", "Kickboxing"], phone: "+92 321 2233445", hours: "4:00 PM - 9:00 PM", image: "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=800&auto=format&fit=crop", description: "Family-friendly martial arts school.", features: ["Kids Classes", "Adult Programs", "Self-Defense", "Tournaments"], priceRange: "Rs 3,500 - 7,000/mo", lat: 33.6007, lng: 73.0679 },
      { name: "Faisalabad Fight Academy", city: "Faisalabad", area: "D Ground", address: "D Ground, Peoples Colony, Faisalabad", rating: 4.5, reviewCount: 98, disciplines: ["MMA", "Boxing", "Kickboxing"], phone: "+92 300 6677889", hours: "6:00 AM - 10:00 PM", image: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&auto=format&fit=crop", description: "Central Punjab's leading combat sports facility.", features: ["Training Cage", "Cardio Equipment", "Locker Rooms", "Free Parking"], priceRange: "Rs 5,000 - 10,000/mo", lat: 31.4504, lng: 73.1350 },
    ];

    await Gym.insertMany(gymsData);
    res.json({ success: true, message: `Seeded ${gymsData.length} gyms` });
  } catch (error) {
    console.error('Seed gyms error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
