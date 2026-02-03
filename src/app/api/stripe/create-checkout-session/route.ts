import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Fonction pour générer un code unique
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 9; i++) {
    if (i > 0 && i % 3 === 0) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(req: NextRequest) {
  try {
    const { amount, type, metadata } = await req.json();

    console.log('Creating Stripe session with:', { amount, type, metadata });

    // Générer un code unique pour ce paiement
    const generatedCode = generateCode();
    const travelers = metadata?.travelers || 1;

    // Construire les URLs avec les paramètres
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.headers.get('origin');
    const successUrl = `${baseUrl}?success=true&code=${generatedCode}&travelers=${travelers}&type=${type}`;
    const cancelUrl = `${baseUrl}?canceled=true`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: type === 'gift' ? 'Carte Cadeau Passworld' : 'Voyage Passworld',
              description: type === 'gift' 
                ? 'Offrez une destination surprise' 
                : 'Découvrez votre destination mystère',
            },
            unit_amount: amount * 100, // Convertir en centimes
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        type: type,
        code: generatedCode, // Sauvegarder le code dans metadata
        travelers: travelers.toString(),
        ...metadata,  // Inclure toutes les metadata
      },
    });

    console.log('Stripe session created:', session.id);
    console.log('Success URL:', successUrl);
    console.log('Generated code:', generatedCode);

    // Si c'est un voyage solo, envoyer le code par email
    if (type === 'solo' && metadata?.email) {
      console.log('Sending email to:', metadata.email);
      
      try {
        await fetch(`${baseUrl}/api/emails/send-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: metadata.email,
            code: generatedCode,
            firstName: metadata.firstName || 'Voyageur',
            travelers: travelers
          })
        });
        console.log('Email sent successfully');
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // On continue quand même, l'utilisateur aura le code dans l'URL
      }
    }

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
