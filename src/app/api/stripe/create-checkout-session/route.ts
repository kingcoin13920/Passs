// Fichier: src/app/api/stripe/create-checkout-session/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(req: NextRequest) {
  try {
    const { amount, type, metadata } = await req.json();

    // Créer une session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: type === 'gift' 
                ? 'Carte cadeau Passworld' 
                : 'Expérience Passworld',
              description: `Voyage surprise personnalisé`,
            },
            unit_amount: amount * 100, // Stripe utilise les centimes
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/cancel`,
      metadata: metadata || {},
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Erreur Stripe:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
