'use client';

import { useParams } from 'next/navigation';
import PassworldModule from '@/app/passworld-module';

export default function ResultsRoute() {
  const params = useParams();
  const code = params.code as string;

  // Le module gérera automatiquement l'affichage des résultats
  return <PassworldModule />;
}
