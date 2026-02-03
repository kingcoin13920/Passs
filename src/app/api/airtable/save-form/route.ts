// app/api/airtable/save-form/route.ts
import { NextResponse } from 'next/server';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    console.log('💾 Sauvegarde du formulaire:', data);

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

    // Créer l'enregistrement dans Form_Responses avec les VRAIS noms de colonnes
    const record = {
      fields: {
        'Participant': data.participantRecordId ? [data.participantRecordId] : [], // Lien vers le participant
        'Number of Travelers': data.nbVoyageurs || '',
        'Children': data.enfants || '',
        'Departure City': data.villeDepart || '',
        'dateDepart': data.dateDepart || '',
        'duree': data.duree || '',
        'budget': data.budget || '',
        'distance': data.distance || '',
        'Main Motivations': arrayToText(data.motivations), // Converti en texte
        'Motivation Details': data.motivationsDetail || '',
        'Type of Trip': arrayToText(data.voyageType),
        'Planning Style': arrayToText(data.planningStyle) '',
        'Preferred Environments': arrayToText(data.environnements), // Converti en texte
        'climat': data.climat || '',
        'Countries Visited': data.paysVisites || '',
        'activites': arrayToText(data.activites), // Converti en texte
        'Pace': data.rythme || '',
        'Health Issues': data.problemeSante || '',
        'Phobias': data.phobies || '',
        'Restrictions': data.interdits || '',
        'Reveal Format': data.formatRevelation || '',
        'Completed At': new Date().toISOString(),
      },
    };

    console.log('📋 Record à envoyer:', JSON.stringify(record, null, 2));

    // Sauvegarder dans Airtable
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Form_Responses`,
      {
        method: 'POST',
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
      console.error('❌ Status:', response.status);
      return NextResponse.json(
        { error: 'Erreur lors de la sauvegarde', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('✅ Formulaire sauvegardé:', result);

    // Mettre à jour le statut du participant
    if (data.participantRecordId) {
      const updateResponse = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Participants`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            records: [{
              id: data.participantRecordId,
              fields: { 'Form Status': 'completed' }
            }]
          }),
        }
      );

      if (!updateResponse.ok) {
        const updateError = await updateResponse.json();
        console.error('❌ Erreur mise à jour participant:', updateError);
      } else {
        console.log('✅ Statut participant mis à jour');
      }
    }

    return NextResponse.json({ success: true, record: result.records[0] });

  } catch (error) {
    console.error('❌ Erreur serveur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error.message },
      { status: 500 }
    );
  }
}
