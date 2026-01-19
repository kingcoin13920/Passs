// Fichier: src/app/success/page.tsx

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <span className="text-4xl">✅</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Paiement réussi ! 🎉
        </h1>
        <p className="text-gray-600 mb-6">
          Votre carte cadeau a été envoyée par email.
        </p>
        <a
          href="/"
          className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
        >
          Retour à l'accueil
        </a>
      </div>
    </div>
  );
}
