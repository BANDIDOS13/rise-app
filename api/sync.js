// FORGE Data Sync API — Supabase Persistence
// Syncs user progress data between localStorage and Supabase
// Environment variables: SUPABASE_URL, SUPABASE_ANON_KEY

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

function getSupabase(token) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const sb = createClient(url, key, {
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  });
  return sb;
}

function resp(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return resp({}, 200);
  if (req.method !== 'POST') return resp({ error: 'Method not allowed' }, 405);

  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return resp({ error: 'Not authenticated' }, 401);

  const supabase = getSupabase(token);
  if (!supabase) return resp({ error: 'Sync not configured', offline: true }, 503);

  try {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return resp({ error: 'Invalid session' }, 401);

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'save': {
        // Save user progress to Supabase
        const { progress } = body;
        if (!progress) return resp({ error: 'No data to save' }, 400);

        // Sanitize: remove overly large fields, cap size
        const sanitized = { ...progress };
        delete sanitized.chatH; // Don't persist full chat history to DB
        const json = JSON.stringify(sanitized);
        if (json.length > 500000) return resp({ error: 'Data too large' }, 413);

        const { error } = await supabase
          .from('user_progress')
          .upsert({
            user_id: user.id,
            data: sanitized,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (error) return resp({ error: error.message }, 500);
        return resp({ ok: true, ts: Date.now() });
      }

      case 'load': {
        // Load user progress from Supabase
        const { data, error } = await supabase
          .from('user_progress')
          .select('data, updated_at')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
          return resp({ error: error.message }, 500);
        }

        return resp({
          progress: data?.data || null,
          server_ts: data?.updated_at || null,
        });
      }

      case 'delete': {
        // Delete all user data (RGPD right to erasure)
        await supabase.from('user_progress').delete().eq('user_id', user.id);
        // Delete auth user via service role
        const serviceUrl = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_KEY;
        if (serviceUrl && serviceKey) {
          const adminSb = createClient(serviceUrl, serviceKey);
          await adminSb.auth.admin.deleteUser(user.id).catch(() => {});
        }
        return resp({ ok: true, deleted: true });
      }

      default:
        return resp({ error: 'Unknown action' }, 400);
    }
  } catch (err) {
    return resp({ error: 'Sync error' }, 500);
  }
}
