// app/api/airtable/get-form-response/route.ts
import { NextResponse } from 'next/server';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

export async function POST(request: Request) {
  try {
    const { participantRecordId } = await request.json();
    
    console.log('📋 Récupération du formulaire pour le participant:', participantRecordId);

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      return NextResponse.json(
        { error: 'Configuration Airtable manquante' },
        { status: 500 }
      );
    }

    // Chercher la réponse du formulaire pour ce participant
    const formula = encodeURIComponent(`FIND('${participantRecordId}', ARRAYJOIN({Participant}))`);
    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Form_Responses?filterByFormula=${formula}`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Erreur lors de la recherche du formulaire' },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      return NextResponse.json(
        { error: 'Aucune réponse trouvée' },
        { status: 404 }
      );
    }

    const formResponse = data.records[0];
    const fields = formResponse.fields;

    // Helper pour convertir le texte en tableau
    const textToArray = (value: string) => {
      if (!value) return [];
      return value.split(',').map(v => v.trim()).filter(Boolean);
    };

    // Formater les données pour le formulaire
    const formData = {
      responseId: formResponse.id,
      nbVoyageurs: fields['Number of Travelers'] || '',
      enfants: fields['Children'] || '',
      villeDepart: fields['Departure City'] || '',
      dateDepart: fields['dateDepart'] || '',
      duree: fields['duree'] || '',
      budget: fields['budget'] || '',
      distance: fields['distance'] || '',
      motivations: textToArray(fields['Main Motivations'] || ''),
      motivationsDetail: fields['Motivation Details'] || '',
      voyageType: fields['Type of Trip'] || '',
      planningStyle: fields['Planning Style'] || '',
      environnements: textToArray(fields['Preferred Environments'] || ''),
      climat: fields['climat'] || '',
      paysVisites: fields['Countries Visited'] || '',
      activites: textToArray(fields['activites'] || ''),
      rythme: fields['Pace'] || '',
      problemeSante: fields['Health Issues'] || '',
      phobies: fields['Phobias'] || '',
      interdits: fields['Restrictions'] || '',
      formatRevelation: fields['Reveal Format'] || '',
      completedAt: fields['Completed At'] || '',
    };

    console.log('✅ Formulaire récupéré');

    return NextResponse.json({
      success: true,
      formData,
    });

  } catch (error) {
    console.error('❌ Erreur serveur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error.message },
      { status: 500 }
    );
  }
}
