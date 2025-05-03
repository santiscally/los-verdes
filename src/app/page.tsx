'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Login from '@/components/auth/Login';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if user is authenticated
    if (currentUser) {
      // Add a small delay to ensure routes are initialized
      setTimeout(() => {
        router.push('/dashboard/pedidos');
      }, 100);
    }
  }, [currentUser, router]);

  return (
    <main>
      <Login />
    </main>
  );
}