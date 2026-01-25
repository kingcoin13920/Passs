// app/api/airtable/update-gift-card-status/route.ts
import { NextResponse } from 'next/server';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

export async function POST(request: Request) {
  try {
    const { giftCardId, status } = await request.json();

    console.log('🎁 Mise à jour carte cadeau:', giftCardId, '→', status);

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      return NextResponse.json(
        { error: 'Configuration Airtable manquante' },
        { status: 500 }
      );
    }

    if (!giftCardId || !status) {
      return NextResponse.json(
        { error: 'giftCardId et status requis' },
        { status: 400 }
      );
    }

    // Mettre à jour le statut dans Airtable
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Gift_Cards`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: [{
            id: giftCardId,
            fields: {
              'Status': status,
            }
          }]
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur Airtable:', errorText);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Carte cadeau mise à jour:', data);

    return NextResponse.json({
      success: true,
      giftCard: data.records[0]
    });

  } catch (error) {
    console.error('❌ Erreur serveur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error.message },
      { status: 500 }
    );
  }
}
