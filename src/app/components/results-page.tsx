"use client";

import React, { useState, useEffect } from 'react';
import { Download, Share2, ArrowLeft, MapPin, Calendar, Users } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ResultsPageProps {
  code: string;
  onBack: () => void;
}

const ResultsPage = ({ code, onBack }: ResultsPageProps) => {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadResults();
  }, [code]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/airtable/get-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error('Résultats non disponibles');
      }

      const data = await response.json();
      
      if (!data.destination) {
        setError('Votre destination n\'est pas encore prête. Vous recevrez un email dès qu\'elle sera disponible !');
        setLoading(false);
        return;
      }

      setResults(data);
      setLoading(false);

      // Lancer les confettis !
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }, 500);

      // Deuxième vague de confettis
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 1000);

    } catch (error) {
      console.error('Erreur chargement résultats:', error);
      setError('Impossible de charger les résultats. Veuillez réessayer.');
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!results?.pdfUrl) {
      alert('Le PDF n\'est pas encore disponible');
      return;
    }

    try {
      const response = await fetch(results.pdfUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Voyage-${results.destination}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erreur téléchargement PDF:', error);
      alert('Erreur lors du téléchargement du PDF');
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `🎉 Ma destination surprise : ${results?.destination}`,
      text: `Je pars à ${results?.destination} grâce à Passworld !`,
      url: window.location.href
    };

    // Créer une image pour la story (canvas)
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Fond dégradé
      const gradient = ctx.createLinearGradient(0, 0, 0, 1920);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1080, 1920);

      // Logo Passworld
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 80px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('PASSWORLD', 540, 200);

      // Destination
      ctx.font = 'bold 120px Arial';
      ctx.fillText(results?.destination || '', 540, 1000);

      // Texte
      ctx.font = '50px Arial';
      ctx.fillText('Mon voyage surprise', 540, 1200);

      // Convertir en blob
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], 'passworld-destination.png', { type: 'image/png' });
          
          if (navigator.share && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: shareData.title,
                text: shareData.text,
              });
            } catch (error) {
              console.log('Partage annulé ou erreur:', error);
            }
          } else {
            // Fallback: télécharger l'image
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'passworld-destination.png';
            a.click();
            URL.revokeObjectURL(url);
            alert('Image téléchargée ! Partagez-la sur vos réseaux sociaux 📱');
          }
        }
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1612278675615-7b093b07772d?q=80&w=1920)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
        <div className="bg-white rounded-4xl shadow-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de votre destination...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1612278675615-7b093b07772d?q=80&w=1920)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
        <div className="max-w-2xl w-full bg-white rounded-4xl shadow-2xl p-8">
          <button
            onClick={onBack}
            className="flex items-center text-gray-500 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Retour
          </button>
          <div className="text-center">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Patience...</h2>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-auto py-8 px-4" style={{
      backgroundImage: 'url(https://images.unsplash.com/photo-1612278675615-7b093b07772d?q=80&w=1920)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}>
      <div className="max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center text-white hover:text-gray-200 mb-6 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Retour
        </button>

        {/* Card principale */}
        <div className="bg-white rounded-4xl shadow-2xl overflow-hidden">
          {/* Hero image */}
          {results?.imageUrl && (
            <div className="relative h-64 md:h-96 overflow-hidden">
              <img 
                src={results.imageUrl} 
                alt={results.destination}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-2">
                  🎉 {results.destination}
                </h1>
                <p className="text-white/90 text-lg">Votre destination surprise !</p>
              </div>
            </div>
          )}

          {/* Contenu */}
          <div className="p-6 md:p-8">
            {/* Informations du voyage */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              {results?.departureDate && (
                <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-4">
                  <Calendar className="w-6 h-6 text-gray-600" />
                  <div>
                    <p className="text-xs text-gray-500">Départ</p>
                    <p className="font-semibold">{new Date(results.departureDate).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              )}
              
              {results?.duration && (
                <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-4">
                  <Calendar className="w-6 h-6 text-gray-600" />
                  <div>
                    <p className="text-xs text-gray-500">Durée</p>
                    <p className="font-semibold">{results.duration}</p>
                  </div>
                </div>
              )}
              
              {results?.nbParticipants && (
                <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-4">
                  <Users className="w-6 h-6 text-gray-600" />
                  <div>
                    <p className="text-xs text-gray-500">Participants</p>
                    <p className="font-semibold">{results.nbParticipants}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {results?.description && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">À propos de votre destination</h2>
                <p className="text-gray-600 leading-relaxed">{results.description}</p>
              </div>
            )}

            {/* Galerie d'images */}
            {results?.gallery && results.gallery.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Galerie</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {results.gallery.map((img: string, index: number) => (
                    <div key={index} className="aspect-square rounded-2xl overflow-hidden">
                      <img 
                        src={img} 
                        alt={`${results.destination} ${index + 1}`}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col md:flex-row gap-4">
              <button
                onClick={handleDownloadPDF}
                className="flex-1 bg-gray-800 text-white py-4 rounded-2xl font-semibold hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Télécharger le PDF
              </button>
              
              <button
                onClick={handleShare}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-2xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-colors flex items-center justify-center gap-2"
              >
                <Share2 className="w-5 h-5" />
                Partager en story
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
