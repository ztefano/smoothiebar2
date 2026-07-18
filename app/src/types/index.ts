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
  phone: string | null;
  role: UserRole;
  is_online: boolean;
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
  preference_id: string | null;
  status: PaymentStatus;
  amount: number;
  raw_payload: Record<string, unknown> | null;
}

export interface Coordinates {
  lat: number;
  lng: number;
}
