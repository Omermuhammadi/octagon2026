"use client";

import { useState, useCallback, useMemo } from "react";
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from "@react-google-maps/api";
import { GymData } from "@/lib/api";
import { Star, MapPin, Loader2 } from "lucide-react";

interface GymMapProps {
  gyms: GymData[];
  center?: { lat: number; lng: number };
  zoom?: number;
}

const mapContainerStyle = { width: "100%", height: "100%" };
const DEFAULT_CENTER = { lat: 30.3753, lng: 69.3451 };

const darkMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#181818" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#373737" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
  { featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{ color: "#4e4e4e" }] },
  { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d3d3d" }] },
];

export function GymMap({ gyms, center, zoom }: GymMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const [selectedGym, setSelectedGym] = useState<GymData | null>(null);

  const mapCenter = useMemo(() => {
    if (center) return center;
    if (gyms.length === 0) return DEFAULT_CENTER;
    const avgLat = gyms.reduce((sum, g) => sum + g.lat, 0) / gyms.length;
    const avgLng = gyms.reduce((sum, g) => sum + g.lng, 0) / gyms.length;
    return { lat: avgLat, lng: avgLng };
  }, [center, gyms]);

  const mapZoom = zoom || (gyms.length <= 3 ? 13 : gyms.length <= 10 ? 10 : 6);

  const mapOptions = useMemo(() => ({
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    styles: darkMapStyles,
  }), []);

  const handleMarkerClick = useCallback((gym: GymData) => {
    setSelectedGym(gym);
  }, []);

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white/5 rounded-xl border border-white/10 p-8 text-center">
        <MapPin className="w-12 h-12 text-gray-600 mb-4" />
        <p className="text-gray-400">Google Maps API key not configured.</p>
        <p className="text-gray-500 text-sm mt-1">Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable maps.</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white/5 rounded-xl border border-white/10 p-8 text-center">
        <MapPin className="w-12 h-12 text-red-600 mb-4" />
        <p className="text-gray-400">Failed to load Google Maps.</p>
        <p className="text-gray-500 text-sm mt-1">Check your API key and network connection.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-white/5 rounded-xl border border-white/10">
        <Loader2 className="w-8 h-8 animate-spin text-octagon-red mr-3" />
        <span className="text-gray-400">Loading map...</span>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={mapCenter}
      zoom={mapZoom}
      options={mapOptions}
    >
      {gyms.map((gym) => (
        <MarkerF
          key={gym._id}
          position={{ lat: gym.lat, lng: gym.lng }}
          onClick={() => handleMarkerClick(gym)}
          title={gym.name}
        />
      ))}

      {selectedGym && (
        <InfoWindowF
          position={{ lat: selectedGym.lat, lng: selectedGym.lng }}
          onCloseClick={() => setSelectedGym(null)}
        >
          <div className="p-1 max-w-[260px] text-black">
            <h3 className="font-bold text-sm mb-1">{selectedGym.name}</h3>
            <div className="flex items-center gap-1 mb-1">
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
              <span className="text-xs font-medium">{selectedGym.rating}</span>
              <span className="text-xs text-gray-500">({selectedGym.reviewCount} reviews)</span>
            </div>
            <p className="text-xs text-gray-600 mb-1">{selectedGym.address}</p>
            <p className="text-xs text-gray-600 mb-2">{selectedGym.phone}</p>
            <div className="flex flex-wrap gap-1 mb-2">
              {selectedGym.disciplines.map(d => (
                <span key={d} className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">{d}</span>
              ))}
            </div>
            <div className="flex gap-2">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedGym.name + " " + selectedGym.city)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
              >
                Get Directions
              </a>
              <a href={`tel:${selectedGym.phone}`} className="text-xs text-green-600 hover:text-green-800 underline font-medium">
                Call
              </a>
            </div>
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>
  );
}
