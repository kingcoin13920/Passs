// lib/airtable.ts
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

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

  // Créer un voyage
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
        'Payment Status': data.paymentStatus,
        'Criteria Order': data.criteriaOrder ? JSON.stringify(data.criteriaOrder) : '',
        'Created At': new Date().toISOString(),
      },
    };

    const result = await this.request('POST', `/${TABLES.VOYAGES}`, { records: [record] });
    return result.records[0];
  }

  // Créer un participant
  async createParticipant(data: {
    tripId: string;
    code: string;
    prenom: string;
    nom: string;
    email: string;
    paymentStatus: string;
  }) {
    const record = {
      fields: {
        'Trip ID': data.tripId,
        'Code': data.code,
        'Prénom': data.prenom,
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
        recipientName: giftCard.fields['Recipient Name'],
      };
    }

    return { type: null, code, valid: false };
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

// Export des fonctions pour compatibilité avec le code existant
export const AirtableAPI = {
  createTrip: (data: any) => airtableClient.createTrip(data),
  createParticipant: (data: any) => airtableClient.createParticipant(data),
  createGiftCard: (data: any) => airtableClient.createGiftCard(data),
  verifyCode: (code: string) => airtableClient.verifyCode(code),
  saveFormResponse: (data: any) => airtableClient.saveFormResponse(data),
  updateParticipantStatus: (recordId: string, status: string) => 
    airtableClient.updateParticipantStatus(recordId, status),
  updateGiftCardStatus: (code: string, status: string) =>
    airtableClient.updateGiftCardStatus(code, status),
  getParticipantsByTrip: (tripId: string) => 
    airtableClient.getParticipantsByTrip(tripId),
};
