export type UserRole = "client" | "driver";

export type BookingStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

export type PaymentStatus = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  full_name: string;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: UserRole;
  is_online: boolean;
  is_admin: boolean;
  is_active: boolean;
  dni: string | null;
  license_type: string | null;
  address: string | null;
  nationality: string | null;
  created_at: string;
}

export interface BusinessHours {
  day_of_week: number; // 0=domingo ... 6=sábado
  is_open: boolean;
  open_time: string; // "HH:MM:SS"
  close_time: string; // "HH:MM:SS"
}

export interface PricingConfig {
  id: number;
  flat_fare: number;
  flat_km: number;
  extra_km_price: number;
  zone_center_lat: number;
  zone_center_lng: number;
  zone_radius_km: number;
  out_of_zone_km_price: number;
}

export interface Vehicle {
  id: string;
  client_id: string;
  label: string;
  brand: string | null;
  model: string | null;
  plate: string | null;
  created_at: string;
}

export interface SavedAddress {
  id: string;
  client_id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  created_at: string;
}

export interface Booking {
  id: string;
  client_id: string;
  driver_id: string | null;
  status: BookingStatus;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_address: string | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  scheduled_at: string | null;
  vehicle_info: string;
  price_estimate: number;
  created_at: string;
}

export interface DriverLocation {
  booking_id: string;
  driver_id: string;
  lat: number;
  lng: number;
  updated_at: string;
}

export type PaymentProvider = "redsys" | "cash";

export interface Payment {
  id: string;
  booking_id: string;
  provider: PaymentProvider;
  external_reference: string | null;
  status: PaymentStatus;
  amount: number;
  raw_payload: Record<string, unknown> | null;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface AdminBlockedSlot {
  id: string;
  blocked_at: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
}
