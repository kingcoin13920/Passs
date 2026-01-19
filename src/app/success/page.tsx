"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check } from 'lucide-react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (!sessionId) {
      setStatus('error');
      setMessage('Session invalide');
      return;
    }

    // Enregistrer les données dans Airtable
    const saveToAirtable = async () => {
      try {
        // Récupérer les détails de la session Stripe
        const response = await fetch('/api/stripe/verify-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        if (!response.ok) throw new Error('Failed to verify session');
        
        const data = await response.json();
        
        console.log('✅ Session data:', data);
        
        // Enregistrer dans Airtable selon le type
        // Si pas de type dans metadata, deviner selon l'URL ou enregistrer par défaut
        const type = data.metadata?.type || 'solo'; // Par défaut: solo
        
        if (type === 'gift' || data.metadata?.recipientName) {
          console.log('📦 Creating gift card...');
          await fetch('/api/airtable/create-gift-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: `GIFT-${Date.now()}`,
              buyerName: data.metadata?.buyerName || '',
              buyerEmail: data.customer_email,
              recipientName: data.metadata?.recipientName || '',
            }),
          });
        } else {
          console.log('✈️ Creating trip...');
          const tripId = `TRIP-${Date.now()}`;
          const code = `CODE-${Date.now()}`;
          
          // Créer le voyage
          await fetch('/api/airtable/create-trip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tripId,
              type: 'solo',
              nbParticipants: 1,
              amount: 29,
              paymentStatus: 'paid',
            }),
          });
          
          // Créer le participant
          await fetch('/api/airtable/create-participant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tripId,
              code,
              prenom: '',
              nom: '',
              email: data.customer_email,
              paymentStatus: 'paid',
            }),
          });
        }

        setStatus('success');
        setMessage('Paiement confirmé! Vous allez recevoir un email avec vos informations.');
        
      } catch (error) {
        console.error('Error:', error);
        setStatus('error');
        setMessage('Erreur lors de l\'enregistrement. Veuillez contacter le support.');
      }
    };

    saveToAirtable();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Traitement en cours...</h1>
            <p className="text-gray-600">Veuillez patienter</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Paiement réussi! 🎉</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <a
              href="/"
              className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Retour à l'accueil
            </a>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <span className="text-3xl">❌</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Erreur</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <a
              href="/"
              className="inline-block bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
            >
              Retour à l'accueil
            </a>
          </>
        )}
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
