// FORGE Stripe Checkout — Vercel Serverless Function
import Stripe from 'stripe';

export const config = { runtime: 'nodejs' };

const PLAN_PRICES = {
  starter: process.env.STRIPE_PRICE_STARTER  || '',
  premium: process.env.STRIPE_PRICE_PREMIUM  || 'price_1TFsaKJK83rBK9aJcKAax3Be',
  pro:     process.env.STRIPE_PRICE_PREMIUM  || 'price_1TFsaKJK83rBK9aJcKAax3Be',
  elite:   process.env.STRIPE_PRICE_ELITE    || 'price_1TFsfRJK83rBK9aJNd5bziY2',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
    });
  }

  if (req.method !== 'POST') {
    return resp({ error: 'Method not allowed' }, 405);
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return resp({ error: 'Payment not configured' }, 500);
  }

  try {
    const { plan, email, name } = await req.json();

    const priceId = plan && PLAN_PRICES[plan];
    if (!priceId) {
      return resp({ error: 'Invalid plan' }, 400);
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

    if (email) sessionParams.customer_email = email;

    const session = await stripe.checkout.sessions.create(sessionParams);
    return resp({ url: session.url });
  } catch (err) {
    return resp({ error: 'Payment error' }, 500);
  }
}

function resp(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
