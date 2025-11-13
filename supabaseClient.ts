import { createClient } from '@supabase/supabase-js'

// In a real-world scenario, these values should come from environment variables.
const supabaseUrl = 'https://gbzofjrfllxjxywcnfmr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdiem9manJmbGx4anh5d2NuZm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NDA1ODcsImV4cCI6MjA3NzUxNjU4N30.-T96i_tKb9YjLHnniYlR-Ar606sJ5YR3593cuUU5KcA';

export const supabase = createClient(supabaseUrl, supabaseKey);
