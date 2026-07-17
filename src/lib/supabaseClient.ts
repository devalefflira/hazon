import { createClient } from '@supabase/supabase-js';

// Substitua pelas credenciais reais do seu painel do Supabase
const supabaseUrl = 'https://fsljeawnuxqczemtcgyy.supabase.co/';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbGplYXdudXhxY3plbXRjZ3l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4ODcwNDQsImV4cCI6MjA5NTQ2MzA0NH0.PypbiVo7fTCrXrMgA5shBsGSv9GLAwdi0fstDjbzs0g';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);