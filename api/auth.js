// FORGE Auth API — Supabase Authentication
// Handles signup, login, session refresh, and profile sync
// Environment variables required:
//   SUPABASE_URL — your Supabase project URL
//   SUPABASE_ANON_KEY — your Supabase anon/public key
//   SUPABASE_SERVICE_KEY — your Supabase service role key (for admin ops)

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

function getSupabase(serviceRole = false) {
  const url = process.env.SUPABASE_URL;
  const key = serviceRole ? process.env.SUPABASE_SERVICE_KEY : process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
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
  if (req.method === 'OPTIONS') {
    return resp({}, 200);
  }

  if (req.method !== 'POST') {
    return resp({ error: 'Method not allowed' }, 405);
  }

  const supabase = getSupabase();
  if (!supabase) {
    return resp({ error: 'Auth not configured', offline: true }, 503);
  }

  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'signup': {
        const { email, password, name } = body;
        if (!email || !password) return resp({ error: 'Email and password required' }, 400);

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: name || 'Forgeur' } },
        });

        if (error) return resp({ error: error.message }, 400);
        return resp({
          user: { id: data.user?.id, email: data.user?.email },
          session: data.session,
        });
      }

      case 'login': {
        const { email, password } = body;
        if (!email || !password) return resp({ error: 'Email and password required' }, 400);

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return resp({ error: error.message }, 401);
        return resp({
          user: { id: data.user?.id, email: data.user?.email },
          session: data.session,
        });
      }

      case 'oauth_url': {
        const { provider } = body; // 'google' or 'apple'
        if (!['google', 'apple'].includes(provider)) return resp({ error: 'Invalid provider' }, 400);

        const origin = req.headers.get('origin') || 'https://forge-app.com';
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: origin + '/index.html?auth=callback' },
        });
        if (error) return resp({ error: error.message }, 400);
        return resp({ url: data.url });
      }

      case 'refresh': {
        const { refresh_token } = body;
        if (!refresh_token) return resp({ error: 'No refresh token' }, 400);

        const { data, error } = await supabase.auth.refreshSession({ refresh_token });
        if (error) return resp({ error: error.message }, 401);
        return resp({ session: data.session });
      }

      case 'logout': {
        const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
        if (token) {
          // Use service role to sign out
          const adminSb = getSupabase(true);
          if (adminSb) await adminSb.auth.admin.signOut(token).catch(() => {});
        }
        return resp({ ok: true });
      }

      default:
        return resp({ error: 'Unknown action' }, 400);
    }
  } catch (err) {
    return resp({ error: 'Auth error' }, 500);
  }
}
