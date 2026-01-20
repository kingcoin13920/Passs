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

    // Créer l'enregistrement dans Form_Responses
    const record = {
      fields: {
        'Participant ID': data.participantId,
        'Prénom': data.prenom,
        'Nom': data.nom,
        'Email': data.email,
        'Date Naissance': data.dateNaissance || '',
        'Nb Voyageurs': data.nbVoyageurs || '',
        'Enfants': data.enfants || '',
        'Ville Départ': data.villeDepart || '',
        'Date Départ': data.dateDepart || '',
        'Durée': data.duree || '',
        'Budget': data.budget || '',
        'Distance': data.distance || '',
        'Motivations': data.motivations || [],
        'Motivations Detail': data.motivationsDetail || '',
        'Voyage Type': data.voyageType || '',
        'Planning Style': data.planningStyle || '',
        'Environnements': data.environnements || [],
        'Climat': data.climat || '',
        'Pays Visités': data.paysVisites || '',
        'Activités': data.activites || [],
        'Rythme': data.rythme || '',
        'Problème Santé': data.problemeSante || '',
        'Phobies': data.phobies || '',
        'Interdits': data.interdits || '',
        'Format Révélation': data.formatRevelation || '',
        'Created At': new Date().toISOString(),
      },
    };

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
      console.error('❌ Erreur Airtable:', error);
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
        console.error('❌ Erreur mise à jour participant');
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
