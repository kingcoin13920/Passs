// Fichier: src/app/cancel/page.tsx

export default function CancelPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="bg-orange-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <span className="text-4xl">❌</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Paiement annulé
        </h1>
        <p className="text-gray-600 mb-6">
          Aucun paiement n'a été effectué.
        </p>
        <a
          href="/"
          className="inline-block bg-orange-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
        >
          Retour à l'accueil
        </a>
      </div>
    </div>
  );
}
