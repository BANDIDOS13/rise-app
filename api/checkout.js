// FORGE Stripe Checkout — Vercel Serverless Function
import Stripe from 'stripe';

export const config = { runtime: 'edge' };

// Map FORGE plan IDs to Stripe Price IDs
const PLAN_PRICES = {
  starter: process.env.STRIPE_PRICE_STARTER  || '',
  premium: process.env.STRIPE_PRICE_PREMIUM  || 'price_1TFsaKJK83rBK9aJcKAax3Be',
  pro:     process.env.STRIPE_PRICE_PREMIUM  || 'price_1TFsaKJK83rBK9aJcKAax3Be',
  elite:   process.env.STRIPE_PRICE_ELITE    || 'price_1TFsfRJK83rBK9aJNd5bziY2',
};

const ALLOWED_ORIGINS = [/\.vercel\.app$/, /forge-app\.com$/, /localhost/];

function getCorsOrigin(req) {
  const origin = req.headers.get('origin') || '';
  return ALLOWED_ORIGINS.some(p => p.test(origin)) ? origin : '';
}

export default async function handler(req) {
  const corsOrigin = getCorsOrigin(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: { 'Access-Control-Allow-Origin': corsOrigin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
    });
  }

  if (req.method !== 'POST') {
    return resp({ error: 'Method not allowed' }, 405, corsOrigin);
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return resp({ error: 'Payment not configured' }, 500, corsOrigin);
  }

  try {
    const { plan, email, name } = await req.json();

    const priceId = plan && PLAN_PRICES[plan];
    if (!priceId) {
      return resp({ error: 'Invalid plan' }, 400, corsOrigin);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });

    const origin = req.headers.get('origin') || 'https://forge-app.com';

    const sessionParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: origin + '/index.html?payment=success&plan=' + plan,
      cancel_url: origin + '/index.html?payment=cancel',
      metadata: { plan, name: name || '' },
    };

    if (email) {
      sessionParams.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return resp({ url: session.url }, 200, corsOrigin);
  } catch (err) {
    return resp({ error: 'Payment error' }, 500, corsOrigin);
  }
}

function resp(obj, status = 200, origin = '') {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin || '' },
  });
}
