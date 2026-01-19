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
        console.log('📞 Verifying Stripe session...');
        
        // Récupérer les détails de la session Stripe
        const response = await fetch('/api/stripe/verify-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        if (!response.ok) throw new Error('Failed to verify session');
        
        const data = await response.json();
        console.log('✅ Session data:', data);
        
        // Récupérer les metadata
        const metadata = data.metadata || {};
        const type = metadata.type || 'solo';
        const nbParticipants = parseInt(metadata.nbParticipants) || 1;
        const amount = data.amount_total / 100; // Convertir centimes en euros
        
        console.log('📊 Processing:', { type, nbParticipants, amount });
        
        // CAS 1: Carte cadeau
        if (type === 'gift' || metadata.recipientName) {
          console.log('🎁 Creating gift card...');
          
          await fetch('/api/airtable/create-gift-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: `GIFT-${Date.now()}`,
              buyerName: metadata.buyerName || '',
              buyerEmail: data.customer_email,
              recipientName: metadata.recipientName || '',
            }),
          });
          
          setStatus('success');
          setMessage('Carte cadeau créée! Le destinataire recevra un email avec son code.');
          return;
        }
        
        // CAS 2: Voyage (solo ou groupe)
        console.log('✈️ Creating trip with', nbParticipants, 'participant(s)...');
        
        const tripId = `TRIP-${Date.now()}`;
        
 // Créer le voyage dans Airtable
const tripResponse = await fetch('/api/airtable/create-trip', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tripId,
    type: type,
    nbParticipants: nbParticipants,
    amount: amount,
    paymentStatus: 'paid',
    criteriaOrder: metadata.criteriaOrder || ''
  }),
});

const tripData = await tripResponse.json();
const airtableTripRecordId = tripData.id;  // ← Récupérer le record ID d'Airtable

console.log('✅ Trip created:', tripId, 'Airtable Record ID:', airtableTripRecordId);
        
        // Récupérer les participants depuis les metadata
        let participantsData = [];
        try {
          participantsData = metadata.participants ? JSON.parse(metadata.participants) : [];
        } catch (e) {
          console.error('Error parsing participants:', e);
        }
        
        // Si pas de participants dans metadata, créer un participant avec l'email du paiement
        if (participantsData.length === 0) {
          participantsData = [{
            prenom: '',
            nom: '',
            email: data.customer_email
          }];
        }
        
        // Créer chaque participant dans Airtable
        console.log('👥 Creating', participantsData.length, 'participant(s)...');
        
        for (let i = 0; i < participantsData.length; i++) {
          const participant = participantsData[i];
          const code = `CODE-${Date.now()}-${i + 1}`;
          
          await fetch('/api/airtable/create-participant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tripId,
              code,
              prenom: participant.prenom || '',
              nom: participant.nom || '',
              email: participant.email || data.customer_email,
              paymentStatus: 'paid',
            }),
          });
          
          console.log(`✅ Participant ${i + 1} created:`, code);
        }

        setStatus('success');
        setMessage(`Voyage créé! ${participantsData.length} participant(s) recevront un email avec leur code unique.`);
        
      } catch (error) {
        console.error('❌ Error:', error);
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
