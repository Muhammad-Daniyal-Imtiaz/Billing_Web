import { createClient } from '@supabase/supabase-js';

// Use anon key for all operations (more secure)
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Helper to get auth headers
export const getAuthHeaders = (accessToken: string) => ({
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
});

// For admin operations (optional - use custom API key)
export const isAdminRequest = (apiKey: string | undefined): boolean => {
  return apiKey === process.env.ADMIN_API_KEY;
};