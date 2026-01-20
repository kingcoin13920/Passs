// app/api/airtable/get-form-response/route.ts
import { NextResponse } from 'next/server';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const participantRecordId = body.participantRecordId;
    
    console.log('============================================');
    console.log('📋 GET FORM RESPONSE - DEBUT');
    console.log('📋 Participant Record ID:', participantRecordId);
    console.log('🔑 API Key présente:', !!AIRTABLE_API_KEY);
    console.log('🔑 Base ID présente:', !!AIRTABLE_BASE_ID);

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      console.error('❌ Configuration manquante');
      return NextResponse.json(
        { error: 'Configuration Airtable manquante' },
        { status: 500 }
      );
    }

    if (!participantRecordId) {
      console.error('❌ participantRecordId manquant');
      return NextResponse.json(
        { error: 'participantRecordId manquant' },
        { status: 400 }
      );
    }

    // Récupérer toutes les réponses
    console.log('🔍 Récupération de toutes les réponses...');
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Form_Responses`;
    console.log('🌐 URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      },
    });

    console.log('📡 Status de la réponse:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur Airtable:', errorText);
      return NextResponse.json(
        { error: 'Erreur lors de la recherche du formulaire', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('📦 Nombre total de réponses:', data.records?.length || 0);

    if (!data.records || data.records.length === 0) {
      console.log('⚠️ Aucune réponse dans la table');
      return NextResponse.json(
        { error: 'Aucune réponse dans la table Form_Responses' },
        { status: 404 }
      );
    }

    // Afficher tous les records pour debug
    console.log('📋 Liste des réponses:');
    data.records.forEach((record, index) => {
      const participantField = record.fields['Participant'];
      console.log(`  ${index + 1}. Response ID: ${record.id}, Participant: ${JSON.stringify(participantField)}`);
    });

    // Filtrer en JavaScript
    console.log('🔍 Recherche du record avec Participant =', participantRecordId);
    const formResponse = data.records.find(record => {
      const participantField = record.fields['Participant'];
      const isArray = Array.isArray(participantField);
      const includes = isArray && participantField.includes(participantRecordId);
      
      console.log(`  Checking record ${record.id}: Participant = ${JSON.stringify(participantField)}, isArray = ${isArray}, includes = ${includes}`);
      
      return participantField && isArray && includes;
    });

    if (!formResponse) {
      console.log('❌ Aucune réponse trouvée pour ce participant');
      console.log('💡 participantRecordId cherché:', participantRecordId);
      console.log('💡 Vérifiez que le participant a bien complété le formulaire');
      return NextResponse.json(
        { error: 'Aucune réponse trouvée pour ce participant' },
        { status: 404 }
      );
    }

    console.log('✅ Réponse trouvée:', formResponse.id);

    const fields = formResponse.fields;

    // Helper pour convertir le texte en tableau
    const textToArray = (value) => {
      if (!value) return [];
      if (typeof value !== 'string') return [];
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

    console.log('✅ Formulaire récupéré avec succès');
    console.log('============================================');

    return NextResponse.json({
      success: true,
      formData,
    });

  } catch (error) {
    console.error('❌ ERREUR SERVEUR:', error);
    console.error('Stack:', error.stack);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error.message },
      { status: 500 }
    );
  }
}
