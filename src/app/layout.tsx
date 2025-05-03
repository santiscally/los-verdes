import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Los Verdes - Sistema de Gestión',
  description: 'Sistema de gestión para Los Verdes',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}