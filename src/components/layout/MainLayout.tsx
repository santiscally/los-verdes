'use client';

import { useState, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface MenuItem {
  path: string;
  name: string;
  icon: string;
}

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { currentUser, logout } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const menuItems: MenuItem[] = [
    { path: '/dashboard/productos', name: 'Productos', icon: '📦' },
    { path: '/dashboard/clientes', name: 'Clientes', icon: '👥' },
    { path: '/dashboard/pedidos', name: 'Pedidos', icon: '🛒' },
    { path: '/dashboard/consolidacion', name: 'Consolidación', icon: '📋' },
    { path: '/dashboard/compras', name: 'Compras', icon: '🛍️' },
    { path: '/dashboard/remitos', name: 'Remitos', icon: '📄' },
    { path: '/dashboard/importar', name: 'Importar', icon: '📥' },
    { path: '/dashboard/stock', name: 'Stock', icon: '📊' },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar para pantallas grandes */}
      <div className="hidden md:flex flex-col w-64 bg-green-800 text-white">
        <div className="p-5 font-bold text-xl border-b border-green-700">
          Los Verdes
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center px-6 py-3 hover:bg-green-700 ${
                pathname === item.path ? 'bg-green-700' : ''
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </nav>
        {currentUser && (
          <div className="p-4 border-t border-green-700">
            <p className="text-sm mb-2">{currentUser.email}</p>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </div>

      {/* Header y contenido para pantallas móviles */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="bg-white shadow-sm h-16 flex items-center justify-between md:justify-end px-6">
          {/* Botón de menú para móviles */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-gray-600 focus:outline-none"
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>

          <div className="md:hidden font-bold">Los Verdes</div>

          {currentUser && (
            <div className="hidden md:block">
              <span className="text-sm text-gray-600 mr-4">{currentUser.email}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </header>

        {/* Menú móvil */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-green-800 text-white">
            <nav>
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center px-6 py-3 hover:bg-green-700 ${
                    pathname === item.path ? 'bg-green-700' : ''
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                </Link>
              ))}
            </nav>
            {currentUser && (
              <div className="p-4 border-t border-green-700">
                <p className="text-sm mb-2">{currentUser.email}</p>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        )}

        {/* Contenido principal */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-100">
          {children}
        </main>
      </div>
    </div>
  );
}