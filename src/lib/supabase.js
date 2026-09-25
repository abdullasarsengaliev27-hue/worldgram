import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xwtebvckabpuknvfpyqx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3dGVidmNrYWJwdWtudmZweXF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxOTQ5NzEsImV4cCI6MjA5Nzc3MDk3MX0.ggeuZznSS1ZR6L8kIgMhG93khJJaoZ4MAYJKs-Z4kJk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
