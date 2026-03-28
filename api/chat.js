// RISE AI Coach — Vercel Serverless API
// This endpoint connects to a real AI (Claude or GPT) for intelligent coaching
// Deploy: push to GitHub, Vercel auto-deploys /api/chat.js as a serverless function
//
// SETUP: Add your API key in Vercel Dashboard → Settings → Environment Variables
//   ANTHROPIC_API_KEY=sk-ant-... (for Claude)
//   or OPENAI_API_KEY=sk-... (for GPT)

export const config = { runtime: 'edge' };

const SYSTEM_PROMPT = `Tu es RISE Coach, un coach de vie IA intégré dans l'app RISE — AI Life OS.

TON RÔLE:
- Coach motivationnel, bienveillant mais direct
- Expert en: sport, nutrition, business, finances, productivité, bien-être mental, relations
- Tu tutoies toujours l'utilisateur
- Réponses structurées avec emojis, listes, plans d'action concrets
- Tu donnes des VRAIS conseils actionnables, pas du blabla

CONTEXTE UTILISATEUR (fourni dynamiquement):
- Nom, âge, objectifs, niveau, streak, historique

RÈGLES:
- Jamais de réponse générique ou vague
- Toujours un plan d'action concret avec des étapes
- Adapte le niveau au profil (débutant vs avancé)
- Encourage mais ne mens jamais
- Si tu ne sais pas, dis-le et redirige
- Termine par une question ou un call-to-action
- Réponses en français sauf si on te parle en anglais
- Maximum 300 mots par réponse (concis et dense)`;

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { message, context, history } = await req.json();

    const userContext = context
      ? `\n\nPROFIL: ${context.name || 'Champion'}, ${context.age || '?'} ans. Objectif: ${context.goal || 'all'}. Niveau: ${context.level || 1}. Streak: ${context.streak || 0} jours. XP: ${context.xp || 0}.`
      : '';

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (anthropicKey) {
      return await callClaude(anthropicKey, message, userContext, history || []);
    } else if (openaiKey) {
      return await callGPT(openaiKey, message, userContext, history || []);
    } else {
      return new Response(JSON.stringify({
        reply: null,
        fallback: true,
        error: 'No API key configured. Using local AI engine.'
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({
      reply: null,
      fallback: true,
      error: err.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

async function callClaude(apiKey, message, userContext, history) {
  const messages = [
    ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message }
  ];

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: SYSTEM_PROMPT + userContext,
      messages,
    }),
  });

  const data = await res.json();
  const reply = data.content?.[0]?.text || null;

  return new Response(JSON.stringify({ reply, fallback: !reply }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

async function callGPT(apiKey, message, userContext, history) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + userContext },
    ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message }
  ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 800,
      messages,
    }),
  });

  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content || null;

  return new Response(JSON.stringify({ reply, fallback: !reply }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
