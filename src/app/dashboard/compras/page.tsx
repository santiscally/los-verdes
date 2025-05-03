

// src/app/dashboard/compras/page.tsx
'use client';

import { 
  getAllPurchases, 
  deletePurchase, 
  updatePurchaseStatus,
  Purchase,
  PurchaseItem 
} from '@/services/purchaseService';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import PurchaseQuickEdit from '@/components/compras/PurchaseQuickEdit';

export default function ComprasPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showPurchaseEdit, setShowPurchaseEdit] = useState<boolean>(false);
  const [currentPurchaseId, setCurrentPurchaseId] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Cargar compras al montar el componente
  useEffect(() => {
    loadPurchases();
  }, []);

  // Función para cargar compras
  async function loadPurchases() {
    try {
      setLoading(true);
      const purchasesData = await getAllPurchases();
      setPurchases(purchasesData);
      setError(null);
    } catch (err) {
      console.error('Error al cargar compras:', err);
      setError('Error al cargar las compras. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  // Función para eliminar compra
  async function handleDeletePurchase(id: string) {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta compra? Esto también revertirá los cambios en el inventario.')) {
      try {
        await deletePurchase(id);
        loadPurchases(); // Recargar compras
        setSuccessMessage('Compra eliminada correctamente');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (err) {
        console.error('Error al eliminar compra:', err);
        setError('Error al eliminar la compra. Por favor, intenta nuevamente.');
      }
    }
  }

  // Función para abrir edición rápida de compra
  function handleEditPurchase(id: string) {
    setCurrentPurchaseId(id);
    setShowPurchaseEdit(true);
  }

  // Función para marcar compra como completada
  async function handleCompletePurchase(id: string) {
    try {
      await updatePurchaseStatus(id, 'completada');
      loadPurchases(); // Recargar compras
      setSuccessMessage('Compra marcada como completada');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error al actualizar estado de compra:', err);
      setError('Error al actualizar el estado de la compra. Por favor, intenta nuevamente.');
    }
  }

  // Formatear fecha
  function formatDate(dateString: string): string {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy', { locale: es });
    } catch (err) {
      return dateString;
    }
  }

  // Filtrar compras según término de búsqueda
  const filteredPurchases = searchTerm
    ? purchases.filter(purchase => 
        purchase.observaciones?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.estado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatDate(purchase.fechaCompra).includes(searchTerm)
      )
    : purchases;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Compras</h1>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar compras..."
            className="w-full p-3 pl-10 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
        </div>
      </div>

      {/* Mensajes de estado */}
      {loading && <p className="text-center py-4">Cargando compras...</p>}
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{successMessage}</span>
        </div>
      )}

      {/* Tabla de compras */}
      {!loading && !error && (
        <>
          {filteredPurchases.length === 0 ? (
            <p className="text-center py-4">No se encontraron compras.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-left">Fecha</th>
                    <th className="py-3 px-4 text-left">Estado</th>
                    <th className="py-3 px-4 text-left">Observaciones</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.map((purchase) => (
                    <tr key={purchase.id} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4">{formatDate(purchase.fechaCompra)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${purchase.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' : 
                            purchase.estado === 'completada' ? 'bg-green-100 text-green-800' : 
                            'bg-gray-100 text-gray-800'}`}>
                          {purchase.estado || 'pendiente'}
                        </span>
                      </td>
                      <td className="py-3 px-4">{purchase.observaciones || '-'}</td>
                      <td className="py-3 px-4 text-right">${purchase.total?.toLocaleString() || 0}</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => handleEditPurchase(purchase.id)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Editar Precios"
                          >
                            ✏️
                          </button>
                          {purchase.estado === 'pendiente' && (
                            <button
                              onClick={() => handleCompletePurchase(purchase.id)}
                              className="text-green-600 hover:text-green-800"
                              title="Marcar como Completada"
                            >
                              ✅
                            </button>
                          )}
                          <button
                            onClick={() => handleDeletePurchase(purchase.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal de edición rápida de compra */}
      {showPurchaseEdit && (
        <PurchaseQuickEdit
          purchaseId={currentPurchaseId}
          onSave={() => {
            setShowPurchaseEdit(false);
            loadPurchases();
            setSuccessMessage('Compra actualizada correctamente');
            setTimeout(() => setSuccessMessage(''), 3000);
          }}
          onCancel={() => setShowPurchaseEdit(false)}
        />
      )}
    </div>
  );
}