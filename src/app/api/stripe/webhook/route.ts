// app/api/stripe/webhook/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

// Générer un code unique de 6 caractères
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    // Vérifier la signature du webhook
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('❌ Erreur signature webhook:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('🔔 Webhook Stripe reçu:', event.type);

    // Gérer l'événement de paiement réussi
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log('💰 Paiement réussi:', session.id);
      console.log('📋 Metadata:', session.metadata);

      // Récupérer les métadonnées
      const metadata = session.metadata;
      
      if (!metadata || !metadata.type) {
        console.log('⚠️ Pas de metadata, ignorer');
        return NextResponse.json({ received: true });
      }

      // Gérer les paiements de groupe
      if (metadata.type === 'group') {
        await handleGroupPayment(session, metadata);
      }
      
      // Gérer les paiements solo
      if (metadata.type === 'solo') {
        await handleSoloPayment(session, metadata);
      }
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('❌ Erreur webhook:', error);
    return NextResponse.json(
      { error: 'Webhook error', details: error.message },
      { status: 500 }
    );
  }
}

async function handleGroupPayment(session: Stripe.Checkout.Session, metadata: any) {
  try {
    console.log('👥 Traitement paiement groupe');
    
    const participants = JSON.parse(metadata.participants);
    const nbParticipants = parseInt(metadata.nbParticipants);
    
    console.log(`📊 ${nbParticipants} participants à créer`);

    // 1. Créer le voyage dans Airtable
    const tripId = `TRIP-${Date.now()}`;
    const tripResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Voyages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: [{
            fields: {
              'Trip ID': tripId,
              'Payment Status': 'paid',
              'Payment Amount': session.amount_total ? session.amount_total / 100 : 0,
              'Created At': new Date().toISOString(),
            }
          }]
        }),
      }
    );

    if (!tripResponse.ok) {
      throw new Error('Failed to create trip');
    }

    const tripData = await tripResponse.json();
    const tripRecordId = tripData.records[0].id;
    console.log('✅ Voyage créé:', tripRecordId);

    // 2. Créer les participants avec leurs codes
    const participantRecords = participants.map((p: any) => ({
      fields: {
        'Prenom': p.prenom,
        'Nom': p.nom,
        'Email': p.email,
        'code': generateCode(),
        'Trip ID': [tripRecordId],
        'Form Status': 'pending',
      }
    }));

    const participantsResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Participants`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records: participantRecords }),
      }
    );

    if (!participantsResponse.ok) {
      throw new Error('Failed to create participants');
    }

    const participantsData = await participantsResponse.json();
    console.log('✅ Participants créés:', participantsData.records.length);

    // 3. Envoyer les emails
    const participantsWithCodes = participantsData.records.map((record: any) => ({
      prenom: record.fields.Prenom,
      nom: record.fields.Nom,
      email: record.fields.Email,
      code: record.fields.code,
    }));

    const emailResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://passs-two.vercel.app'}/api/emails/send-participant-codes`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participants: participantsWithCodes,
          tripId: tripRecordId,
        }),
      }
    );

    if (emailResponse.ok) {
      console.log('✅ Emails envoyés avec succès');
    } else {
      console.error('❌ Erreur envoi emails');
    }

  } catch (error) {
    console.error('❌ Erreur handleGroupPayment:', error);
  }
}

async function handleSoloPayment(session: Stripe.Checkout.Session, metadata: any) {
  try {
    console.log('👤 Traitement paiement solo');
    
    // Récupérer les infos du client depuis Stripe
    const customerEmail = session.customer_details?.email;
    const customerName = session.customer_details?.name || '';
    const [prenom, ...nomParts] = customerName.split(' ');
    const nom = nomParts.join(' ');

    // Créer le voyage
    const tripId = `TRIP-${Date.now()}`;
    const tripResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Voyages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: [{
            fields: {
              'Trip ID': tripId,
              'Payment Status': 'paid',
              'Payment Amount': session.amount_total ? session.amount_total / 100 : 0,
              'Created At': new Date().toISOString(),
            }
          }]
        }),
      }
    );

    const tripData = await tripResponse.json();
    const tripRecordId = tripData.records[0].id;

    // Créer le participant
    const code = generateCode();
    const participantResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Participants`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: [{
            fields: {
              'Prenom': prenom || 'Voyageur',
              'Nom': nom || '',
              'Email': customerEmail,
              'code': code,
              'Trip ID': [tripRecordId],
              'Form Status': 'pending',
            }
          }]
        }),
      }
    );

    console.log('✅ Participant solo créé');

    // Envoyer l'email
    await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://passs-two.vercel.app'}/api/emails/send-participant-codes`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participants: [{
            prenom: prenom || 'Voyageur',
            nom: nom || '',
            email: customerEmail,
            code: code,
          }],
          tripId: tripRecordId,
        }),
      }
    );

    console.log('✅ Email solo envoyé');

  } catch (error) {
    console.error('❌ Erreur handleSoloPayment:', error);
  }
}
