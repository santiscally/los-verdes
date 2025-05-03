// src/app/consolidacion/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import OrderConsolidationView from '@/components/pedidos/OrderConsolidationView';

export default function ConsolidacionPage() {
  const { currentUser } = useAuth();
  const router = useRouter();

  // Redirigir si no hay usuario autenticado
  useEffect(() => {
    if (!currentUser) {
      router.push('/');
    }
  }, [currentUser, router]);

  if (!currentUser) {
    return null;
  }

  return (
    <div>
      <OrderConsolidationView />
    </div>
  );
}