import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace these with your actual Supabase credentials
// Get these from your Supabase project settings: https://app.supabase.com/project/_/settings/api
const SUPABASE_URL = 'https://rpqeavqoidtwfxzmdplb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwcWVhdnFvaWR0d2Z4em1kcGxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4ODQ1MzMsImV4cCI6MjA4ODQ2MDUzM30.oi6zQgYc3MEs3-glB_aOfMCgTvBOikNzPZjyVqoRiho';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// Create a new vehicle
export const createVehicle = async (id, vehicleNumber, capacity = 40) => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .insert([{ id, vehicle_number: vehicleNumber, capacity, vehicle_type: 'bus' }])
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('Error creating vehicle:', err);
    return { success: false, error: err };
  }
};
// Fetch all available vehicles
export const fetchVehicles = async () => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*');
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('Error fetching vehicles:', err);
    return { success: false, error: err };
  }
};

// Fetch profile by phone number (acting as a simple ID for now)
export const fetchProfileByPhone = async (phone) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', phone)
      .single();
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is 'no rows found'
    return { success: true, data };
  } catch (err) {
    console.error('Error fetching profile:', err);
    return { success: false, error: err };
  }
};

// Create a new profile
export const createProfile = async (id, name, phone, email) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert([{ id, name, phone, email, role: 'driver' }])
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('Error creating profile:', err);
    return { success: false, error: err };
  }
};

// Insert location data into the database
export const insertLocationData = async (vehicleId, latitude, longitude, speed) => {
  try {
    const { data, error } = await supabase
      .from('vehicle_locations')
      .insert([
        {
          vehicle_id: vehicleId,
          latitude: latitude,
          longitude: longitude,
          speed: speed,
          recorded_at: new Date().toISOString(),
        },
      ]);

    if (error) {
      console.error('Error inserting location:', error);
      return { success: false, error };
    }

    console.log('Location inserted successfully');
    return { success: true, data };
  } catch (err) {
    console.error('Exception inserting location:', err);
    return { success: false, error: err };
  }
};

// Fetch all available routes
export const fetchRoutes = async () => {
  try {
    const { data, error } = await supabase
      .from('routes')
      .select('*');
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('Error fetching routes:', err);
    return { success: false, error: err };
  }
};

// Fetch stops for a specific route in order
export const fetchRouteStops = async (routeId) => {
  try {
    const { data, error } = await supabase
      .from('route_stops')
      .select(`
        stop_id,
        stop_order,
        stops (
          id,
          stop_name,
          latitude,
          longitude
        )
      `)
      .eq('route_id', routeId)
      .order('stop_order', { ascending: true });
    
    if (error) throw error;
    
    // Flatten the nested stops data
    const formattedStops = data.map(item => ({
      id: item.stops.id,
      name: item.stops.stop_name,
      latitude: item.stops.latitude,
      longitude: item.stops.longitude,
      order: item.stop_order
    }));

    return { success: true, data: formattedStops };
  } catch (err) {
    console.error('Error fetching route stops:', err);
    return { success: false, error: err };
  }
};

// Start a new trip
export const startTrip = async (vehicleId, routeId, direction) => {
  try {
    // 1. Get the driver assigned to the selected vehicle
    const { data: vehicleData } = await supabase
      .from('vehicles')
      .select('driver_id')
      .eq('id', vehicleId)
      .single();
    
    if (!vehicleData || !vehicleData.driver_id) {
      throw new Error('No driver assigned to this vehicle. Please assign a driver in the Admin portal.');
    }

    const driverId = vehicleData.driver_id;

    // 2. Insert trip
    const { data, error } = await supabase
      .from('trips')
      .insert([
        {
          vehicle_id: vehicleId,
          route_id: routeId,
          driver_id: driverId,
          status: 'running',
          direction: direction || 'onward',
          start_time: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('Error starting trip:', err);
    return { success: false, error: err };
  }
};

// End an ongoing trip
export const endTrip = async (tripId) => {
  try {
    const { data, error } = await supabase
      .from('trips')
      .update({
        status: 'completed',
        end_time: new Date().toISOString()
      })
      .eq('id', tripId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('Error ending trip:', err);
    return { success: false, error: err };
  }
};
