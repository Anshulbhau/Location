const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://rpqeavqoidtwfxzmdplb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwcWVhdnFvaWR0d2Z4em1kcGxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4ODQ1MzMsImV4cCI6MjA4ODQ2MDUzM30.oi6zQgYc3MEs3-glB_aOfMCgTvBOikNzPZjyVqoRiho';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectTable() {
  console.log('Inspecting vehicle_locations table...');
  
  // Try to insert a dummy record to see exact failure
  const { error } = await supabase
    .from('vehicle_locations')
    .insert([{
      vehicle_id: '5a2187f5-fb5e-41e7-9af4-d226385ba736', // Existing vehicle ID from previous check
      latitude: 0,
      longitude: 0,
      speed: 0
    }]);

  if (error) {
    console.error('Error details:', JSON.stringify(error, null, 2));
  } else {
    console.log('Insert successful! RLS might not be the issue?');
  }
}

inspectTable();
