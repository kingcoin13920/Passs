"use client";

import React, { useState, useEffect } from 'react';
import { Plane, Gift, Code, Users, ArrowRight, ArrowLeft, Check, GripVertical, Clock, User } from 'lucide-react';

// Vérifier si on est en mode démo
const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// Config front (variables publiques Next.js)
const CONFIG = {
  stripePublicKey: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY ?? 'YOUR_STRIPE_PUBLIC_KEY',
  airtableApiKey: process.env.NEXT_PUBLIC_AIRTABLE_API_KEY ?? 'YOUR_AIRTABLE_API_KEY',
  demoMode: IS_DEMO_MODE,
};

const CRITERIA = [
  { id: 'budget', label: 'Budget', icon: '💰' },
  { id: 'dates', label: 'Dates / Durée', icon: '📅' },
  { id: 'environment', label: "Type d'environnement", icon: '🏖' },
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
      return { type: 'gift', code, valid: true };
    }
    
    const response = await fetch(`/api/airtable/verify-code?code=${encodeURIComponent(code)}`);
    
    if (!response.ok) throw new Error('Failed to verify code');
    return response.json();
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
  const [currentView, setCurrentView] = useState('router');
  const [tripData, setTripData] = useState<TripData>({});
  const [loading, setLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(IS_DEMO_MODE);
  const [giftFormData, setGiftFormData] = useState({
    recipientName: '',
    buyerName: '',
    buyerEmail: ''
  });
  const [soloEmail, setSoloEmail] = useState('');

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
      
      await AirtableAPI.createTrip({
        tripId,
        type: data.type,
        nbParticipants: 1,
        amount: PRICES[1],
        paymentStatus: 'pending'
      });

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
      
      await AirtableAPI.createTrip({
        tripId,
        type: 'group',
        nbParticipants: data.participants.length,
        amount: data.price,
        criteriaOrder: data.criteria.map((c: any) => c.id),
        paymentStatus: 'pending'
      });

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
    try {
      await StripeAPI.createCheckoutSession({
        amount,
        type,
        metadata
      });
    } catch (error) {
      console.error('Erreur Stripe:', error);
      throw error;
    }
  };

  const handleGiftCardPayment = async () => {
    if (!giftFormData.recipientName || !giftFormData.buyerName || !giftFormData.buyerEmail) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const giftCode = generateCode();
      
      await createGiftCard(giftFormData, giftCode);
      
      await redirectToStripe('gift', 29, { 
        type: 'gift',
        code: giftCode,
        recipientName: giftFormData.recipientName,
        buyerName: giftFormData.buyerName,
        buyerEmail: giftFormData.buyerEmail
      });
    } catch (error) {
      alert('Erreur: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSoloPayment = async () => {
    if (!soloEmail) {
      alert('Veuillez entrer votre email');
      return;
    }

    setLoading(true);
    try {
      const soloCode = generateCode();
      
      await createTrip({
        type: 'solo',
        code: soloCode,
        email: soloEmail
      });
      
      await redirectToStripe('solo', 29, { 
        type: 'solo',
        code: soloCode,
        email: soloEmail
      });
    } catch (error) {
      alert('Erreur: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (code: string) => {
    try {
      if (CONFIG.airtableApiKey === 'YOUR_AIRTABLE_API_KEY') {
        console.log('Mode démo - Code vérifié:', code);
        return { type: 'gift', code };
      }

      return await AirtableAPI.verifyCode(code);
    } catch (error) {
      console.error('Erreur vérification code:', error);
      throw error;
    }
  };

  const GroupSetupView = ({ travelers, onBack, onComplete }: { travelers: number; onBack: () => void; onComplete: (data: any) => void }) => {
    const [step, setStep] = useState(1);
    const [criteria, setCriteria] = useState([...CRITERIA]);
    const [draggedItem, setDraggedItem] = useState<number | null>(null);
    const [participants, setParticipants] = useState([{ prenom: '', nom: '', email: '' }]);

    const calculatePrice = (nbParticipants: number) => {
      if (nbParticipants === 1) return PRICES[1];
      if (nbParticipants === 2) return PRICES[2];
      if (nbParticipants >= 3 && nbParticipants <= 4) return PRICES[3];
      if (nbParticipants >= 5 && nbParticipants <= 8) return PRICES[4];
      return PRICES[4];
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
      newParticipants[index] = { ...newParticipants[index], [field]: value };
      setParticipants(newParticipants);
    };

    const handlePayment = async () => {
      const invalid = participants.some(p => !p.prenom || !p.nom || !p.email);
      if (invalid) {
        alert('Veuillez remplir toutes les informations des participants');
        return;
      }
      
      setLoading(true);
      try {
        const result = await createGroupTrip({ criteria, participants, price: currentPrice });
        
        await redirectToStripe('group', currentPrice, { 
          type: 'group',
          tripId: result.tripId,
          participants: result.participants,
          nbParticipants: participants.length
        });
      } catch (error) {
        alert('Erreur: ' + (error as Error).message);
      } finally {
        setLoading(false);
      }
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
                  onClick={() => setStep(2)}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-5 rounded-2xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-xl hover:shadow-2xl flex items-center justify-center group"
                >
                  Continuer
                  <ArrowRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => {
                    setCriteria([...CRITERIA]);
                    setStep(2);
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
                    {participants.length > 1 && (
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

              <button
                onClick={addParticipant}
                disabled={participants.length >= maxParticipants}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Ajouter un participant {participants.length >= maxParticipants && `(max ${maxParticipants})`}
              </button>
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

  const FormView = ({ onBack }: { onBack: () => void }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
      prenom: '',
      nom: '',
      dateNaissance: '',
      email: '',
      nbVoyageurs: '',
      enfants: '',
      villeDepart: '',
      dateDepart: '',
      duree: '',
      budget: '',
      distance: '',
      motivations: [] as string[],
      motivationsDetail: '',
      voyageType: '',
      planningStyle: '',
      environnements: [] as string[],
      climat: '',
      paysVisites: '',
      activites: [] as string[],
      rythme: '',
      problemeSante: '',
      phobies: '',
      interdits: '',
      formatRevelation: ''
    });

    const totalSteps = 10;

    const updateField = (field: string, value: any) => {
      setFormData({ ...formData, [field]: value });
    };

    const toggleMultiSelect = (field: string, value: string) => {
      const current = formData[field as keyof typeof formData] as string[];
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
        
        if (CONFIG.airtableApiKey === 'YOUR_AIRTABLE_API_KEY') {
          console.log('Mode démo - Formulaire soumis:', formData);
          alert('Mode démo:\nFormulaire envoyé avec succès! 🎉\n\nVotre destination sera préparée dans les 48-72h.');
          setLoading(false);
          return;
        }

        await AirtableAPI.saveFormResponse({
          participantId: tripData.participantId || 'DEMO',
          ...formData
        });

        if (tripData.participantRecordId) {
          await AirtableAPI.updateParticipantStatus(tripData.participantRecordId, 'completed');
        }

        alert('Formulaire envoyé ! 🎉\nVotre destination est en cours de préparation.');
        onBack();
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
            {currentStep === 1 && (
              <div>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">✈️ Avant de décoller, faisons connaissance
