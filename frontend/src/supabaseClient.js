import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://uukorrkzinqbjntmcoii.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1a29ycmt6aW5xYmpudG1jb2lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDUxNDEsImV4cCI6MjA3ODA4MTE0MX0.hxhUTr8SFrxnncARpMw8K2a2l-hQj_8TsGKH9IIYOlc";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function insertOnboarding({ clientUserId, name, age, profession }) {
  return supabase
    .from('onboarding')
    .insert([{ client_user_id: clientUserId, name, age, profession }])
    .select()
    .single();
}

export async function insertDocumentSummary({ clientUserId, title, pages, chunks, contractId }) {
  return supabase
    .from('documents')
    .insert([{ client_user_id: clientUserId, title, pages, chunks, contract_id: contractId }])
    .select()
    .single();
}

export async function insertQuestionAnswer({ clientUserId, contractId, question, answer }) {
  return supabase
    .from('qa')
    .insert([{ client_user_id: clientUserId, contract_id: contractId, question, answer }])
    .select()
    .single();
}


