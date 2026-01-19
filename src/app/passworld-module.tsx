"use client";

import React, { useState, useEffect } from 'react';
import { Plane, Gift, Code, Users, ArrowRight, ArrowLeft, Check, GripVertical, Clock, User } from 'lucide-react';
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
    
    try {
      const response = await fetch('/api/airtable/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      
      if (!response.ok) {
        console.error('Verify code API failed:', response.status);
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
  const [showDebug, setShowDebug] = useState(IS_DEMO_MODE); // Debug visible seulement en mode démo


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
      const code = generateCode();
      await AirtableAPI.createParticipant({
        tripId,
        code,
        prenom: data.prenom || '',
        nom: data.nom || '',
        email: data.email || '',
        paymentStatus: 'pending'
      });

      return code;
    } catch (error) {
      console.error('Erreur création voyage:', error);
      throw error;
    }
  };

  const redirectToStripe = async (type: string, amount: number, metadata: any = {}) => {
    try {
      await StripeAPI.createCheckoutSession({
        type,
        amount,
        metadata: {
          ...metadata,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error('Erreur Stripe:', error);
      alert('Erreur lors de la création de la session de paiement');
    }
  };

  // ✅ FONCTION CORRIGÉE - Vérification avec Airtable
  const verifyCodeAndProceed = async (code: string) => {
    setLoading(true);
    try {
      console.log('🔍 Vérification du code:', code);
      
      // Appel à la vraie fonction de vérification
      const result = await AirtableAPI.verifyCode(code);
      
      console.log('📋 Résultat de la vérification:', result);

      if (!result.valid) {
        alert('❌ Code invalide. Veuillez vérifier votre code.');
        setLoading(false);
        return;
      }

      // Code valide - différencier participant vs carte cadeau
      if (result.type === 'participant') {
        // Vérifier si le formulaire a déjà été rempli
        if (result.formStatus === 'completed') {
          alert('✅ Ce formulaire a déjà été complété!');
          setLoading(false);
          return;
        }

        // Stocker les informations du participant
        setTripData({
          ...tripData,
          inputCode: code,
          participantId: result.participantId,
          participantRecordId: result.participantRecordId,
          email: result.email
        });

        // Rediriger vers le formulaire
        setCurrentView('form');
      } 
      else if (result.type === 'gift') {
        // Carte cadeau
        if (result.status === 'used') {
          alert('❌ Cette carte cadeau a déjà été utilisée.');
          setLoading(false);
          return;
        }

        setTripData({
          ...tripData,
          inputCode: code,
          giftCardCode: code,
          recipientName: result.recipientName
        });

        setCurrentView('gift-choice');
      }

    } catch (error) {
      console.error('❌ Erreur lors de la vérification:', error);
      alert('Erreur lors de la vérification du code. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  // Vue Router (page d'accueil)
  const RouterView = () => (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {IS_DEMO_MODE && (
          <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4 mb-6 text-center">
            <p className="text-yellow-800 font-semibold">⚠️ MODE DÉMO ACTIVÉ</p>
            <p className="text-yellow-700 text-sm">Tous les codes sont acceptés en mode démo</p>
          </div>
        )}

        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Passworld
          </h1>
          <p className="text-xl text-gray-600">
            Découvrez votre destination mystère
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Commencer sans code */}
          <button
            onClick={() => setCurrentView('no-code')}
            className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all group"
          >
            <div className="bg-indigo-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plane className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Commencer</h3>
            <p className="text-gray-600 text-sm mb-4">
              Je n'ai pas encore de code
            </p>
            <div className="flex items-center justify-center text-indigo-600 font-medium">
              Démarrer
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* J'ai un code */}
          <button
            onClick={() => setCurrentView('with-code')}
            className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all group"
          >
            <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Code className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">J'ai un code</h3>
            <p className="text-gray-600 text-sm mb-4">
              Accéder avec mon code unique
            </p>
            <div className="flex items-center justify-center text-green-600 font-medium">
              Continuer
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Offrir */}
          <button
            onClick={() => setCurrentView('gift')}
            className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all group"
          >
            <div className="bg-pink-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Gift className="w-8 h-8 text-pink-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Offrir</h3>
            <p className="text-gray-600 text-sm mb-4">
              Carte cadeau Passworld
            </p>
            <div className="flex items-center justify-center text-pink-600 font-medium">
              Offrir
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  // Vue "J'ai un code"
  const WithCodeView = () => {
    const [code, setCode] = useState(tripData.inputCode || '');

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <button
            onClick={() => setCurrentView('router')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Retour
          </button>

          <div className="text-center mb-8">
            <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Code className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Entrez votre code</h2>
            <p className="text-gray-600">
              Le code unique qui vous a été envoyé par email
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Votre code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABC-DEF-GHI"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-lg font-mono tracking-wider"
                maxLength={11}
              />
            </div>

            <button
              onClick={() => verifyCodeAndProceed(code)}
              disabled={loading || !code}
              className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                'Vérification...'
              ) : (
                <>
                  Valider le code
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ... (reste du code identique)

  return (
    <div>
      {currentView === 'router' && <RouterView />}
      {currentView === 'with-code' && <WithCodeView />}
      
      {/* Autres vues... (identiques au fichier original) */}
    </div>
  );
};

export default PassworldModule;
