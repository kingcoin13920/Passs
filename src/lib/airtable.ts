const AIRTABLE_API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;



const TABLES = {
  VOYAGES: 'Voyages',
  PARTICIPANTS: 'Participants',
  FORM_RESPONSES: 'Form_Responses',
  GIFT_CARDS: 'Gift_Cards'
};

interface AirtableRecord {
  id?: string;
  fields: Record<string, any>;
}

class AirtableClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;
  }

  private async request(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Airtable API error: ${JSON.stringify(error)}`);
    }

    return response.json();
  }

 async createTrip(data: {
  tripId: string;
  type: string;
  nbParticipants: number;
  amount: number;
  paymentStatus: string;
  criteriaOrder?: string[];
}) {
  const record = {
    fields: {
      'Trip ID': data.tripId,
      'Type': data.type,
      'Nb Participants': data.nbParticipants,
      'Amount': data.amount,
      'Status': 'pending',
      'Payment Status': data.paymentStatus,
      'Criteria Order': data.criteriaOrder ? JSON.stringify(data.criteriaOrder) : '',
    },
  };

  const result = await this.request('POST', `/${TABLES.VOYAGES}`, { records: [record] });
  return result.records[0];
}

// Créer un participant
async createParticipant(data: {
  tripId: string | string[];
  code: string;
  prenom: string;
  nom: string;
  email: string;
  paymentStatus: string;
}) {
  const record = {
    fields: {
      'Trip ID': Array.isArray(data.tripId) ? data.tripId : [data.tripId],
      'Code': data.code,
      'Prenom': data.prenom,
      'Nom': data.nom,
      'Email': data.email,
      'Payment Status': data.paymentStatus,
      'Form Status': 'pending',
    },
  };

  const result = await this.request('POST', `/${TABLES.PARTICIPANTS}`, { records: [record] });
  return result.records[0];
}

  // Créer une carte cadeau
  async createGiftCard(data: {
    code: string;
    buyerName: string;
    buyerEmail: string;
    recipientName: string;
  }) {
    const record = {
      fields: {
        'Code': data.code,
        'Buyer Name': data.buyerName,
        'Buyer Email': data.buyerEmail,
        'Recipient Name': data.recipientName,
        'Status': 'unused',
        'Created At': new Date().toISOString(),
        'Amount': 29, 
      },
    };

    const result = await this.request('POST', `/${TABLES.GIFT_CARDS}`, { records: [record] });
    return result.records[0];
  }

  // Vérifier un code (participant ou gift card)
  async verifyCode(code: string) {
    // Chercher dans les participants
    let formula = encodeURIComponent(`{Code} = '${code}'`);
    let result = await this.request('GET', `/${TABLES.PARTICIPANTS}?filterByFormula=${formula}`);
    
    if (result.records && result.records.length > 0) {
      const participant = result.records[0];
      return {
        type: 'participant',
        code,
        valid: true,
        participantId: participant.id,
        participantRecordId: participant.id,
        email: participant.fields.Email,
        formStatus: participant.fields['Form Status'],
      };
    }

    // Chercher dans les gift cards
    formula = encodeURIComponent(`{Code} = '${code}'`);
    result = await this.request('GET', `/${TABLES.GIFT_CARDS}?filterByFormula=${formula}`);
    
    if (result.records && result.records.length > 0) {
      const giftCard = result.records[0];
      return {
        type: 'gift',
        code,
        valid: true,
        status: giftCard.fields.Status,
        buyerName: giftCard.fields['Buyer Name'],
        buyerEmail: giftCard.fields['Buyer Email'],
        recipientName: giftCard.fields['Recipient Name'],
        giftCardId: giftCard.id,
      };
    }

    return { type: null, code, valid: false };
  }

  // Récupérer les informations complètes d'un participant et de son voyage
  async getParticipantWithTripInfo(code: string) {
    try {
      // 1. Trouver le participant
      const formula = encodeURIComponent(`{code} = '${code}'`);
      console.log('🔍🔍🔍 FORMULE:', formula);
      console.log('🔍🔍🔍 CODE RECHERCHÉ:', code);
      const participantResult = await this.request(
        'GET', 
        `/${TABLES.PARTICIPANTS}?filterByFormula=${formula}`
      );
      
      if (!participantResult.records || participantResult.records.length === 0) {
        return { valid: false, message: 'Code invalide' };
      }
      
      const participant = participantResult.records[0];
      const tripIdArray = participant.fields['Trip ID'];
      
      // Trip ID est un tableau de record IDs (relation Airtable)
      const tripRecordId = Array.isArray(tripIdArray) ? tripIdArray[0] : tripIdArray;
      
      if (!tripRecordId) {
        return { valid: false, message: 'Voyage non trouvé' };
      }
      
      // 2. Récupérer tous les participants du même voyage
      const tripFormula = encodeURIComponent(`SEARCH('${tripRecordId}', ARRAYJOIN({Trip ID}))`);
      const allParticipantsResult = await this.request(
        'GET',
        `/${TABLES.PARTICIPANTS}?filterByFormula=${tripFormula}`
      );
      
      // 3. Filtrer les autres participants (pas celui qui se connecte)
      const currentParticipant = {
        id: participant.id,
        code: code,
        prenom: participant.fields['Prenom'] || '',
        nom: participant.fields['Nom'] || '',
        email: participant.fields['Email'] || '',
        formStatus: participant.fields['Form Status'] || 'pending'
      };
      
      const otherParticipants = (allParticipantsResult.records || [])
        .filter(p => p.id !== participant.id)
        .map(p => ({
          prenom: p.fields['Prenom'] || '',
          nom: p.fields['Nom'] || ''
        }));
      
      return {
        valid: true,
        participant: currentParticipant,
        otherParticipants: otherParticipants,
        tripRecordId: tripRecordId
      };
      
    } catch (error) {
      console.error('Error getting participant info:', error);
      return { valid: false, message: 'Erreur lors de la vérification du code' };
    }
  }

  // Sauvegarder une réponse de formulaire
  async saveFormResponse(data: {
    participantId: string;
    prenom: string;
    nom: string;
    email: string;
    dateNaissance?: string;
    nbVoyageurs?: string;
    enfants?: string;
    villeDepart?: string;
    dateDepart?: string;
    duree?: string;
    budget?: string;
    distance?: string;
    motivations?: string[];
    motivationsDetail?: string;
    voyageType?: string;
    planningStyle?: string;
    environnements?: string[];
    climat?: string;
    paysVisites?: string;
    activites?: string[];
    rythme?: string;
    problemeSante?: string;
    phobies?: string;
    interdits?: string;
    formatRevelation?: string;
  }) {
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

    const result = await this.request('POST', `/${TABLES.FORM_RESPONSES}`, { records: [record] });
    return result.records[0];
  }

  // Mettre à jour le statut d'un participant
  async updateParticipantStatus(recordId: string, status: string) {
    const record = {
      id: recordId,
      fields: {
        'Form Status': status,
      },
    };

    const result = await this.request('PATCH', `/${TABLES.PARTICIPANTS}`, { records: [record] });
    return result.records[0];
  }

  // Mettre à jour le statut d'une gift card
  async updateGiftCardStatus(code: string, status: string) {
    const formula = encodeURIComponent(`{Code} = '${code}'`);
    const result = await this.request('GET', `/${TABLES.GIFT_CARDS}?filterByFormula=${formula}`);
    
    if (result.records && result.records.length > 0) {
      const recordId = result.records[0].id;
      const updateRecord = {
        id: recordId,
        fields: {
          'Status': status,
        },
      };
      
      return await this.request('PATCH', `/${TABLES.GIFT_CARDS}`, { records: [updateRecord] });
    }
    
    throw new Error('Gift card not found');
  }

  // Récupérer tous les participants d'un voyage
  async getParticipantsByTrip(tripId: string) {
    const formula = encodeURIComponent(`{Trip ID} = '${tripId}'`);
    const result = await this.request('GET', `/${TABLES.PARTICIPANTS}?filterByFormula=${formula}`);
    return result.records || [];
  }
}

export const airtableClient = new AirtableClient();

export const AirtableAPI = {
  createTrip: (data: any) => airtableClient.createTrip(data),
  createParticipant: (data: any) => airtableClient.createParticipant(data),
  createGiftCard: (data: any) => airtableClient.createGiftCard(data),
  verifyCode: (code: string) => airtableClient.verifyCode(code),
  getParticipantWithTripInfo: (code: string) => airtableClient.getParticipantWithTripInfo(code),
  saveFormResponse: (data: any) => airtableClient.saveFormResponse(data),
  updateParticipantStatus: (recordId: string, status: string) => 
    airtableClient.updateParticipantStatus(recordId, status),
  updateGiftCardStatus: (code: string, status: string) =>
    airtableClient.updateGiftCardStatus(code, status),
  getParticipantsByTrip: (tripId: string) => 
    airtableClient.getParticipantsByTrip(tripId),
};
