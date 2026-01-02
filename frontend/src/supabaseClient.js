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

export async function insertClauseVersion({
  clientUserId,
  contractId,
  clauseIndex,
  originalText,
  aiSuggestion,
  finalText,
  status,
  notes,
  counterpartyFeedback,
}) {
  return supabase
    .from('clause_versions')
    .insert([{
      client_user_id: clientUserId,
      contract_id: contractId,
      clause_index: clauseIndex,
      original_text: originalText,
      ai_suggestion: aiSuggestion,
      final_text: finalText,
      status,
      notes,
      counterparty_feedback: counterpartyFeedback,
    }])
    .select()
    .single();
}

export async function fetchClauseVersions({ clientUserId, contractId, clauseIndex }) {
  let query = supabase
    .from('clause_versions')
    .select('*')
    .eq('client_user_id', clientUserId)
    .eq('contract_id', contractId)
    .order('created_at', { ascending: false });

  if (clauseIndex !== undefined && clauseIndex !== null) {
    query = query.eq('clause_index', clauseIndex);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}


