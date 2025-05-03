'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import MainLayout from '@/components/layout/MainLayout';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!currentUser) {
      router.push('/dashboard');
    }
  }, [currentUser, router]);

  if (!currentUser) {
    return null;
  }

  return (
    <MainLayout>
      <div className="dashboard-content">
        {children}
      </div>
    </MainLayout>
  );
}