'use client';

import { useParams, useRouter } from 'next/navigation';
import { Check } from 'lucide-react';

export default function PaymentSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#f7f7f7" }}>
      <div className="max-w-md w-full bg-white rounded-4xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-green-600" />
        </div>
        
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Paiement réussi ! 🎉
        </h2>
        
        <div className="bg-gray-50 rounded-2xl p-4 mb-6">
          <p className="text-sm font-mono text-gray-700">
            Votre code : <strong>{code}</strong>
          </p>
        </div>
        
        <p className="text-gray-600 mb-6">
          Vous allez recevoir votre code par email. Mais si vous le souhaitez, vous pouvez gagner du temps et <strong>commencer à remplir le formulaire dès maintenant</strong> !
        </p>
        
        <div className="space-y-3">
          <button
            onClick={() => router.push(`/code/${code}`)}
            className="w-full bg-gray-900 text-white py-4 rounded-full font-semibold hover:bg-gray-800 transition active:scale-95"
          >
            ✏️ Commencer le formulaire maintenant
          </button>
          
          <button
            onClick={() => window.location.href = "https://hihaaa.com"}
            className="w-full border-2 border-gray-300 py-4 rounded-full font-semibold hover:bg-gray-50 transition active:scale-95"
          >
            Retourner au site
          </button>
        </div>
      </div>
    </div>
  );
}
