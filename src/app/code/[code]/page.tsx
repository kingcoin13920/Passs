'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CodePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  
  useEffect(() => {
    // Rediriger vers l'URL qui fonctionne déjà
    router.replace(`/?action=code&c=${code}`);
  }, [code, router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f7f7f7" }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement...</p>
      </div>
    </div>
  );
}
