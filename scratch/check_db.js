const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://rpqeavqoidtwfxzmdplb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwcWVhdnFvaWR0d2Z4em1kcGxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4ODQ1MzMsImV4cCI6MjA4ODQ2MDUzM30.oi6zQgYc3MEs3-glB_aOfMCgTvBOikNzPZjyVqoRiho';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkData() {
  console.log('Checking for routes...');
  const { data: routes } = await supabase.from('routes').select('id, route_name');
  console.log('Routes:', routes);

  console.log('Checking for vehicles...');
  const { data: vehicles } = await supabase.from('vehicles').select('id, vehicle_number');
  console.log('Vehicles:', vehicles);

  console.log('Checking for active trips...');
  const { data: trips } = await supabase.from('trips').select('id, status');
  console.log('Trips:', trips);
}

checkData();
