// app/api/airtable/get-group-status/route.ts
import { NextResponse } from 'next/server';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

export async function POST(request: Request) {
  try {
    const { code } = await request.json();
    
    console.log('📊 Récupération du statut du groupe pour le code:', code);

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
      return NextResponse.json(
        { error: 'Configuration Airtable manquante' },
        { status: 500 }
      );
    }

    // 1. Trouver le participant avec ce code
    const participantFormula = encodeURIComponent(`{code} = '${code}'`);
    const participantResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Participants?filterByFormula=${participantFormula}`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        },
      }
    );

    if (!participantResponse.ok) {
      return NextResponse.json(
        { error: 'Erreur lors de la recherche du participant' },
        { status: participantResponse.status }
      );
    }

    const participantData = await participantResponse.json();

    if (!participantData.records || participantData.records.length === 0) {
      return NextResponse.json(
        { error: 'Participant non trouvé' },
        { status: 404 }
      );
    }

    const participant = participantData.records[0];
    const tripId = participant.fields['Trip ID'];

    console.log('✅ Participant trouvé:', participant.fields['Prenom'], 'Trip ID:', tripId);

    // 2. Si pas de Trip ID, retourner juste le participant
    if (!tripId || !Array.isArray(tripId) || tripId.length === 0) {
      return NextResponse.json({
        participant: {
          id: participant.id,
          prenom: participant.fields['Prenom'] || '',
          nom: participant.fields['Nom'] || '',
          email: participant.fields['Email'] || '',
          code: participant.fields['code'] || '',
          formStatus: participant.fields['Form Status'] || 'not_started',
        },
        groupParticipants: [],
        hasGroup: false,
        canModifyForm: true, // Peut toujours modifier si pas de groupe
      });
    }

    // 3. Récupérer TOUS les participants (pas de filtre) puis filtrer en JS
    console.log('🔍 Récupération de tous les participants...');
    const allParticipantsResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Participants`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        },
      }
    );

    if (!allParticipantsResponse.ok) {
      return NextResponse.json(
        { error: 'Erreur lors de la recherche du groupe' },
        { status: allParticipantsResponse.status }
      );
    }

    const allParticipantsData = await allParticipantsResponse.json();
    
    // 4. Filtrer en JavaScript pour trouver ceux qui ont le même Trip ID
    const tripRecordId = tripId[0];
    console.log('🔍 Recherche des participants avec Trip ID:', tripRecordId);
    
    const groupParticipants = allParticipantsData.records
      .filter(p => {
        const pTripId = p.fields['Trip ID'];
        const hasSameTripId = pTripId && Array.isArray(pTripId) && pTripId.includes(tripRecordId);
        if (hasSameTripId) {
          console.log('✅ Participant trouvé dans le groupe:', p.fields['Prenom']);
        }
        return hasSameTripId;
      })
      .map(p => ({
        id: p.id,
        prenom: p.fields['Prenom'] || '',
        nom: p.fields['Nom'] || '',
        email: p.fields['Email'] || '',
        code: p.fields['code'] || '',
        formStatus: p.fields['Form Status'] || 'not_started',
        isCurrentUser: p.id === participant.id,
      }));

    console.log('📋 Participants du groupe:', groupParticipants.length);

    // 5. Vérifier si le participant peut modifier son formulaire
    // Règle: Peut modifier SI tous les autres n'ont pas encore soumis
    const otherParticipants = groupParticipants.filter(p => p.id !== participant.id);
    const someoneElseCompleted = otherParticipants.some(p => p.formStatus === 'completed');
    const canModifyForm = !someoneElseCompleted;

    console.log('✅ Groupe trouvé:', groupParticipants.length, 'participants');
    console.log('🔒 Peut modifier?', canModifyForm);

    return NextResponse.json({
      participant: {
        id: participant.id,
        prenom: participant.fields['Prenom'] || '',
        nom: participant.fields['Nom'] || '',
        email: participant.fields['Email'] || '',
        code: participant.fields['code'] || '',
        formStatus: participant.fields['Form Status'] || 'not_started',
      },
      groupParticipants,
      hasGroup: groupParticipants.length > 1,
      canModifyForm,
      tripRecordId,
    });

  } catch (error) {
    console.error('❌ Erreur serveur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error.message },
      { status: 500 }
    );
  }
}
