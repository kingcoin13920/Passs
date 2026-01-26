"use client";

import React, { useState, useEffect } from 'react';
import { Plane, Gift, Code, Users, ArrowRight, ArrowLeft, Check, GripVertical, Clock, User, Edit } from 'lucide-react';
import { airtableClient } from '@/lib/airtable';

// Vérifier si on est en mode démo - désactivé par défaut en production
const IS_DEMO_MODE = false; // Changez à true pour activer le mode démo

const CRITERIA = [
  { id: 'budget', label: 'Budget', icon: '💰' },
  { id: 'dates', label: 'Dates / Durée', icon: '📅' },
  { id: 'environment', label: "Type d'environnement", icon: '🏖️' },
  { id: 'climate', label: 'Climat', icon: '☀️' },
  { id: 'activities', label: 'Activités souhaitées', icon: '🎯' },
  { id: 'rhythm', label: 'Rythme du voyage', icon: '⚡' },
  { id: 'planning', label: 'Style de planning', icon: '📋' },
  { id: 'motivations', label: 'Motivations', icon: '✨' }
];

const PRICES = {
  1: 29,
  2: 49,
  3: 79,
  4: 129
};

interface TripData {
  travelers?: number;
  inputCode?: string;
  statusCode?: string;
  participantId?: string;
  participantRecordId?: string;
  [key: string]: any;
}

// API helpers - Mode démo ou production
const AirtableAPI = {
  createTrip: async (data: any) => {
    if (IS_DEMO_MODE) {
      console.log('DEMO MODE - Creating trip:', data);
      return { success: true, id: 'demo-trip-' + Date.now() };
    }
    
    // Mode production - appel API réel
    const response = await fetch('/api/airtable/create-trip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) throw new Error('Failed to create trip');
    return response.json();
  },
  
  createParticipant: async (data: any) => {
    if (IS_DEMO_MODE) {
      console.log('DEMO MODE - Creating participant:', data);
      return { success: true, id: 'demo-participant-' + Date.now() };
    }
    
    const response = await fetch('/api/airtable/create-participant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) throw new Error('Failed to create participant');
    return response.json();
  },
  
  createGiftCard: async (data: any) => {
    if (IS_DEMO_MODE) {
      console.log('DEMO MODE - Creating gift card:', data);
      return { success: true, id: 'demo-gift-' + Date.now() };
    }
    
    const response = await fetch('/api/airtable/create-gift-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) throw new Error('Failed to create gift card');
    return response.json();
  },
  
  verifyCode: async (code: string) => {
    if (IS_DEMO_MODE) {
      console.log('DEMO MODE - Verifying code:', code);
      return { 
        type: 'participant', 
        code, 
        valid: true,
        participantId: 'demo-participant',
        participantRecordId: 'demo-record',
        email: 'demo@example.com',
        formStatus: 'pending'
      };
    }
    
    // Note: Cette fonction n'est pas utilisée dans le flux principal
    // Le flux principal utilise la fonction verifyCode standalone (ligne ~296)
    // qui appelle directement airtableClient.getParticipantWithTripInfo
    try {
      const response = await fetch('/api/airtable/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      
      if (!response.ok) {
        return { type: null, code, valid: false };
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error verifying code:', error);
      return { type: null, code, valid: false };
    }
  },
  
  saveFormResponse: async (data: any) => {
    if (IS_DEMO_MODE) {
      console.log('DEMO MODE - Saving form response:', data);
      return { success: true };
    }
    
    const response = await fetch('/api/airtable/save-form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) throw new Error('Failed to save form');
    return response.json();
  },
  
  updateParticipantStatus: async (recordId: string, status: string) => {
    if (IS_DEMO_MODE) {
      console.log('DEMO MODE - Updating participant status:', recordId, status);
      return { success: true };
    }
    
    const response = await fetch('/api/airtable/update-participant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId, status }),
    });
    
    if (!response.ok) throw new Error('Failed to update participant');
    return response.json();
  }
};

const StripeAPI = {
  createCheckoutSession: async (data: any) => {
    if (IS_DEMO_MODE) {
      console.log('DEMO MODE - Creating Stripe session:', data);
      alert(`Mode démo - Paiement de ${data.amount}€ simulé avec succès!`);
      return { success: true, url: null };
    }
    
    const response = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) throw new Error('Failed to create checkout session');
    const result = await response.json();
    
    // Rediriger vers Stripe
    if (result.url) {
      window.location.href = result.url;
    }
    
    return result;
  }
};

const PassworldModule = () => {
  const [participantInfo, setParticipantInfo] = useState(null);
  const [currentView, setCurrentView] = useState('router');
  const [tripData, setTripData] = useState<TripData>({});
  const [loading, setLoading] = useState(false);
  const [isRedirectingToStripe, setIsRedirectingToStripe] = useState(false);
  const [groupStatus, setGroupStatus] = useState(null);
  const [isLoadingGroup, setIsLoadingGroup] = useState(false);
  const [isModifying, setIsModifying] = useState(false);


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const code = params.get('c');

    if (action === 'offrir') setCurrentView('gift');
    else if (action === 'commencer') setCurrentView('start');
    else if (action === 'code' && code) {
      setCurrentView('with-code');
      setTripData({ inputCode: code });
    } else if (action === 'statut' && code) {
      setCurrentView('dashboard');
      setTripData({ statusCode: code });
    }
  }, []);

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 9; i++) {
      if (i > 0 && i % 3 === 0) code += '-';
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  const createGiftCard = async (formData: any, code: string) => {
    try {
      return await AirtableAPI.createGiftCard({
        code,
        buyerName: formData.buyerName,
        buyerEmail: formData.buyerEmail,
        recipientName: formData.recipientName
      });
    } catch (error) {
      console.error('Erreur création carte cadeau:', error);
      throw error;
    }
  };

  const createTrip = async (data: any) => {
    try {
      const tripId = `TRIP-${Date.now()}`;
      
      // Créer le voyage
      await AirtableAPI.createTrip({
        tripId,
        type: data.type,
        nbParticipants: 1,
        amount: PRICES[1],
        paymentStatus: 'pending'
      });

      // Créer le participant
      await AirtableAPI.createParticipant({
        tripId,
        code: data.code,
        prenom: '',
        nom: '',
        email: data.email,
        paymentStatus: 'pending'
      });

      return { tripId, code: data.code };
    } catch (error) {
      console.error('Erreur création voyage:', error);
      throw error;
    }
  };

  const createGroupTrip = async (data: any) => {
    try {
      const tripId = `TRIP-${Date.now()}`;
      
      // Créer le voyage
      await AirtableAPI.createTrip({
        tripId,
        type: 'group',
        nbParticipants: data.participants.length,
        amount: data.price,
        criteriaOrder: data.criteria.map(c => c.id),
        paymentStatus: 'pending'
      });

      // Créer tous les participants avec leurs codes
      const participantCodes = [];
      for (const participant of data.participants) {
        const code = generateCode();
        await AirtableAPI.createParticipant({
          tripId,
          code,
          prenom: participant.prenom,
          nom: participant.nom,
          email: participant.email,
          paymentStatus: 'pending'
        });
        participantCodes.push({ ...participant, code });
      }

      return { tripId, participants: participantCodes };
    } catch (error) {
      console.error('Erreur création voyage groupe:', error);
      throw error;
    }
  };

  const redirectToStripe = async (type: string, amount: number, metadata: any) => {
    console.log('🚀 redirectToStripe appelé:', { type, amount, IS_DEMO_MODE });
    
    try {
      // Activer le spinner de redirection
      setIsRedirectingToStripe(true);
      
      // En mode démo, on simule
      if (IS_DEMO_MODE) {
        console.log('⚠️ MODE DEMO ACTIF');
        alert(`Mode démo:\nPaiement de ${amount}€ simulé avec succès!\n\nEn production, vous serez redirigé vers Stripe.`);
        setIsRedirectingToStripe(false);
        return;
      }

      console.log('✅ MODE PRODUCTION - Appel API Stripe...');
      
      // En production, rediriger vers Stripe
      await StripeAPI.createCheckoutSession({
        amount,
        type,
        metadata
      });
      
      // Note: setIsRedirectingToStripe(false) n'est pas appelé car la page est redirigée
      console.log('✅ API Stripe appelée avec succès');
    } catch (error) {
      console.error('❌ Erreur Stripe:', error);
      setIsRedirectingToStripe(false);
      alert('Erreur lors de la création de la session de paiement. Vérifiez la console.');
      throw error;
    }
  };

const verifyCode = async (code: string) => {
  if (!code.trim()) {
    alert('Veuillez entrer un code');
    return;
  }

  setLoading(true);
  try {
    console.log('🔍 Vérification du code:', code);
    
    // Vérifier d'abord si c'est un code cadeau
    if (code.startsWith('GIFT-')) {
      console.log('🎁 Détection d\'un code cadeau');
      
      const response = await fetch('/api/airtable/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      
      const giftResult = await response.json();
      console.log('🎁 Résultat carte cadeau:', giftResult);
      
      if (!giftResult.valid) {
        alert('Code cadeau invalide');
        setLoading(false);
        return;
      }
      
      // Vérifier si la carte cadeau a déjà été utilisée
      if (giftResult.status === 'used') {
        alert(`Ce code cadeau a déjà été utilisé.\n\nSi vous avez effectué un voyage de groupe, vous avez dû recevoir un nouveau code par email.\n\nSi vous avez effectué un voyage solo, votre formulaire a déjà été envoyé et est en cours de traitement.`);
        setLoading(false);
        return;
      }
      
      // Stocker les infos de la carte cadeau
      setTripData({ 
        inputCode: code, 
        isGiftCard: true,
        giftCardId: giftResult.giftCardId,
        buyerName: giftResult.buyerName,
        recipientName: giftResult.recipientName,
        buyerEmail: giftResult.buyerEmail
      });
      
      // Rediriger vers la page d'accueil cadeau
      setCurrentView('gift-welcome');
      setLoading(false);
      return;
    }
    
    // Code participant normal
    const result = await airtableClient.getParticipantWithTripInfo(code);
    
    console.log('📋 Résultat:', result);
    
    if (!result.valid) {
      alert(result.message || 'Code invalide');
      setLoading(false);
      return;
    }
    
    // Stocker les infos du participant
    setParticipantInfo(result);
    console.log('👤 ParticipantInfo stocké:', result);
    console.log('👤 Participant prenom:', result.participant?.prenom);

    // Charger le statut du groupe
    await loadGroupStatus(code);

    // Rediriger vers le dashboard
    setCurrentView('dashboard');

    // Délai pour laisser React mettre à jour
    setTimeout(() => {
      setLoading(false);
    }, 100);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    alert('Erreur lors de la vérification du code');
    setLoading(false);
  }
};

// Charger le statut du groupe après vérification du code
const loadGroupStatus = async (code: string) => {
  setIsLoadingGroup(true);
  try {
    const response = await fetch('/api/airtable/get-group-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error('Failed to load group status');
    }

    const data = await response.json();
    setGroupStatus(data);
    console.log('👥 Statut du groupe chargé:', data);
  } catch (error) {
    console.error('Erreur chargement groupe:', error);
  } finally {
    setIsLoadingGroup(false);
  }
};

// Modifier le formulaire existant
const handleModifyForm = async () => {
  setIsModifying(true);
  try {
    // Récupérer les réponses existantes
    const response = await fetch('/api/airtable/get-form-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        participantRecordId: groupStatus.participant.id 
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to load form');
    }

    const data = await response.json();
    
    // Pré-remplir le formulaire avec les données existantes
    setTripData({
      ...tripData,
      prenom: groupStatus.participant.prenom,
      nom: groupStatus.participant.nom,
      email: groupStatus.participant.email,
      participantRecordId: groupStatus.participant.id,
      existingFormData: data.formData,
      responseId: data.formData.responseId,
      isModifying: true,
    });
    
    setCurrentView('form');
  } catch (error) {
    console.error('Erreur chargement formulaire:', error);
    alert('Erreur lors du chargement du formulaire');
  } finally {
    setIsModifying(false);
  }
};

  const GroupSetupView = ({ 
    travelers, 
    onBack, 
    onComplete,
    isGiftCard = false,
    giftExtensionPrice = null,
    recipientName = null
  }: { 
    travelers: number; 
    onBack: () => void; 
    onComplete: (data: any) => void;
    isGiftCard?: boolean;
    giftExtensionPrice?: number | null;
    recipientName?: string | null;
  }) => {
    const [step, setStep] = useState(1);
    const [criteria, setCriteria] = useState([...CRITERIA]);
    const [draggedItem, setDraggedItem] = useState(null);
    
    // Initialiser avec le bon nombre de participants selon travelers
    // Si c'est un code cadeau, pré-remplir le premier participant avec recipientName
    const getInitialParticipants = () => {
      const parts = Array.from({ length: travelers || 1 }, (_, index) => {
        if (index === 0 && isGiftCard && recipientName) {
          // Premier participant = destinataire du cadeau
          const names = recipientName.split(' ');
          return {
            prenom: names[0] || '',
            nom: names.slice(1).join(' ') || '',
            email: ''
          };
        }
        return { prenom: '', nom: '', email: '' };
      });
      return parts;
    };
    
    const [participants, setParticipants] = useState(getInitialParticipants());
    const [selectedGroupSize, setSelectedGroupSize] = useState(travelers || 1);

    // État pour les données communes à tous les participants
    const [commonData, setCommonData] = useState({
      enfants: '',
      villeDepart: '',
      dateDepart: '',
      duree: ''
    });

    // Calculer le prix en fonction du nombre réel de participants
    const calculatePrice = (nbParticipants) => {
      // Calculer d'abord le prix normal
      let normalPrice;
      if (nbParticipants === 1) normalPrice = PRICES[1];
      else if (nbParticipants === 2) normalPrice = PRICES[2];
      else if (nbParticipants >= 3 && nbParticipants <= 4) normalPrice = PRICES[3];
      else if (nbParticipants >= 5 && nbParticipants <= 8) normalPrice = PRICES[4];
      else normalPrice = PRICES[4]; // Max 8 personnes
      
      // Si c'est une extension de carte cadeau, soustraire 29€ (valeur du cadeau)
      if (isGiftCard) {
        return Math.max(0, normalPrice - 29);
      }
      
      // Sinon, retourner le prix normal
      return normalPrice;
    };

    const currentPrice = calculatePrice(participants.length);
    const maxParticipants = 8;

    const handleDragStart = (index: number) => {
      setDraggedItem(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (draggedItem === null || draggedItem === index) return;

      const newCriteria = [...criteria];
      const draggedCriterion = newCriteria[draggedItem];
      newCriteria.splice(draggedItem, 1);
      newCriteria.splice(index, 0, draggedCriterion);
      
      setCriteria(newCriteria);
      setDraggedItem(index);
    };

    const handleDragEnd = () => {
      setDraggedItem(null);
    };

    const addParticipant = () => {
      if (participants.length >= maxParticipants) {
        alert(`Nombre maximum de participants atteint (${maxParticipants})`);
        return;
      }
      setParticipants([...participants, { prenom: '', nom: '', email: '' }]);
    };

    const removeParticipant = (index: number) => {
      if (participants.length > 1) {
        setParticipants(participants.filter((_, i) => i !== index));
      }
    };

    const updateParticipant = (index: number, field: string, value: string) => {
      const newParticipants = [...participants];
      newParticipants[index][field] = value;
      setParticipants(newParticipants);
    };

    const handlePayment = () => {
      const invalid = participants.some(p => !p.prenom || !p.nom || !p.email);
      if (invalid) {
        alert('Veuillez remplir toutes les informations des participants');
        return;
      }
      console.log('Group setup complete:', { 
        criteria: criteria.map(c => c.id), 
        participants, 
        price: currentPrice,
        commonData: commonData  // Ajout des données communes
      });
      onComplete({ 
        criteria, 
        participants, 
        price: currentPrice,
        commonData: commonData  // Ajout des données communes
      });
    };

    if (step === 1) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-12 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
              <button
                onClick={onBack}
                className="flex items-center text-slate-600 hover:text-slate-900 mb-8 transition-colors group"
              >
                <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                Retour
              </button>

              {/* NOUVEAU: Informations communes du voyage */}
              <div className="mb-10 p-6 bg-blue-50 rounded-2xl border-2 border-blue-200">
                <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
                  📋 Informations du voyage
                </h3>
                <p className="text-gray-600 mb-6 text-sm">Ces informations s'appliqueront à tous les participants</p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Y a-t-il des enfants ? *
                    </label>
                    <select
                      value={commonData.enfants}
                      onChange={(e) => setCommonData({...commonData, enfants: e.target.value})}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Sélectionner</option>
                      <option value="oui">Oui</option>
                      <option value="non">Non</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ville de départ *
                    </label>
                    <input
                      type="text"
                      value={commonData.villeDepart}
                      onChange={(e) => setCommonData({...commonData, villeDepart: e.target.value})}
                      required
                      placeholder="Ex: Paris, Lyon..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date de départ souhaitée *
                    </label>
                    <input
                      type="date"
                      value={commonData.dateDepart}
                      onChange={(e) => setCommonData({...commonData, dateDepart: e.target.value})}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Durée du voyage *
                    </label>
                    <select
                      value={commonData.duree}
                      onChange={(e) => setCommonData({...commonData, duree: e.target.value})}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Sélectionner</option>
                      <option value="weekend">Weekend</option>
                      <option value="3-5j">3-5 jours</option>
                      <option value="1sem">1 semaine</option>
                      <option value="2sem">2 semaines</option>
                      <option value="3sem+">3 semaines+</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4">
                  <span className="text-3xl">🎯</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">Ordre d'importance des critères</h2>
                <p className="text-slate-600 text-lg">Glissez-déposez pour définir vos priorités</p>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-5 mb-8">
                <p className="text-indigo-900 text-sm font-medium flex items-start gap-2">
                  <span className="text-xl">💡</span>
                  <span>L'ordre des critères permet de trouver LA destination qui convient au mieux à tout le monde. Le critère #1 est le plus important.</span>
                </p>
              </div>

              <div className="space-y-3 mb-10">
                {criteria.map((criterion, index) => (
                  <div
                    key={criterion.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white border-2 rounded-2xl p-5 flex items-center justify-between cursor-move transition-all hover:shadow-lg ${
                      draggedItem === index 
                        ? 'border-indigo-600 shadow-2xl scale-105 bg-indigo-50' 
                        : 'border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <GripVertical className="w-6 h-6 text-slate-400" />
                      <span className="text-3xl">{criterion.icon}</span>
                      <span className="font-semibold text-slate-900 text-lg">{criterion.label}</span>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg">
                      #{index + 1}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => {
                    // Valider les champs communs obligatoires
                    if (!commonData.enfants || !commonData.villeDepart || !commonData.dateDepart || !commonData.duree) {
                      alert('⚠️ Veuillez remplir tous les champs obligatoires des informations du voyage');
                      return;
                    }

                    // Si c'est un code cadeau solo (1 participant), terminer directement
                    if (isGiftCard && participants.length === 1 && !giftExtensionPrice) {
                      onComplete({
                        criteria,
                        participants,
                        price: 0, // Pas de prix pour un cadeau solo
                        commonData: commonData // Ajout des données communes
                      });
                    } else {
                      setStep(2);
                    }
                  }}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-5 rounded-2xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-xl hover:shadow-2xl flex items-center justify-center group"
                >
                  Continuer
                  <ArrowRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => {
                    // Valider les champs communs obligatoires
                    if (!commonData.enfants || !commonData.villeDepart || !commonData.dateDepart || !commonData.duree) {
                      alert('⚠️ Veuillez remplir tous les champs obligatoires des informations du voyage');
                      return;
                    }

                    setCriteria([...CRITERIA]);
                    // Si c'est un code cadeau solo, terminer directement
                    if (isGiftCard && participants.length === 1 && !giftExtensionPrice) {
                      onComplete({
                        criteria: [...CRITERIA],
                        participants,
                        price: 0,
                        commonData: commonData // Ajout des données communes
                      });
                    } else {
                      setStep(2);
                    }
                  }}
                  className="w-full text-gray-600 hover:text-gray-900 py-2 text-sm"
                >
                  Passer avec l'ordre par défaut
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <button
              onClick={() => setStep(1)}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Retour
            </button>

            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Informations des participants</h2>
              <p className="text-gray-600">Chacun recevra un code unique par email</p>
            </div>

            <div className="space-y-6 mb-8">
              {participants.map((participant, index) => (
                <div key={index} className="border-2 border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-900">Participant {index + 1}</h3>
                    {/* Pour les codes cadeaux: minimum 2 participants, sinon minimum 1 */}
                    {((isGiftCard && participants.length > 2) || (!isGiftCard && participants.length > 1)) && (
                      <button
                        onClick={() => removeParticipant(index)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Retirer
                      </button>
                    )}
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Prénom *</label>
                      <input
                        type="text"
                        value={participant.prenom}
                        onChange={(e) => updateParticipant(index, 'prenom', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Marie"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nom *</label>
                      <input
                        type="text"
                        value={participant.nom}
                        onChange={(e) => updateParticipant(index, 'nom', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Dupont"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                      <input
                        type="email"
                        value={participant.email}
                        onChange={(e) => updateParticipant(index, 'email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="marie@example.com"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {participants.length < maxParticipants && (
                <button
                  onClick={addParticipant}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors font-medium"
                >
                  + Ajouter un participant (max {maxParticipants})
                </button>
              )}
            </div>

            <div className="bg-indigo-50 p-6 rounded-lg mb-6">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <span className="text-gray-700 font-medium block">Total pour {participants.length} participant{participants.length > 1 ? 's' : ''}</span>
                  <span className="text-sm text-gray-600">
                    {participants.length === 1 && 'Solo'}
                    {participants.length === 2 && 'Duo'}
                    {participants.length >= 3 && participants.length <= 4 && 'Groupe 3-4'}
                    {participants.length >= 5 && participants.length <= 8 && 'Groupe 5-8'}
                  </span>
                </div>
                <span className="font-bold text-3xl text-gray-900">{currentPrice}€</span>
              </div>
              <p className="text-sm text-gray-600">
                Chaque participant recevra un code unique par email après le paiement
              </p>
              {participants.length > 1 && (
                <p className="text-sm text-indigo-600 mt-2">
                  💡 Soit {(currentPrice / participants.length).toFixed(2)}€ par personne
                </p>
              )}
            </div>

            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-4 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-400 flex items-center justify-center"
            >
              {loading ? 'Chargement...' : (
                <>
                  Payer {currentPrice}€
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const FormView = ({ onBack, initialData, skipFormatStep }: { 
    onBack: () => void;
    initialData?: { 
      prenom?: string; 
      nom?: string; 
      email?: string; 
      participantId?: string; 
      participantRecordId?: string;
      existingFormData?: any;
      responseId?: string;
      isModifying?: boolean;
    };
    skipFormatStep?: boolean;
  }) => {
    const [currentStep, setCurrentStep] = useState(1);
    
    // LOG pour debug
    console.log('🎨 FormView - initialData:', initialData);
    console.log('🎨 FormView - existingFormData:', initialData?.existingFormData);
    console.log('🎨 FormView - isModifying:', initialData?.isModifying);
    
    const [formData, setFormData] = useState({
      prenom: initialData?.prenom || '',
      nom: initialData?.nom || '',
      dateNaissance: initialData?.existingFormData?.dateNaissance || '',
      email: initialData?.email || '',
      budget: initialData?.existingFormData?.budget || '',
      distance: initialData?.existingFormData?.distance || '',
      motivations: initialData?.existingFormData?.motivations || [],
      motivationsDetail: initialData?.existingFormData?.motivationsDetail || '',
      voyageType: initialData?.existingFormData?.voyageType || '',
      planningStyle: initialData?.existingFormData?.planningStyle || '',
      environnements: initialData?.existingFormData?.environnements || [],
      climat: initialData?.existingFormData?.climat || '',
      paysVisites: initialData?.existingFormData?.paysVisites || '',
      activites: initialData?.existingFormData?.activites || [],
      rythme: initialData?.existingFormData?.rythme || '',
      problemeSante: initialData?.existingFormData?.problemeSante || '',
      phobies: initialData?.existingFormData?.phobies || '',
      interdits: initialData?.existingFormData?.interdits || ''
    });

    // LOG pour voir le formData initialisé
    console.log('📝 FormData initialisé:', formData);

    const totalSteps = 8; // Réduit: suppression de nbVoyageurs, enfants, ville, date, durée, formule

    const updateField = (field: string, value: any) => {
      setFormData({ ...formData, [field]: value });
    };

    const toggleMultiSelect = (field: string, value: string) => {
      const current = formData[field];
      if (current.includes(value)) {
        updateField(field, current.filter(v => v !== value));
      } else {
        updateField(field, [...current, value]);
      }
    };

    const nextStep = () => {
      if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
    };

    const prevStep = () => {
      if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const submitForm = async () => {
      try {
        setLoading(true);
        
        // Validation des champs obligatoires
        const requiredFields = [
          { field: 'prenom', label: 'Prénom' },
          { field: 'nom', label: 'Nom' },
          { field: 'email', label: 'Email' },
          { field: 'budget', label: 'Budget' },
          { field: 'distance', label: 'Préférence de distance' },
          { field: 'voyageType', label: 'Type de voyage' },
          { field: 'planningStyle', label: 'Style de planning' },
          { field: 'climat', label: 'Climat préféré' },
          { field: 'rythme', label: 'Rythme de voyage' }
        ];

        const missingFields = requiredFields.filter(({ field }) => !formData[field] || formData[field] === '');
        
        if (missingFields.length > 0) {
          const fieldsList = missingFields.map(f => f.label).join(', ');
          alert(`⚠️ Veuillez remplir les champs obligatoires :\n\n${fieldsList}`);
          setLoading(false);
          return;
        }

        // Validation arrays (doivent avoir au moins 1 élément)
        if (!formData.motivations || formData.motivations.length === 0) {
          alert('⚠️ Veuillez sélectionner au moins une motivation');
          setLoading(false);
          return;
        }

        if (!formData.environnements || formData.environnements.length === 0) {
          alert('⚠️ Veuillez sélectionner au moins un environnement préféré');
          setLoading(false);
          return;
        }

        if (!formData.activites || formData.activites.length === 0) {
          alert('⚠️ Veuillez sélectionner au moins une activité');
          setLoading(false);
          return;
        }
        
        // En mode démo
        if (IS_DEMO_MODE) {
          console.log('Mode démo - Formulaire soumis:', formData);
          alert('Mode démo:\nFormulaire envoyé avec succès! 🎉\n\nVotre destination sera préparée dans les 48-72h.');
          setLoading(false);
          return;
        }

        // Si c'est une modification, utiliser l'API update
        const endpoint = initialData?.isModifying 
          ? '/api/airtable/update-form'
          : '/api/airtable/save-form';

        // Vérifier si c'est un code cadeau solo (pas encore de participant créé)
        let finalParticipantId = initialData?.participantId;
        let finalParticipantRecordId = initialData?.participantRecordId;
        
        if (tripData.isGiftCard && !finalParticipantId) {
          console.log('🎁 Code cadeau solo - Création du participant...');
          
          // Générer un code pour le participant
          const participantCode = tripData.inputCode; // Utiliser le code cadeau comme code participant
          
          // Créer le voyage dans Airtable
          const tripId = `TRIP-${Date.now()}`;
          const tripResponse = await fetch('/api/airtable/create-trip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tripId,
              type: 'solo',
              nbParticipants: 1,
              amount: 29,
              paymentStatus: 'paid-gift',
              criteriaOrder: ''
            }),
          });
          
          const tripDataResponse = await tripResponse.json();
          const airtableTripRecordId = tripDataResponse.id;
          console.log('✅ Voyage créé:', airtableTripRecordId);
          
          // Créer le participant
          const participantResponse = await fetch('/api/airtable/create-participant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tripId: [airtableTripRecordId],
              code: participantCode,
              prenom: formData.prenom,
              nom: formData.nom,
              email: formData.email,
              paymentStatus: 'paid-gift',
            }),
          });
          
          const participantData = await participantResponse.json();
          finalParticipantId = participantData.id;
          finalParticipantRecordId = participantData.id;
          console.log('✅ Participant créé:', finalParticipantId);
          
          // Marquer la carte cadeau comme utilisée
          await fetch('/api/airtable/update-gift-card-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              giftCardId: tripData.giftCardId,
              status: 'used'
            }),
          });
          console.log('✅ Carte cadeau marquée comme utilisée');
          
          // Envoyer l'email avec le code
          await fetch('/api/emails/send-participant-codes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              participants: [{
                prenom: formData.prenom,
                nom: formData.nom,
                email: formData.email,
                code: participantCode,
              }],
              tripId: airtableTripRecordId,
            }),
          });
          console.log('✅ Email envoyé');
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(initialData?.isModifying && { responseId: initialData.responseId }),
            participantId: finalParticipantId || 'UNKNOWN',
            participantRecordId: finalParticipantRecordId,
            ...formData
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to save form');
        }

        alert(initialData?.isModifying 
          ? 'Formulaire modifié ! 🎉'
          : 'Formulaire envoyé ! 🎉\nVotre destination est en cours de préparation.'
        );
        
        // Toujours rediriger vers l'accueil après soumission
        setTimeout(() => {
          window.location.href = '/';
        }, 2000); // Délai de 2s pour lire le message
      } catch (error) {
        console.error('Erreur soumission formulaire:', error);
        alert('Erreur lors de l\'envoi du formulaire : ' + (error as Error).message);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Étape {currentStep} sur {totalSteps}</span>
              <span className="text-sm font-medium text-emerald-600">{Math.round((currentStep / totalSteps) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Step 1: Infos personnelles */}
            {currentStep === 1 && (
              <div>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">✈️ Avant de décoller, faisons connaissance</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Prénom *</label>
                    <input
                      type="text"
                      value={formData.prenom}
                      onChange={(e) => updateField('prenom', e.target.value)}
                      readOnly={!!initialData?.prenom}
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${initialData?.prenom ? 'bg-gray-50' : ''}`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nom *</label>
                    <input
                      type="text"
                      value={formData.nom}
                      onChange={(e) => updateField('nom', e.target.value)}
                      readOnly={!!initialData?.nom}
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${initialData?.nom ? 'bg-gray-50' : ''}`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date de naissance</label>
                    <input
                      type="date"
                      value={formData.dateNaissance}
                      onChange={(e) => updateField('dateNaissance', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">E-mail *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      readOnly={!!initialData?.email}
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${initialData?.email ? 'bg-gray-50' : ''}`}
                      placeholder="john.martin@gmail.com"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <label className="flex items-center">
                    <input type="checkbox" className="w-4 h-4 text-emerald-600 border-gray-300 rounded" />
                    <span className="ml-2 text-sm text-gray-700">J'accepte d'être recontacté·e pour organiser mon voyage.</span>
                  </label>
                </div>
              </div>
            )}

            {/* Step 2: Plan de vol */}
            {currentStep === 2 && (
              <div>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">💰 Budget et préférences</h2>
                </div>

                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Quel est votre budget par personne ? (vols inclus) *</label>
                      <select
                        value={formData.budget}
                        onChange={(e) => updateField('budget', e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="">Sélectionner</option>
                        <option value="<500">{"< 500€"}</option>
                        <option value="500-1000">500-1000€</option>
                        <option value="1000-2000">1000-2000€</option>
                        <option value="2000-3000">2000-3000€</option>
                        <option value="3000+">3000€+</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Préférence de distance *</label>
                      <select
                        value={formData.distance}
                        onChange={(e) => updateField('distance', e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="">Sélectionner</option>
                        <option value="proche">Proche (Europe)</option>
                        <option value="moyen">Moyen (Afrique, Moyen-Orient)</option>
                        <option value="loin">Loin (Amériques, Asie, Océanie)</option>
                        <option value="peu-importe">Peu importe</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Motivations */}
            {currentStep === 3 && (
              <div>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">✨ Vos motivations, notre boussole</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Que recherchez-vous ?</label>
                    <div className="grid md:grid-cols-2 gap-3">
                      {[
                        'Besoin de déconnexion',
                        'Envie de changement',
                        'Célébration (anniversaire, lune de miel, etc.)',
                        "Retrouver l'inspiration",
                        'Recharger les batteries',
                        'Travailler à distance',
                        'Autre (Précisez)'
                      ].map((option) => (
                        <label key={option} className="flex items-center p-3 border-2 border-gray-200 rounded-lg hover:border-emerald-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.motivations.includes(option)}
                            onChange={() => toggleMultiSelect('motivations', option)}
                            className="w-4 h-4 text-emerald-600 border-gray-300 rounded"
                          />
                          <span className="ml-3 text-sm text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Précisez</label>
                    <textarea
                      value={formData.motivationsDetail}
                      onChange={(e) => updateField('motivationsDetail', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Type de voyage */}
            {currentStep === 4 && (
              <div>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">🧭 Quel voyage vous ressemble le plus ?</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Vous préférez :</label>
                    <div className="space-y-3">
                      {['Un seul lieu', 'Plusieurs étapes'].map((option) => (
                        <label key={option} className="flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-emerald-400 cursor-pointer">
                          <input
                            type="radio"
                            name="voyageType"
                            checked={formData.voyageType === option}
                            onChange={() => updateField('voyageType', option)}
                            className="w-4 h-4 text-emerald-600 border-gray-300"
                          />
                          <span className="ml-3 text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Vous aimez plutôt :</label>
                    <div className="space-y-3">
                      {['Être libre / improviser', 'Être encadré·e / guidé·e'].map((option) => (
                        <label key={option} className="flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-emerald-400 cursor-pointer">
                          <input
                            type="radio"
                            name="planningStyle"
                            checked={formData.planningStyle === option}
                            onChange={() => updateField('planningStyle', option)}
                            className="w-4 h-4 text-emerald-600 border-gray-300"
                          />
                          <span className="ml-3 text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Environnements */}
            {currentStep === 5 && (
              <div>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Quels types d'environnements vous attirent ?</h2>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { value: 'mer', label: '🌊 Mer', img: 'beach' },
                    { value: 'montagne', label: '⛰️ Montagne', img: 'mountain' },
                    { value: 'ville', label: '🏙️ Ville', img: 'city' },
                    { value: 'campagne', label: '🌾 Campagne', img: 'countryside' },
                    { value: 'desert', label: '🏜️ Désert', img: 'desert' },
                    { value: 'jungle', label: '🌴 Jungle', img: 'jungle' }
                  ].map((env) => (
                    <button
                      key={env.value}
                      onClick={() => toggleMultiSelect('environnements', env.value)}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        formData.environnements.includes(env.value)
                          ? 'border-emerald-600 bg-emerald-50'
                          : 'border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="text-4xl mb-2">{env.label.split(' ')[0]}</div>
                      <div className="font-medium text-gray-900">{env.label.split(' ')[1]}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 6: Climat */}
            {currentStep === 6 && (
              <div>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Quel climat recherchez-vous ?</h2>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { value: 'chaud', label: '☀️ Chaud', icon: '☀️' },
                    { value: 'froid', label: '❄️ Froid', icon: '❄️' },
                    { value: 'peu-importe', label: '🌤️ Peu importe', icon: '🌤️' }
                  ].map((climat) => (
                    <button
                      key={climat.value}
                      onClick={() => updateField('climat', climat.value)}
                      className={`p-8 rounded-xl border-2 transition-all ${
                        formData.climat === climat.value
                          ? 'border-emerald-600 bg-emerald-50'
                          : 'border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="text-5xl mb-3">{climat.icon}</div>
                      <div className="font-semibold text-gray-900">{climat.label.split(' ')[1]}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 7: Pays visités */}
            {currentStep === 7 && (
              <div>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Pays ou régions déjà visités</h2>
                  <p className="text-gray-600">(où vous ne souhaitez pas retourner)</p>
                </div>

                <textarea
                  value={formData.paysVisites}
                  onChange={(e) => updateField('paysVisites', e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="Bali, Espagne, Italie..."
                />
              </div>
            )}

            {/* Step 8: Activités */}
            {currentStep === 8 && (
              <div>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Activités souhaitées</h2>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { value: 'baignade', label: '🏊 Baignade / Farniente' },
                    { value: 'rando', label: '🥾 Randonnée / Marche' },
                    { value: 'surf', label: '🏄 Plongée / Surf / Sports nautiques' },
                    { value: 'culture', label: '🏛️ Visites culturelles (monuments, sites, musées...)' },
                    { value: 'nature', label: '🌋 Nature (parcs, lacs, volcans...)' },
                    { value: 'roadtrip', label: '🚗 Road trip / Escapades en voiture' },
                    { value: 'gastro', label: '🍷 Gastronomie / spécialités locales' },
                    { value: 'zen', label: '🧘 Bien-être (yoga, spa...)' },
                    { value: 'fete', label: '🎉 Fêtes / Bars / Concerts' }
                  ].map((act) => (
                    <button
                      key={act.value}
                      onClick={() => toggleMultiSelect('activites', act.value)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        formData.activites.includes(act.value)
                          ? 'border-emerald-600 bg-emerald-50'
                          : 'border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="text-2xl mb-2">{act.label.split(' ')[0]}</div>
                      <div className="text-sm text-gray-700">{act.label.substring(act.label.indexOf(' ') + 1)}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 9: Rythme + Contraintes */}
            {currentStep === 9 && (
              <div>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Quel rythme vous convient le mieux ?</h2>
                </div>

                <div className="mb-8">
                  <select
                    value={formData.rythme}
                    onChange={(e) => updateField('rythme', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">-</option>
                    <option value="repos">🛌 Repos total</option>
                    <option value="tranquille">😌 Tranquille</option>
                    <option value="equilibre">⚖️ Équilibré</option>
                    <option value="actif">⚡ Actif</option>
                    <option value="intense">🔥 Intense</option>
                  </select>
                </div>

                <div className="border-t pt-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">🌪️ Vos zones de turbulences à prendre en compte</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Problèmes de santé ou de mobilité à prendre...</label>
                      <textarea
                        value={formData.problemeSante}
                        onChange={(e) => updateField('problemeSante', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phobies ou peurs à éviter</label>
                      <textarea
                        value={formData.phobies}
                        onChange={(e) => updateField('phobies', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Lieux, ambiances ou choses que vous souhaitez éviter absolument</label>
                      <textarea
                        value={formData.interdits}
                        onChange={(e) => updateField('interdits', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 10 (Formule) supprimé */}

            {/* Navigation buttons */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t">
              <button
                onClick={currentStep === 1 ? onBack : prevStep}
                className="flex items-center text-gray-600 hover:text-gray-900 font-medium"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                {currentStep === 1 ? 'Annuler' : 'Précédent'}
              </button>

              {currentStep < totalSteps ? (
                <button
                  onClick={nextStep}
                  className="bg-emerald-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center"
                >
                  Suivant
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              ) : (
                <button
                  onClick={submitForm}
                  className="bg-emerald-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center"
                >
                  Envoyer
                  <Check className="w-5 h-5 ml-2" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const Router = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <Plane className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Passworld</h1>
          <p className="text-gray-600">Votre prochaine aventure commence ici</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <button
            onClick={() => setCurrentView('gift')}
            className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 text-left group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-pink-100 rounded-full p-4">
                <Gift className="w-8 h-8 text-pink-600" />
              </div>
              <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 transition-colors" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Offrir l'expérience</h2>
            <p className="text-gray-600">Offrez une carte cadeau pour une destination surprise</p>
          </button>

          <button
            onClick={() => setCurrentView('start')}
            className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 text-left group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-indigo-100 rounded-full p-4">
                <Plane className="w-8 h-8 text-indigo-600" />
              </div>
              <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 transition-colors" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Commencer l'expérience</h2>
            <p className="text-gray-600">Découvrez votre destination mystère maintenant</p>
          </button>
        </div>

        <button
          onClick={() => setCurrentView('with-code')}
          className="w-full bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-100 rounded-full p-3">
                <Code className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Accéder à mon dashboard</h3>
                <p className="text-gray-600 text-sm">J'ai déjà un code participant</p>
              </div>
            </div>
            <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-emerald-600 transition-colors" />
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {/* Overlay de chargement pendant la redirection vers Stripe */}
      {isRedirectingToStripe && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Redirection vers le paiement...</h3>
            <p className="text-gray-600">Veuillez patienter, vous allez être redirigé vers Stripe</p>
          </div>
        </div>
      )}

      {currentView === 'router' && <Router />}
      
      {/* Vue d'accueil pour les codes cadeaux */}
      {currentView === 'gift-welcome' && (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 flex items-center justify-center p-4">
          <div className="max-w-3xl w-full bg-white rounded-3xl shadow-2xl p-8 md:p-12">
            <button
              onClick={() => setCurrentView('router')}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-8 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Retour
            </button>

            {/* Message de bienvenue */}
            <div className="text-center mb-12">
              <div className="bg-gradient-to-br from-pink-100 to-purple-100 rounded-full p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Gift className="w-10 h-10 text-pink-600" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Bienvenue {tripData.recipientName} ! 🎁
              </h1>
              <p className="text-xl text-gray-700 mb-2">
                <strong>{tripData.buyerName}</strong> vous a offert une carte cadeau Passworld !
              </p>
              <p className="text-gray-600">
                Découvrez votre destination surprise personnalisée
              </p>
            </div>

            {/* Options */}
            <div className="space-y-4 mb-8">
              {/* Option 1: Solo */}
              <div className="border-2 border-indigo-200 rounded-2xl p-6 hover:border-indigo-400 transition-colors cursor-pointer bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      🚀 Utiliser pour moi seul
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Profitez de votre voyage surprise en solo
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-bold text-indigo-600">Gratuit</span>
                      <span className="text-sm text-gray-500">(déjà payé)</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // Utilisation solo - aller au tri des critères
                    setTripData({ ...tripData, travelers: 1 });
                    setCurrentView('group-setup');
                  }}
                  className="w-full bg-indigo-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-colors shadow-lg"
                >
                  Commencer mon questionnaire
                </button>
              </div>

              {/* Option 2: Groupe */}
              <div className="border-2 border-purple-200 rounded-2xl p-6 hover:border-purple-400 transition-colors cursor-pointer bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      👥 Étendre à plusieurs personnes
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Transformez ce cadeau en voyage de groupe
                    </p>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>• Duo (2 personnes)</span>
                        <span className="font-semibold">+20€</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Trio/Quatuor (3-4 personnes)</span>
                        <span className="font-semibold">+50€</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Groupe (5-8 personnes)</span>
                        <span className="font-semibold">+100€</span>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // Extension groupe - choix du nombre
                    setCurrentView('gift-extend');
                  }}
                  className="w-full bg-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-purple-700 transition-colors shadow-lg"
                >
                  Choisir le nombre de personnes
                </button>
              </div>
            </div>

            <div className="text-center text-sm text-gray-500">
              <p>💡 Vous pouvez choisir l'option qui vous convient le mieux</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Vue extension de carte cadeau - Choix du nombre */}
      {currentView === 'gift-extend' && (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl p-8 md:p-12">
            <button
              onClick={() => setCurrentView('gift-welcome')}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-8"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Retour
            </button>

            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                Combien serez-vous ?
              </h2>
              <p className="text-gray-600 text-lg">
                Choisissez le nombre de voyageurs et payez le supplément
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Duo */}
              <div 
                onClick={() => {
                  setTripData({ ...tripData, travelers: 2, giftExtensionPrice: 20 });
                  setCurrentView('group-setup');
                }}
                className="border-2 border-purple-200 rounded-2xl p-6 hover:border-purple-500 hover:shadow-xl transition-all cursor-pointer bg-gradient-to-br from-purple-50 to-pink-50"
              >
                <div className="text-center">
                  <div className="text-5xl mb-4">👥</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Duo</h3>
                  <p className="text-gray-600 mb-4">2 personnes</p>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500 line-through">Prix normal: 49€</p>
                    <p className="text-sm text-gray-600">Carte cadeau: <span className="font-semibold text-green-600">-29€</span></p>
                    <div className="text-3xl font-bold text-purple-600 mt-2">
                      +20€
                    </div>
                  </div>
                </div>
              </div>

              {/* 3-4 personnes */}
              <div 
                onClick={() => {
                  setTripData({ ...tripData, travelers: 3, giftExtensionPrice: 50 });
                  setCurrentView('group-setup');
                }}
                className="border-2 border-purple-200 rounded-2xl p-6 hover:border-purple-500 hover:shadow-xl transition-all cursor-pointer bg-gradient-to-br from-purple-50 to-pink-50"
              >
                <div className="text-center">
                  <div className="text-5xl mb-4">👨‍👩‍👦</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Trio/Quatuor</h3>
                  <p className="text-gray-600 mb-4">3-4 personnes</p>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500 line-through">Prix normal: 79€</p>
                    <p className="text-sm text-gray-600">Carte cadeau: <span className="font-semibold text-green-600">-29€</span></p>
                    <div className="text-3xl font-bold text-purple-600 mt-2">
                      +50€
                    </div>
                  </div>
                </div>
              </div>

              {/* 5-8 personnes */}
              <div 
                onClick={() => {
                  setTripData({ ...tripData, travelers: 5, giftExtensionPrice: 100 });
                  setCurrentView('group-setup');
                }}
                className="border-2 border-purple-200 rounded-2xl p-6 hover:border-purple-500 hover:shadow-xl transition-all cursor-pointer bg-gradient-to-br from-purple-50 to-pink-50 md:col-span-2"
              >
                <div className="text-center">
                  <div className="text-5xl mb-4">👨‍👩‍👧‍👦</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Groupe</h3>
                  <p className="text-gray-600 mb-4">5-8 personnes</p>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500 line-through">Prix normal: 129€</p>
                    <p className="text-sm text-gray-600">Carte cadeau: <span className="font-semibold text-green-600">-29€</span></p>
                    <div className="text-3xl font-bold text-purple-600 mt-2">
                      +100€
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentView === 'gift' && (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-100 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
            <button
              onClick={() => setCurrentView('router')}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Retour
            </button>

            <div className="text-center mb-8">
              <div className="bg-pink-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Gift className="w-8 h-8 text-pink-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Offrir l'expérience</h2>
              <p className="text-gray-600">Offrez une carte cadeau Passworld à 29€</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du destinataire *
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="Marie Dupont"
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Vos informations</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Votre nom *
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="Jean Martin"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Votre email *
                    </label>
                    <input
                      type="email"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      placeholder="jean@example.com"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      La carte cadeau vous sera envoyée par email
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  // Récupérer les données du formulaire
                  const inputs = document.querySelectorAll('input');
                  redirectToStripe('gift', 29, {
                    recipientName: (inputs[0] as HTMLInputElement)?.value || '',
                    buyerName: (inputs[1] as HTMLInputElement)?.value || '',
                    buyerEmail: (inputs[2] as HTMLInputElement)?.value || ''
                  });
                }}
                className="w-full bg-pink-600 text-white py-4 rounded-lg font-semibold hover:bg-pink-700 transition-colors flex items-center justify-center"
              >
                Payer 29€
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        </div>
      )}

      {currentView === 'start' && (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
            <button
              onClick={() => setCurrentView('router')}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Retour
            </button>

            <div className="text-center mb-8">
              <div className="bg-indigo-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Plane className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Commencer l'expérience</h2>
              <p className="text-gray-600">Avez-vous déjà un code ?</p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setCurrentView('with-code')}
                className="w-full bg-indigo-600 text-white p-6 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center">
                  <Code className="w-6 h-6 mr-3" />
                  <div className="text-left">
                    <div className="font-semibold text-lg">J'ai un code</div>
                    <div className="text-indigo-100 text-sm">Carte cadeau ou code reçu par email</div>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => setCurrentView('no-code')}
                className="w-full bg-white border-2 border-indigo-600 text-indigo-600 p-6 rounded-xl hover:bg-indigo-50 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center">
                  <Users className="w-6 h-6 mr-3" />
                  <div className="text-left">
                    <div className="font-semibold text-lg">Je n'ai pas de code</div>
                    <div className="text-indigo-400 text-sm">Démarrer une nouvelle expérience</div>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {currentView === 'with-code' && (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
            <button
              onClick={() => setCurrentView('start')}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Retour
            </button>

            <div className="text-center mb-8">
              <div className="bg-indigo-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Code className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Entrez votre code</h2>
              <p className="text-gray-600">Code de carte cadeau ou code participant</p>
            </div>

            <div className="space-y-6">
              <input
                id="code-input-field"
                type="text"
                className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center text-2xl font-mono tracking-wider"
                placeholder="CODE-1234567891011-X"
                maxLength={21}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const input = document.getElementById('code-input-field') as HTMLInputElement;
                    if (input.value.trim()) {
                      verifyCode(input.value.trim());
                    }
                  }
                }}
              />

              <button
                onClick={() => {
                  const input = document.getElementById('code-input-field') as HTMLInputElement;
                  if (input.value.trim()) {
                    verifyCode(input.value.trim());
                  } else {
                    alert('Veuillez entrer un code');
                  }
                }}
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-4 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Vérification...' : 'Valider le code'}
              </button>
            </div>
          </div>
        </div>
      )}

      {currentView === 'no-code' && (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
            <button
              onClick={() => setCurrentView('start')}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Retour
            </button>

            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Combien êtes-vous ?</h2>
              <p className="text-gray-600">Sélectionnez le nombre de voyageurs</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                { value: 1, label: 'Solo', price: 29 },
                { value: 2, label: 'Duo', price: 49 },
                { value: 3, label: '3-4 personnes', price: 79 },
                { value: 4, label: '5-8 personnes', price: 129 }
              ].map((option) => (
                <button
  key={option.value}
  onClick={() => {
    // Déterminer le nombre exact de participants
    let nbParticipants = 1;
    if (option.value === 2) nbParticipants = 2;
    if (option.value === 3) nbParticipants = 4;  // 3-4 personnes = 4 champs
    if (option.value === 4) nbParticipants = 8;  // 5-8 personnes = 8 champs
    
    setTripData({ 
      travelers: nbParticipants,  // Passer le nombre réel de participants
      nbParticipants: nbParticipants 
    });
    
    if (option.value === 1) {
      setCurrentView('solo-payment');
    } else {
      setCurrentView('group-setup');
    }
  }}
                  className="p-6 rounded-xl border-2 border-gray-200 hover:border-indigo-600 hover:bg-indigo-50 transition-all"
                >
                  <div className="text-xl font-bold text-gray-900 mb-1">{option.label}</div>
                  <div className="text-indigo-600 font-semibold">{option.price}€</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {currentView === 'solo-payment' && (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
            <button
              onClick={() => setCurrentView('no-code')}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Retour
            </button>

            <div className="text-center mb-8">
              <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <User className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Voyage solo</h2>
              <p className="text-gray-600">Un code vous sera envoyé pour accéder au formulaire</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Votre email *
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="votre@email.com"
                />
              </div>

              <div className="bg-indigo-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">Voyage solo</span>
                  <span className="font-bold text-gray-900">29€</span>
                </div>
                <p className="text-sm text-gray-600">
                  Un code unique vous sera envoyé par email après le paiement
                </p>
              </div>

              <button
                onClick={() => {
                  // Récupérer l'email du formulaire
                  const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
                  redirectToStripe('solo', 29, {
                    email: emailInput?.value || ''
                  });
                }}
                className="w-full bg-indigo-600 text-white py-4 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center"
              >
                Payer 29€
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        </div>
      )}

      {currentView === 'group-setup' && (
        <GroupSetupView 
          travelers={tripData.travelers || 1}
          isGiftCard={tripData.isGiftCard || false}
          giftExtensionPrice={tripData.giftExtensionPrice || null}
          recipientName={tripData.recipientName || null}
          onBack={() => {
            // Retourner au bon endroit selon le contexte
            if (tripData.isGiftCard && tripData.giftExtensionPrice) {
              setCurrentView('gift-extend');
            } else if (tripData.isGiftCard) {
              setCurrentView('gift-welcome');
            } else {
              setCurrentView('no-code');
            }
          }}
          onComplete={async (groupData) => {
            setLoading(true);
            try {
              // CAS 1: Code cadeau SOLO gratuit (1 participant, pas de paiement)
              if (tripData.isGiftCard && groupData.participants.length === 1 && !tripData.giftExtensionPrice) {
                console.log('🎁 Code cadeau solo - Pas de paiement, aller au formulaire');
                
                // Stocker les données pour le formulaire
                setTripData({
                  ...tripData,
                  prenom: groupData.participants[0].prenom,
                  nom: groupData.participants[0].nom,
                  email: groupData.participants[0].email,
                  criteriaOrder: groupData.criteria.map(c => c.id),
                });
                
                // Aller au formulaire
                setCurrentView('form');
                setLoading(false);
                return;
              }
              
              // CAS 2: Extension de carte cadeau ou groupe normal (paiement requis)
              const isGiftExtension = tripData.isGiftCard && tripData.giftExtensionPrice;
              const finalPrice = isGiftExtension ? tripData.giftExtensionPrice : groupData.price;
              
              console.log('🎁 Extension carte cadeau ou groupe:', isGiftExtension, 'Prix:', finalPrice);
              
              // Envoyer directement à Stripe avec les metadata
              await redirectToStripe('group', finalPrice, { 
                type: 'group',
                nbParticipants: groupData.participants.length,
                participants: JSON.stringify(groupData.participants),
                criteriaOrder: JSON.stringify(groupData.criteria.map(c => c.id)),
                isGiftExtension: isGiftExtension,
                giftCode: tripData.inputCode || null,
                giftCardId: tripData.giftCardId || null
              });
            } catch (error) {
              alert('Erreur : ' + error.message);
              setLoading(false);
            }
          }}
        />
      )}

      {currentView === 'gift-choice' && (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-100 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="bg-pink-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Gift className="w-8 h-8 text-pink-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Carte cadeau activée ! 🎉</h2>
              <p className="text-gray-600">Voyagez-vous seul ou en groupe ?</p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setCurrentView('form')}
                className="w-full bg-indigo-600 text-white p-6 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center">
                  <User className="w-6 h-6 mr-3" />
                  <div className="text-left">
                    <div className="font-semibold text-lg">Je voyage seul</div>
                    <div className="text-indigo-100 text-sm">Accéder directement au formulaire</div>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => alert('Config groupe avec cadeau')}
                className="w-full bg-white border-2 border-indigo-600 text-indigo-600 p-6 rounded-xl hover:bg-indigo-50 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center">
                  <Users className="w-6 h-6 mr-3" />
                  <div className="text-left">
                    <div className="font-semibold text-lg">Je voyage en groupe</div>
                    <div className="text-indigo-400 text-sm">Les autres paieront leur part</div>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {currentView === 'dashboard' && groupStatus && (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="bg-indigo-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Users className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Bonjour {groupStatus.participant.prenom} !
              </h2>
              {groupStatus.hasGroup && (
                <p className="text-gray-600">Statut de votre groupe</p>
              )}
            </div>

            {groupStatus.hasGroup ? (
              <>
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Progression du groupe</span>
                    <span className="text-sm font-medium text-indigo-600">
                      {groupStatus.groupParticipants.filter(p => p.formStatus === 'completed').length}/
                      {groupStatus.groupParticipants.length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-indigo-600 h-3 rounded-full transition-all" 
                      style={{ 
                        width: `${(groupStatus.groupParticipants.filter(p => p.formStatus === 'completed').length / groupStatus.groupParticipants.length) * 100}%` 
                      }} 
                    />
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  {groupStatus.groupParticipants.map((p, i) => (
                    <div key={i} className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                      p.isCurrentUser ? 'border-indigo-200 bg-indigo-50' : 'bg-gray-50 border-transparent'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          p.formStatus === 'completed' ? 'bg-green-100' : 'bg-gray-200'
                        }`}>
                          {p.formStatus === 'completed' ? (
                            <Check className="w-5 h-5 text-green-600" />
                          ) : (
                            <Clock className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">
                            {p.prenom} {p.nom}
                            {p.isCurrentUser && <span className="text-indigo-600 ml-2">(Vous)</span>}
                          </span>
                        </div>
                      </div>
                      <span className={`text-sm font-medium ${
                        p.formStatus === 'completed' ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {p.formStatus === 'completed' ? 'Complété' : 'En attente'}
                      </span>
                    </div>
                  ))}
                </div>

                {groupStatus.groupParticipants.filter(p => p.formStatus !== 'completed').length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center mb-6">
                    <p className="text-yellow-800">
                      ⏳ En attente que tous les participants complètent leur formulaire
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Joueur solo - Afficher le statut simple */}
                {groupStatus.participant.formStatus === 'completed' ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center mb-6">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <Check className="w-6 h-6 text-green-600" />
                      <p className="text-green-800 font-semibold text-lg">
                        Formulaire complété !
                      </p>
                    </div>
                    <p className="text-green-700 text-sm">
                      Votre destination est en cours de préparation. Vous recevrez les détails dans les 48-72h.
                    </p>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center mb-6">
                    <p className="text-blue-800">
                      ℹ️ Complétez votre formulaire pour découvrir votre destination surprise
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="space-y-3">
              {/* Bouton "Modifier" uniquement pour les groupes ET si autorisé */}
              {groupStatus.hasGroup && groupStatus.participant.formStatus === 'completed' && groupStatus.canModifyForm && (
                <button
                  onClick={handleModifyForm}
                  disabled={isModifying}
                  className="w-full bg-indigo-600 text-white py-3 px-6 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Edit className="w-5 h-5" />
                  {isModifying ? 'Chargement...' : 'Modifier mon formulaire'}
                </button>
              )}
              
              {groupStatus.participant.formStatus !== 'completed' && (
                <button
                  onClick={() => {
                    setTripData({
                      prenom: groupStatus.participant.prenom,
                      nom: groupStatus.participant.nom,
                      email: groupStatus.participant.email,
                      participantRecordId: groupStatus.participant.id,
                    });
                    setCurrentView('form');
                  }}
                  className="w-full bg-indigo-600 text-white py-3 px-6 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  Compléter mon formulaire
                </button>
              )}

              {groupStatus.participant.formStatus === 'completed' && !groupStatus.canModifyForm && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <p className="text-red-800 text-sm">
                    🔒 Vous ne pouvez plus modifier votre formulaire car d'autres participants ont déjà soumis le leur
                  </p>
                </div>
              )}

              <button
                onClick={() => setCurrentView('router')}
                className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Retour à l'accueil
              </button>
            </div>
          </div>
        </div>
      )}

      {currentView === 'form' && (
        <FormView 
          onBack={() => setCurrentView('router')} 
          initialData={{
            prenom: tripData?.prenom || '',
            nom: tripData?.nom || '',
            email: tripData?.email || '',
            participantId: tripData?.participantRecordId || '',
            participantRecordId: tripData?.participantRecordId || '',
            existingFormData: tripData?.existingFormData,
            responseId: tripData?.responseId,
            isModifying: tripData?.isModifying || false,
          }}
          skipFormatStep={!!tripData?.participantRecordId}
        />
      )}

      {currentView === 'personalized-welcome' && participantInfo && (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="bg-indigo-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Plane className="w-10 h-10 text-indigo-600" />
              </div>
            
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Bienvenue {participantInfo.participant.prenom}! 👋
              </h2>
              
              {participantInfo.otherParticipants && participantInfo.otherParticipants.length > 0 ? (
                <p className="text-xl text-gray-600 mb-6">
                  Préparez votre voyage avec{' '}
                  {participantInfo.otherParticipants.map((p, i) => (
                    <span key={i}>
                      <strong>{p.prenom}</strong>
                      {i < participantInfo.otherParticipants.length - 1 ? (
                        i === participantInfo.otherParticipants.length - 2 ? ' et ' : ', '
                      ) : ''}
                    </span>
                  ))}
                </p>
              ) : (
                <p className="text-xl text-gray-600 mb-6">
                  Préparez votre voyage surprise! 🌍
                </p>
              )}
              
              <div className="bg-blue-50 rounded-lg p-6 mb-6">
                <p className="text-gray-700 text-lg leading-relaxed">
                  Vous allez remplir un questionnaire sur vos préférences de voyage. 
                  Cela nous permettra de trouver la destination parfaite pour vous!
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => {
                  // Stocker les infos du participant pour le formulaire
                  setTripData({
                    participantRecordId: participantInfo.participant.id,
                    participantCode: participantInfo.participant.code,
                    prenom: participantInfo.participant.prenom,
                    nom: participantInfo.participant.nom,
                    email: participantInfo.participant.email
                  });
                  setCurrentView('form');
                }}
                className="w-full bg-indigo-600 text-white py-4 px-6 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center text-lg font-semibold"
              >
                Commencer le formulaire
                <ArrowRight className="w-6 h-6 ml-2" />
              </button>

              <button
                onClick={() => setCurrentView('home')}
                className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Retour à l'accueil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PassworldModule;
