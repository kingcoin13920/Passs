// app/api/airtable/update-form/route.ts
import { NextResponse } from 'next/server';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    console.log('🔄 Mise à jour du formulaire:', data.responseId);

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      return NextResponse.json(
        { error: 'Configuration Airtable manquante' },
        { status: 500 }
      );
    }

    // Helper pour convertir les tableaux en texte
    const arrayToText = (value: any) => {
      if (!value) return '';
      if (Array.isArray(value)) return value.join(', ');
      return String(value);
    };

    // Créer le record de mise à jour
    const record = {
      id: data.responseId,
      fields: {
        'Number of Travelers': data.nbVoyageurs || '',
        'Children': data.enfants || '',
        'Departure City': data.villeDepart || '',
        'dateDepart': data.dateDepart || '',
        'duree': data.duree || '',
        'budget': data.budget || '',
        'distance': data.distance || '',
        'Main Motivations': arrayToText(data.motivations),
        'Motivation Details': data.motivationsDetail || '',
        'Type of Trip': data.voyageType || '',
        'Planning Style': data.planningStyle || '',
        'Preferred Environments': arrayToText(data.environnements),
        'climat': data.climat || '',
        'Countries Visited': data.paysVisites || '',
        'activites': arrayToText(data.activites),
        'Pace': data.rythme || '',
        'Health Issues': data.problemeSante || '',
        'Phobias': data.phobies || '',
        'Restrictions': data.interdits || '',
        'Reveal Format': data.formatRevelation || '',
        'Completed At': new Date().toISOString(),
      },
    };

    console.log('📋 Record à mettre à jour:', JSON.stringify(record, null, 2));

    // Mettre à jour dans Airtable
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Form_Responses`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records: [record] }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Erreur Airtable:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('✅ Formulaire mis à jour');

    return NextResponse.json({ success: true, record: result.records[0] });

  } catch (error) {
    console.error('❌ Erreur serveur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error.message },
      { status: 500 }
    );
  }
}
