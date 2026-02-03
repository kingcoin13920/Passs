'use client';

import { useParams } from 'next/navigation';
import PassworldModule from '@/app/passworld-module';

export default function CodePage() {
  const params = useParams();
  const code = params.code as string;
  
  return (
    <PassworldModule 
      initialView="with-code" 
      initialCode={code} 
    />
  );
}
