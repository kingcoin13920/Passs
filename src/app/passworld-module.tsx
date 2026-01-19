"use client";

import React, { useState, useEffect } from 'react';
import { Plane, Gift, Code, Users, ArrowRight, ArrowLeft, Check, GripVertical, Clock, User } from 'lucide-react';

const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

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

const PRICES: { [key: number]: number } = { 1: 29, 2: 49, 3: 79, 4: 129 };

interface TripData {
  travelers?: number;
  inputCode?: string;
  statusCode?: string;
  participantId?: string;
  participantRecordId?: string;
  [key: string]: any;
}

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
    if (result.url) window.location.href = result.url;
    return result;
  }
};

const PassworldModule = () => {
  const [currentView, setCurrentView] = useState('router');
  const [tripData, setTripData] = useState<TripData>({});
  const [loading, setLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(IS_DEMO_MODE);
  const [giftFormData, setGiftFormData] = useState({ recipientName: '', buyerName: '', buyerEmail: '' });
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
    return await AirtableAPI.createGiftCard({
      code,
      buyerName: formData.buyerName,
      buyerEmail: formData.buyerEmail,
      recipientName: formData.recipientName
    });
  };

  const createTrip = async (data: any) => {
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
  };

  const createGroupTrip = async (data: any) => {
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
  };

  const redirectToStripe = async (type: string, amount: number, metadata: any) => {
    await StripeAPI.createCheckoutSession({ amount, type, metadata });
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
      await createTrip({ type: 'solo', code: soloCode, email: soloEmail });
      await redirectToStripe('solo', 29, { type: 'solo', code: soloCode, email: soloEmail });
    } catch (error) {
      alert('Erreur: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      {showDebug && (
        <div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-50 max-w-xs">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-sm">🔧 Debug</h3>
            <button onClick={() => setShowDebug(false)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div className="space-y-1 text-xs">
            <button onClick={() => setCurrentView('router')} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded">Router</button>
            <button onClick={() => setCurrentView('gift')} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded">Cadeau</button>
            <button onClick={() => setCurrentView('start')} className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded">Start</button>
          </div>
        </div>
      )}
      {!showDebug && (
        <button onClick={() => setShowDebug(true)} className="fixed top-4 right-4 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg z-50 text-sm">🔧</button>
      )}

      {currentView === 'router' && (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full">
            <div className="text-center mb-12">
              <Plane className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Passworld</h1>
              <p className="text-gray-600">Votre prochaine aventure commence ici</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <button onClick={() => setCurrentView('gift')} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 text-left group">
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-pink-100 rounded-full p-4"><Gift className="w-8 h-8 text-pink-600" /></div>
                  <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Offrir l'expérience</h2>
                <p className="text-gray-600">Offrez une carte cadeau pour une destination surprise</p>
              </button>
              <button onClick={() => setCurrentView('start')} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 text-left group">
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-indigo-100 rounded-full p-4"><Plane className="w-8 h-8 text-indigo-600" /></div>
                  <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Commencer l'expérience</h2>
                <p className="text-gray-600">Découvrez votre destination mystère maintenant</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {currentView === 'gift' && (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-100 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
            <button onClick={() => setCurrentView('router')} className="flex items-center text-gray-600 hover:text-gray-900 mb-6">
              <ArrowLeft className="w-5 h-5 mr-2" />Retour
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom du destinataire *</label>
                <input type="text" value={giftFormData.recipientName} onChange={(e) => setGiftFormData({...giftFormData, recipientName: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent" placeholder="Marie Dupont" />
              </div>
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Vos informations</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Votre nom *</label>
                    <input type="text" value={giftFormData.buyerName} onChange={(e) => setGiftFormData({...giftFormData, buyerName: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent" placeholder="Jean Martin" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Votre email *</label>
                    <input type="email" value={giftFormData.buyerEmail} onChange={(e) => setGiftFormData({...giftFormData, buyerEmail: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent" placeholder="jean@example.com" />
                    <p className="text-sm text-gray-500 mt-1">La carte cadeau vous sera envoyée par email</p>
                  </div>
                </div>
              </div>
              <button onClick={handleGiftCardPayment} disabled={loading} className="w-full bg-pink-600 text-white py-4 rounded-lg font-semibold hover:bg-pink-700 transition-colors flex items-center justify-center disabled:bg-gray-400">
                {loading ? 'Chargement...' : (<>Payer 29€<ArrowRight className="w-5 h-5 ml-2" /></>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {currentView === 'start' && (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
            <button onClick={() => setCurrentView('router')} className="flex items-center text-gray-600 hover:text-gray-900 mb-6">
              <ArrowLeft className="w-5 h-5 mr-2" />Retour
            </button>
            <div className="text-center mb-8">
              <div className="bg-indigo-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Plane className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Commencer l'expérience</h2>
              <p className="text-gray-600">Module en construction</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PassworldModule;
