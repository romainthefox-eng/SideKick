import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// DATABASE TYPES
// ============================================

export interface Logement {
  id: number;
  name: string;
  address: string;
  postal_code: string | null;
  type: string;
  rooms: number;
  price: number;
  description: string | null;
  location_type: 'longterm' | 'shortterm';
  rent_without_charges: number | null;
  monthly_charges: number | null;
  surface: number | null;
  deposit_guarantee: number | null;
  heating: string | null;
  water: string | null;
  internet: boolean;
  parking: boolean;
  furnished: boolean;
  notes: string | null;
  price_per_night: number | null;
  cleaning_fees: number | null;
  concierge_commission: number | null;
  check_in_type: string | null;
  key_location: string | null;
  building_code: string | null;
  wifi_code: string | null;
  water_meter_location: string | null;
  electricity_meter_location: string | null;
  garbage_info: string | null;
  specific_equipment: string | null;
  cleaning_checklist: string | null;
  linage_storage: string | null;
  created_at: string;
  updated_at: string;
}

export interface Rental {
  id: number;
  logement_id: number;
  tenant_name: string;
  email: string | null;
  phone: string | null;
  start_date: string;
  end_date: string;
  monthly_price: number | null;
  status: 'active' | 'ended' | 'pending';
  // Reservation-specific fields (added via migration_reservation_fields.sql)
  adults: number | null;
  children: number | null;
  source: 'airbnb' | 'booking' | 'direct' | 'autre' | null;
  booking_status: 'confirmed' | 'pending' | 'paid' | null;
  pets: boolean | null;
  special_requests: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExternalListing {
  id: number;
  logement_id: number;
  platform: string;
  platform_id: string;
  platform_url: string | null;
  sync_status: 'synced' | 'pending' | 'error' | 'paused';
  last_sync_at: string | null;
  sync_direction: 'import' | 'export' | 'bidirectional';
  error_message: string | null;
  raw_data: any | null;
  created_at: string;
  updated_at: string;
}

export interface PriceHistory {
  id: number;
  logement_id: number;
  platform: string | null;
  date: string;
  price_before: number | null;
  price_after: number;
  source: string;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
}

export interface CalendarSync {
  id: number;
  logement_id: number;
  date: string;
  status: 'available' | 'booked' | 'blocked' | 'pending_sync';
  source: string;
  booking_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  conflict_status: 'ok' | 'conflict' | 'resolved';
  conflict_note: string | null;
  last_updated_at: string;
  created_at: string;
}

export interface AccessInstruction {
  id: number;
  logement_id: number;
  type: string;
  instruction: string;
  last_updated: string;
  created_at: string;
}

export interface Task {
  id: number;
  logement_id: number;
  title: string;
  description: string | null;
  category: string;
  due_date: string | null;
  completed: boolean;
  completed_date: string | null;
  priority: 'low' | 'medium' | 'high';
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface Incident {
  id: number;
  logement_id: number;
  title: string;
  description: string | null;
  date: string;
  resolved: boolean;
  resolved_date: string | null;
  priority: 'low' | 'medium' | 'high';
  category: string;
  created_at: string;
  updated_at: string;
}

export interface DailyEvent {
  id: number;
  logement_id: number;
  title: string;
  date: string;
  time: string | null;
  type: string;
  created_at: string;
}

// ============================================
// LOGEMENTS OPERATIONS
// ============================================

export async function getLogements() {
  const { data, error } = await supabase
    .from('logements')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching logements:', error);
    return [];
  }
  return data || [];
}

export async function getLogement(id: number) {
  const { data, error } = await supabase
    .from('logements')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    console.error('Error fetching logement:', error);
    return null;
  }
  return data;
}

export async function addLogement(logement: Omit<Logement, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('logements')
    .insert([logement])
    .select()
    .single();
  if (error) {
    console.error('Error adding logement:', error);
    throw error;
  }
  return data;
}

export async function updateLogement(id: number, updates: Partial<Logement>) {
  const { data, error } = await supabase
    .from('logements')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('Error updating logement:', error);
    throw error;
  }
  return data;
}

export async function deleteLogement(id: number) {
  const { error } = await supabase
    .from('logements')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Error deleting logement:', error);
    throw error;
  }
}

// ============================================
// RENTALS OPERATIONS
// ============================================

export async function getRentals() {
  const { data, error } = await supabase
    .from('rentals')
    .select('*')
    .order('start_date', { ascending: false });
  if (error) {
    console.error('Error fetching rentals:', error);
    return [];
  }
  return data || [];
}

export async function getRentalsByLogement(logementId: number) {
  const { data, error } = await supabase
    .from('rentals')
    .select('*')
    .eq('logement_id', logementId);
  if (error) {
    console.error('Error fetching rentals:', error);
    return [];
  }
  return data || [];
}

export async function addRental(rental: Omit<Rental, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('rentals')
    .insert([rental])
    .select()
    .single();
  if (error) {
    console.error('Error adding rental:', error);
    throw error;
  }
  return data;
}

export async function updateRental(id: number, updates: Partial<Rental>) {
  const { data, error } = await supabase
    .from('rentals')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('Error updating rental:', error);
    throw error;
  }
  return data;
}

export async function deleteRental(id: number) {
  const { error } = await supabase
    .from('rentals')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Error deleting rental:', error);
    throw error;
  }
}

// ============================================
// EXTERNAL LISTINGS OPERATIONS
// ============================================

export async function getExternalListings() {
  const { data, error } = await supabase
    .from('external_listings')
    .select('*');
  if (error) {
    console.error('Error fetching external listings:', error);
    return [];
  }
  return data || [];
}

export async function getExternalListingsByLogement(logementId: number) {
  const { data, error } = await supabase
    .from('external_listings')
    .select('*')
    .eq('logement_id', logementId);
  if (error) {
    console.error('Error fetching external listings:', error);
    return [];
  }
  return data || [];
}

export async function addExternalListing(listing: Omit<ExternalListing, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('external_listings')
    .insert([listing])
    .select()
    .single();
  if (error) {
    console.error('Error adding external listing:', error);
    throw error;
  }
  return data;
}

export async function updateExternalListing(id: number, updates: Partial<ExternalListing>) {
  const { data, error } = await supabase
    .from('external_listings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('Error updating external listing:', error);
    throw error;
  }
  return data;
}

// ============================================
// PRICE HISTORY OPERATIONS
// ============================================

export async function getPriceHistory(logementId?: number) {
  let query = supabase.from('price_history').select('*');
  
  if (logementId) {
    query = query.eq('logement_id', logementId);
  }
  
  const { data, error } = await query.order('date', { ascending: false });
  if (error) {
    console.error('Error fetching price history:', error);
    return [];
  }
  return data || [];
}

export async function addPriceHistory(history: Omit<PriceHistory, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('price_history')
    .insert([history])
    .select()
    .single();
  if (error) {
    console.error('Error adding price history:', error);
    throw error;
  }
  return data;
}

// ============================================
// CALENDAR SYNC OPERATIONS
// ============================================

export async function getCalendarSync(logementId: number, startDate?: string, endDate?: string) {
  let query = supabase.from('calendar_sync').select('*').eq('logement_id', logementId);
  
  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }
  
  const { data, error } = await query.order('date', { ascending: true });
  if (error) {
    console.error('Error fetching calendar sync:', error);
    return [];
  }
  return data || [];
}

export async function updateCalendarSync(logementId: number, date: string, updates: Partial<CalendarSync>) {
  const { data, error } = await supabase
    .from('calendar_sync')
    .update({ ...updates, last_updated_at: new Date().toISOString() })
    .eq('logement_id', logementId)
    .eq('date', date)
    .select()
    .single();
  if (error) {
    console.error('Error updating calendar sync:', error);
    throw error;
  }
  return data;
}

// ============================================
// ACCESS INSTRUCTIONS OPERATIONS
// ============================================

export async function getAccessInstructions(logementId: number) {
  const { data, error } = await supabase
    .from('access_instructions')
    .select('*')
    .eq('logement_id', logementId);
  if (error) {
    console.error('Error fetching access instructions:', error);
    return [];
  }
  return data || [];
}

export async function addAccessInstruction(instruction: Omit<AccessInstruction, 'id' | 'created_at' | 'last_updated'>) {
  const { data, error } = await supabase
    .from('access_instructions')
    .insert([instruction])
    .select()
    .single();
  if (error) {
    console.error('Error adding access instruction:', error);
    throw error;
  }
  return data;
}

export async function updateAccessInstruction(id: number, updates: Partial<AccessInstruction>) {
  const { data, error } = await supabase
    .from('access_instructions')
    .update({ ...updates, last_updated: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('Error updating access instruction:', error);
    throw error;
  }
  return data;
}

export async function deleteAccessInstruction(id: number) {
  const { error } = await supabase
    .from('access_instructions')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Error deleting access instruction:', error);
    throw error;
  }
}

// ============================================
// TASKS OPERATIONS
// ============================================

export async function getTasks(logementId?: number) {
  let query = supabase.from('tasks').select('*');
  
  if (logementId) {
    query = query.eq('logement_id', logementId);
  }
  
  const { data, error } = await query.order('due_date', { ascending: true });
  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
  return data || [];
}

export async function addTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('tasks')
    .insert([task])
    .select()
    .single();
  if (error) {
    console.error('Error adding task:', error);
    throw error;
  }
  return data;
}

export async function updateTask(id: number, updates: Partial<Task>) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('Error updating task:', error);
    throw error;
  }
  return data;
}

export async function deleteTask(id: number) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
}

// ============================================
// INCIDENTS OPERATIONS
// ============================================

export async function getIncidents(logementId?: number) {
  let query = supabase.from('incidents').select('*');
  
  if (logementId) {
    query = query.eq('logement_id', logementId);
  }
  
  const { data, error } = await query.order('date', { ascending: false });
  if (error) {
    console.error('Error fetching incidents:', error);
    return [];
  }
  return data || [];
}

export async function addIncident(incident: Omit<Incident, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('incidents')
    .insert([incident])
    .select()
    .single();
  if (error) {
    console.error('Error adding incident:', error);
    throw error;
  }
  return data;
}

export async function updateIncident(id: number, updates: Partial<Incident>) {
  const { data, error } = await supabase
    .from('incidents')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('Error updating incident:', error);
    throw error;
  }
  return data;
}

export async function deleteIncident(id: number) {
  const { error } = await supabase
    .from('incidents')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Error deleting incident:', error);
    throw error;
  }
}

// ============================================
// DAILY EVENTS OPERATIONS
// ============================================

export async function getDailyEvents(logementId: number, date?: string) {
  let query = supabase.from('daily_events').select('*').eq('logement_id', logementId);
  
  if (date) {
    query = query.eq('date', date);
  }
  
  const { data, error } = await query.order('date', { ascending: true });
  if (error) {
    console.error('Error fetching daily events:', error);
    return [];
  }
  return data || [];
}

export async function addDailyEvent(event: Omit<DailyEvent, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('daily_events')
    .insert([event])
    .select()
    .single();
  if (error) {
    console.error('Error adding daily event:', error);
    throw error;
  }
  return data;
}

export async function deleteDailyEvent(id: number) {
  const { error } = await supabase
    .from('daily_events')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Error deleting daily event:', error);
    throw error;
  }
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

export function subscribeToLogements(callback: (data: Logement[]) => void) {
  return supabase
    .channel('logements')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'logements' },
      async () => {
        const data = await getLogements();
        callback(data);
      }
    )
    .subscribe();
}

export function subscribeToRentals(callback: (data: Rental[]) => void) {
  const subscription = supabase
    .channel('rentals')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'rentals' },
      async (payload: any) => {
        const data = await getRentals();
        callback(data);
      }
    )
    .subscribe();

  return subscription;
}
