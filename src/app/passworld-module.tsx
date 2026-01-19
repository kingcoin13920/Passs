"use client";

import React, { useState, useEffect } from 'react';
import { Plane, Gift, Code, Users, ArrowRight, ArrowLeft, Check, GripVertical, Clock, User } from 'lucide-react';

const CONFIG = {
  airtableApiKey: 'YOUR_AIRTABLE_API_KEY',
  airtableBaseId: 'YOUR_BASE_ID',
  stripePublicKey: 'YOUR_STRIPE_PUBLIC_KEY'
};

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

// Mock API helpers for demo mode
const AirtableAPI = {
  createTrip: async (data: any) => {
    console.log('Creating trip:', data);
    return { success: true };
  },
  createParticipant: async (data: any) => {
    console.log('Creating participant:', data);
    return { success: true };
  },
  createGiftCard: async (data: any) => {
    console.log('Creating gift card:', data);
    return { success: true };
  },
  verifyCode: async (code: string) => {
    console.log('Verifying code:', code);
    return { type: 'gift', code, valid: true };
  },
  saveFormResponse: async (data: any) => {
    console.log('Saving form response:', data);
    return { success: true };
  },
  updateParticipantStatus: async (recordId: string, status: string) => {
    console.log('Updating participant status:', recordId, status);
    return { success: true };
  }
};

const StripeAPI = {
  createCheckoutSession: async (data: any) => {
    console.log('Creating Stripe session:', data);
    alert(`Mode démo - Paiement de ${data.amount}€ simulé avec succès!`);
    return { success: true };
  }
};

const PassworldModule = () => {
  const [currentView, setCurrentView] = useState('router');
  const [tripData, setTripData] = useState<TripData>({});
  const [loading, setLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(true);

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
    try {
      // En mode démo, on simule
      if (CONFIG.stripePublicKey === 'YOUR_STRIPE_PUBLIC_KEY') {
        console.log('Mode démo - Paiement simulé:', { type, amount, metadata });
        alert(`Mode démo:\nPaiement de ${amount}€ simulé avec succès!\n\nEn production, vous serez redirigé vers Stripe.`);
        return;
      }

      // En production, rediriger vers Stripe
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

  const verifyCode = async (code: string) => {
    try {
      // En mode démo
      if (CONFIG.airtableApiKey === 'YOUR_AIRTABLE_API_KEY') {
        console.log('Mode démo - Code vérifié:', code);
        return { type: 'gift', code };
      }

      // En production
      return await AirtableAPI.verifyCode(code);
    } catch (error) {
      console.error('Erreur vérification code:', error);
      throw error;
    }
  };

  const GroupSetupView = ({ travelers, onBack, onComplete }: { travelers: number; onBack: () => void; onComplete: (data: any) => void }) => {
    const [step, setStep] = useState(1);
    const [criteria, setCriteria] = useState([...CRITERIA]);
    const [draggedItem, setDraggedItem] = useState(null);
    const [participants, setParticipants] = useState([{ prenom: '', nom: '', email: '' }]);

    // Calculer le prix en fonction du nombre réel de participants
    const calculatePrice = (nbParticipants) => {
      if (nbParticipants === 1) return PRICES[1];
      if (nbParticipants === 2) return PRICES[2];
      if (nbParticipants >= 3 && nbParticipants <= 4) return PRICES[3];
      if (nbParticipants >= 5 && nbParticipants <= 8) return PRICES[4];
      return PRICES[4]; // Max 8 personnes
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
        price: currentPrice 
      });
      onComplete({ criteria, participants, price: currentPrice });
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
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors font-medium"
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
      motivations: [],
      motivationsDetail: '',
      voyageType: '',
      planningStyle: '',
      environnements: [],
      climat: '',
      paysVisites: '',
      activites: [],
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
        
        // En mode démo
        if (CONFIG.airtableApiKey === 'YOUR_AIRTABLE_API_KEY') {
          console.log('Mode démo - Formulaire soumis:', formData);
          alert('Mode démo:\nFormulaire envoyé avec succès! 🎉\n\nVotre destination sera préparée dans les 48-72h.');
          setLoading(false);
          return;
        }

        // En production, sauvegarder dans Airtable
        await AirtableAPI.saveFormResponse({
          participantId: tripData.participantId || 'DEMO',
          ...formData
        });

        // Mettre à jour le statut du participant
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nom *</label>
                    <input
                      type="text"
                      value={formData.nom}
                      onChange={(e) => updateField('nom', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">🛫 Le plan de vol commence ici</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Combien êtes-vous à voyager ?</label>
                    <select
                      value={formData.nbVoyageurs}
                      onChange={(e) => updateField('nbVoyageurs', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">-</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3-4">3-4</option>
                      <option value="5-6">5-6</option>
                      <option value="7+">7+</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Y a-t-il des enfants ?</label>
                    <select
                      value={formData.enfants}
                      onChange={(e) => updateField('enfants', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">-</option>
                      <option value="oui">Oui</option>
                      <option value="non">Non</option>
                    </select>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Votre ville de départ</label>
                      <input
                        type="text"
                        value={formData.villeDepart}
                        onChange={(e) => updateField('villeDepart', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="Lyon"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date de départ</label>
                      <input
                        type="date"
                        value={formData.dateDepart}
                        onChange={(e) => updateField('dateDepart', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Durée</label>
                      <select
                        value={formData.duree}
                        onChange={(e) => updateField('duree', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="">-</option>
                        <option value="weekend">Weekend</option>
                        <option value="3-5j">3-5 jours</option>
                        <option value="1sem">1 semaine</option>
                        <option value="2sem">2 semaines</option>
                        <option value="3sem+">3 semaines+</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Quel est votre budget par personne ? (vols inclus)</label>
                      <select
                        value={formData.budget}
                        onChange={(e) => updateField('budget', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="">-</option>
                        <option value="<500">{"< 500€"}</option>
                        <option value="500-1000">500-1000€</option>
                        <option value="1000-2000">1000-2000€</option>
                        <option value="2000-3000">2000-3000€</option>
                        <option value="3000+">3000€+</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Préférence de distance</label>
                      <select
                        value={formData.distance}
                        onChange={(e) => updateField('distance', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="">-</option>
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

            {/* Step 10: Format révélation */}
            {currentStep === 10 && (
              <div>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">🎁 Formule</h2>
                  <p className="text-gray-600">Comment souhaitez-vous découvrir votre destination ?</p>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { value: 'lettre', label: 'Lettre', desc: 'Révélation physique par courrier' },
                    { value: 'email', label: 'E-mail (PDF)', desc: 'Révélation numérique instantanée' },
                    { value: 'lettre-email', label: 'Lettre + Email (PDF)', desc: 'Les deux formats' }
                  ].map((format) => (
                    <button
                      key={format.value}
                      onClick={() => updateField('formatRevelation', format.value)}
                      className={`p-6 rounded-xl border-2 transition-all text-left ${
                        formData.formatRevelation === format.value
                          ? 'border-emerald-600 bg-emerald-50'
                          : 'border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="font-bold text-lg text-gray-900 mb-2">{format.label}</div>
                      <div className="text-sm text-gray-600">{format.desc}</div>
                    </button>
                  ))}
                </div>

                <div className="mt-8 bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center">
                  <p className="text-emerald-800 font-semibold mb-2">✨ Prêt à découvrir votre destination ?</p>
                  <p className="text-sm text-emerald-700">Votre expérience unique sera préparée dans les 48-72h</p>
                </div>
              </div>
            )}

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

        <div className="grid md:grid-cols-2 gap-6">
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
      </div>
    </div>
  );

  return (
    <div className="relative">
      {showDebug && (
        <div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-50 max-w-xs">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-sm">🔧 Debug Menu</h3>
            <button onClick={() => setShowDebug(false)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div className="space-y-1 text-xs">
            <button onClick={() => setCurrentView('router')} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded">Router</button>
            <button onClick={() => setCurrentView('gift')} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded">Offrir cadeau</button>
            <button onClick={() => setCurrentView('start')} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded">Commencer</button>
            <button onClick={() => setCurrentView('with-code')} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded">Avec code</button>
            <button onClick={() => setCurrentView('no-code')} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded">Sans code</button>
            <button onClick={() => { setTripData({ travelers: 1 }); setCurrentView('solo-payment'); }} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded">Solo</button>
            <button onClick={() => { setTripData({ travelers: 3 }); setCurrentView('group-setup'); }} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded">Groupe</button>
            <button onClick={() => setCurrentView('gift-choice')} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded">Choix cadeau</button>
            <button onClick={() => setCurrentView('dashboard')} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded">Dashboard</button>
            <button onClick={() => setCurrentView('form')} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded">Formulaire</button>
          </div>
        </div>
      )}

      {!showDebug && (
        <button
          onClick={() => setShowDebug(true)}
          className="fixed top-4 right-4 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg z-50 text-sm"
        >
          🔧
        </button>
      )}

      {currentView === 'router' && <Router />}
      
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
                onClick={() => alert('Paiement Stripe 29€')}
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
                type="text"
                className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center text-2xl font-mono tracking-wider"
                placeholder="ABC-123-XYZ"
                maxLength={11}
              />

              <button
                onClick={() => setCurrentView('gift-choice')}
                className="w-full bg-indigo-600 text-white py-4 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                Valider le code
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
                    setTripData({ travelers: option.value });
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
                onClick={() => alert('Paiement Stripe 29€')}
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
          travelers={tripData.travelers} 
          onBack={() => setCurrentView('no-code')}
          onComplete={async (groupData) => {
            setLoading(true);
            try {
              const result = await createGroupTrip(groupData);
              await redirectToStripe('group', groupData.price, { 
                tripId: result.tripId,
                participants: result.participants 
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

      {currentView === 'dashboard' && (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="bg-indigo-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Clock className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Statut du groupe</h2>
              <p className="text-gray-600">Code: ABC-123-XYZ</p>
            </div>

            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Progression</span>
                <span className="text-sm font-medium text-indigo-600">2/4</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-indigo-600 h-3 rounded-full" style={{ width: '50%' }} />
              </div>
            </div>

            <div className="space-y-3 mb-8">
              {[
                { name: 'Marie', completed: true },
                { name: 'Jean', completed: true },
                { name: 'Pierre', completed: false },
                { name: 'Sophie', completed: false }
              ].map((p, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      p.completed ? 'bg-green-100' : 'bg-gray-200'
                    }`}>
                      {p.completed ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <span className="font-medium text-gray-900">{p.name}</span>
                  </div>
                  <span className={`text-sm font-medium ${
                    p.completed ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {p.completed ? 'Complété' : 'En attente'}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <p className="text-yellow-800">
                ⏳ En attente que tous les participants complètent leur formulaire
              </p>
            </div>
          </div>
        </div>
      )}

      {currentView === 'form' && (
        <FormView onBack={() => setCurrentView('router')} />
      )}
    </div>
  );
};

export default PassworldModule;