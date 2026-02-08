import { NextRequest, NextResponse } from 'next/server';
import { airtableClient } from '@/lib/airtable';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Code manquant' },
        { status: 400 }
      );
    }

    // Récupérer les infos du participant et du voyage
    const participantData = await airtableClient.getParticipantWithTripInfo(code.toUpperCase());

    if (!participantData.valid) {
      return NextResponse.json(
        { error: 'Code invalide' },
        { status: 404 }
      );
    }

    // Vérifier si le voyage a une destination définie
    const tripData = participantData.tripInfo;
    
    if (!tripData?.destination) {
      return NextResponse.json(
        { 
          available: false,
          message: 'Destination pas encore disponible' 
        },
        { status: 200 }
      );
    }

    // Retourner les résultats
    return NextResponse.json({
      available: true,
      destination: tripData.destination,
      description: tripData.description || '',
      imageUrl: tripData.imageUrl || tripData.mainImage || '',
      gallery: tripData.gallery || [],
      pdfUrl: tripData.pdfUrl || '',
      departureDate: tripData.departureDate || '',
      duration: tripData.duration || '',
      nbParticipants: tripData.nbParticipants || 1,
    });

  } catch (error: any) {
    console.error('Error getting results:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
