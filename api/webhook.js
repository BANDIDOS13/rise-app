// FORGE Stripe Webhook — Vercel Serverless Function
// Handles subscription lifecycle events from Stripe
// Persists subscription status to Supabase

import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return new Response('Webhook not configured', { status: 400 });
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

    const supabase = getSupabaseAdmin();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const plan = session.metadata?.plan || 'premium';
        const email = session.customer_email;
        console.log('FORGE: Checkout completed', plan, email);

        // Persist subscription in Supabase if available
        if (supabase && email) {
          // Find user by email
          const { data: users } = await supabase.auth.admin.listUsers();
          const user = users?.users?.find(u => u.email === email);
          if (user) {
            await supabase.from('subscriptions').upsert({
              id: session.subscription || session.id,
              user_id: user.id,
              plan: plan,
              status: 'active',
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
              current_period_end: null,
            }, { onConflict: 'id' });

            // Also update user_progress plan field
            const { data: progress } = await supabase.from('user_progress').select('data').eq('user_id', user.id).single();
            if (progress?.data) {
              const updated = { ...progress.data, plan: plan, planDate: new Date().toDateString() };
              await supabase.from('user_progress').update({ data: updated }).eq('user_id', user.id);
            }
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        console.log('FORGE: Subscription updated', sub.id, sub.status);
        if (supabase) {
          await supabase.from('subscriptions').update({
            status: sub.status,
            current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
          }).eq('stripe_subscription_id', sub.id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        console.log('FORGE: Subscription cancelled', sub.id);
        if (supabase) {
          await supabase.from('subscriptions').update({
            status: 'cancelled',
            plan: 'free',
          }).eq('stripe_subscription_id', sub.id);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log('FORGE: Payment failed', invoice.customer_email);
        break;
      }

      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response('Webhook error: ' + err.message, { status: 400 });
  }
}
