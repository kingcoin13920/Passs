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
    const codeParam = searchParams.get('code');
    const travelersParam = searchParams.get('travelers');
    const typeParam = searchParams.get('type');
    
    if (!sessionId) {
      setStatus('error');
      setMessage('Session invalide');
      return;
    }

    // Enregistrer les données dans Airtable
    const saveToAirtable = async () => {
      // Générer un code GIFT unique
      const generateGiftCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = 'GIFT-';
        for (let i = 0; i < 8; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };
      
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
        const amount = data.amount_total / 100;
        
        console.log('📊 Processing:', { type, nbParticipants, amount });
        
        // CAS 1: Carte cadeau
        if (type === 'gift' || metadata.recipientName) {
          console.log('🎁 Creating gift card...');
          
          const giftCode = generateGiftCode();
          console.log('🎟️ Code généré:', giftCode);
          
          await fetch('/api/airtable/create-gift-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: giftCode,
              buyerName: metadata.buyerName || '',
              buyerEmail: data.customer_email,
              recipientName: metadata.recipientName || '',
            }),
          });
          
          console.log('✅ Gift card created');
          
          // Envoyer l'email à l'acheteur
          console.log('📧 Envoi de l\'email à l\'acheteur:', data.customer_email);
          
          try {
            const emailResponse = await fetch('/api/emails/send-gift-card', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                buyerEmail: data.customer_email,
                buyerName: metadata.buyerName || 'Voyageur',
                recipientName: metadata.recipientName || 'votre proche',
                giftCode: giftCode,
              }),
            });

            if (emailResponse.ok) {
              const emailData = await emailResponse.json();
              console.log('✅ Email carte cadeau envoyé:', emailData);
            } else {
              const errorText = await emailResponse.text();
              console.error('❌ Erreur envoi email carte cadeau:', errorText);
            }
          } catch (emailError) {
            console.error('❌ Exception lors de l\'envoi de l\'email:', emailError);
          }
          
          setStatus('success');
          setMessage('Carte cadeau créée! Vous allez recevoir un email avec le code à transmettre au destinataire.');
          return;
        }
        
        // CAS 2: Voyage (solo ou groupe)
        console.log('✈️ Creating trip with', nbParticipants, 'participant(s)...');
        
        const tripId = `TRIP-${Date.now()}`;
        
        // Vérifier si c'est une extension de carte cadeau
        const isGiftExtension = metadata.isGiftExtension === 'true' || metadata.isGiftExtension === true;
        const giftCardId = metadata.giftCardId;
        
        if (isGiftExtension && giftCardId) {
          console.log('🎁 Extension de carte cadeau détectée:', giftCardId);
          
          // Marquer la carte cadeau comme utilisée
          try {
            await fetch('/api/airtable/update-gift-card-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                giftCardId: giftCardId,
                status: 'used'
              }),
            });
            console.log('✅ Carte cadeau marquée comme utilisée');
          } catch (error) {
            console.error('❌ Erreur mise à jour carte cadeau:', error);
          }
        }
        
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
        const airtableTripRecordId = tripData.id;

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
        
        const createdParticipants = [];
        
        for (let i = 0; i < participantsData.length; i++) {
          const participant = participantsData[i];
          // 🔥 UTILISER LE CODE DE L'URL pour le premier participant
          const code = (i === 0 && codeParam) ? codeParam : `CODE-${Date.now()}-${i + 1}`;
          
          await fetch('/api/airtable/create-participant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tripId: [airtableTripRecordId],
              code,
              prenom: participant.prenom || '',
              nom: participant.nom || '',
              email: participant.email || data.customer_email,
              paymentStatus: 'paid',
            }),
          });
          
          console.log(`✅ Participant ${i + 1} created:`, code);
          
          // Stocker le participant avec son code pour l'envoi d'emails
          createdParticipants.push({
            prenom: participant.prenom || '',
            nom: participant.nom || '',
            email: participant.email || data.customer_email,
            code: code,
          });
        }

        // Envoyer les emails aux participants
        console.log('📧 Envoi des emails à', createdParticipants.length, 'participant(s)...');
        
        try {
          const emailResponse = await fetch('/api/emails/send-participant-codes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              participants: createdParticipants,
              tripId: airtableTripRecordId,
            }),
          });

          if (emailResponse.ok) {
            const emailData = await emailResponse.json();
            console.log('✅ Emails envoyés:', emailData);
          } else {
            const errorText = await emailResponse.text();
            console.error('❌ Erreur envoi emails:', errorText);
          }
        } catch (emailError) {
          console.error('❌ Exception lors de l\'envoi des emails:', emailError);
        }

        // 🔥 REDIRECTION IMMÉDIATE pour voyage solo (sans afficher le message)
        if (typeParam === 'solo' && codeParam && travelersParam === '1') {
          console.log('🚀 Redirection immédiate vers la page de confirmation solo...');
          window.location.href = `/?success=true&code=${codeParam}&travelers=${travelersParam}`;
          return; // Arrêter l'exécution ici
        }
        
        // Pour les autres cas (groupe, carte cadeau), afficher le message
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
