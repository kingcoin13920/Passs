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

    const arrayToText = (value: any) => {
      if (!value) return '';
      if (Array.isArray(value)) return value.join(', ');
      return String(value);
    };

    // Créer l'enregistrement dans Form_Responses
    const record = {
      fields: {
        'Participant': data.participantRecordId ? [data.participantRecordId] : [],
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
      return NextResponse.json(
        { error: 'Erreur lors de la sauvegarde', details: error },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('✅ Formulaire sauvegardé:', result);

    // Mettre à jour le statut du participant ET vérifier le statut du voyage
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
      
      // ✅ VÉRIFIER ET METTRE À JOUR LE STATUT DU VOYAGE
      try {
        // 1. Récupérer le participant pour avoir son Trip ID
        const participantResponse = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Participants/${data.participantRecordId}`,
          {
            headers: {
              'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            },
          }
        );
        
        const participantData = await participantResponse.json();
        const tripIds = participantData.fields['Trip ID'];
        
        if (tripIds && tripIds.length > 0) {
          const tripId = tripIds[0];
          
          // 2. Récupérer le voyage
          const tripResponse = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Voyages/${tripId}`,
            {
              headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
              },
            }
          );
          
          const tripData = await tripResponse.json();
          const tripType = tripData.fields['Type']; // "solo" ou "group"
          const participantIds = tripData.fields['Participants'] || [];
          
          // 3. Vérifier si tous les participants ont complété
          let allCompleted = true;
          
          if (tripType === 'solo') {
            allCompleted = true;
          } else {
            // Pour un groupe, vérifier tous les participants
            const participantsResponse = await fetch(
              `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Participants?` + 
              new URLSearchParams({
                filterByFormula: `OR(${participantIds.map(id => `RECORD_ID()='${id}'`).join(',')})`
              }),
              {
                headers: {
                  'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                },
              }
            );
            
            const participantsData = await participantsResponse.json();
            
            allCompleted = participantsData.records.every(
              p => p.fields['Form Status'] === 'completed'
            );
          }
          
          // 4. Mettre à jour le statut du voyage
          if (allCompleted) {
            const updateTripResponse = await fetch(
              `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Voyages`,
              {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  records: [{
                    id: tripId,
                    fields: { 'Status': 'completed' }
                  }]
                }),
              }
            );
            
            if (updateTripResponse.ok) {
              console.log('✅ Statut du voyage mis à jour: completed');
            } else {
              const error = await updateTripResponse.json();
              console.error('❌ Erreur mise à jour voyage:', error);
            }
          } else {
            console.log('ℹ️ Tous les participants n\'ont pas encore complété');
          }
        }
      } catch (error) {
        console.error('❌ Erreur vérification statut voyage:', error);
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
