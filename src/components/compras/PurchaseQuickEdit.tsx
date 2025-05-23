// src/components/compras/PurchaseQuickEdit.tsx
'use client';

import { useState, useEffect } from 'react';
import { getPurchaseById, updatePurchase } from '@/services/purchaseService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PurchaseQuickEditProps {
  purchaseId: string;
  onSave: () => void;
  onCancel: () => void;
}

export default function PurchaseQuickEdit({ purchaseId, onSave, onCancel }: PurchaseQuickEditProps) {
  const [purchase, setPurchase] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);

  // Cargar datos de la compra
  useEffect(() => {
    async function loadPurchase() {
      try {
        setLoading(true);
        const purchaseData = await getPurchaseById(purchaseId);
        
        if (!purchaseData) {
          throw new Error('Compra no encontrada');
        }
        
        setPurchase(purchaseData);
        setItems(purchaseData.items.map((item: any) => ({
          ...item,
          oldPrice: item.precio // Guardar precio anterior para referencia
        })));
      } catch (err) {
        console.error('Error al cargar compra:', err);
        setError('Error al cargar los datos de la compra.');
      } finally {
        setLoading(false);
      }
    }
    
    loadPurchase();
  }, [purchaseId]);

  // Manejar cambio de precio
  const handlePriceChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const newPrice = parseFloat(e.target.value) || 0;
    const updatedItems = [...items];
    
    updatedItems[index] = {
      ...updatedItems[index],
      precio: newPrice,
      precioTotal: newPrice * updatedItems[index].cantidad
    };
    
    setItems(updatedItems);
  };

  // Guardar cambios
  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Calcular nuevo total
      const total = items.reduce((sum, item) => sum + item.precioTotal, 0);
      
      // Actualizar compra
      await updatePurchase(purchaseId, {
        items,
        total,
        estado: 'completada'
      });
      
      onSave();
    } catch (err) {
      console.error('Error al guardar compra:', err);
      setError('Error al guardar los cambios. Por favor, intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6">
          <p className="text-center py-4">Cargando datos de la compra...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            Actualizar Precios de Compra
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-500 cursor-pointer"
            disabled={saving}
          >
            <span className="sr-only">Cerrar</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="px-6 py-4">
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          <div className="mb-4">
            <p className="text-gray-600">
              <strong>Fecha:</strong> {purchase && format(new Date(purchase.fechaCompra), 'dd/MM/yyyy', { locale: es })}
            </p>
            {purchase?.observaciones && (
              <p className="text-gray-600 mt-1">
                <strong>Observaciones:</strong> {purchase.observaciones}
              </p>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left">Producto</th>
                  <th className="py-3 px-4 text-center">Cantidad</th>
                  <th className="py-3 px-4 text-center">Unidad</th>
                  <th className="py-3 px-4 text-center">Precio Unitario</th>
                  <th className="py-3 px-4 text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4">{item.nombreProducto}</td>
                    <td className="py-3 px-4 text-center">{item.cantidad}</td>
                    <td className="py-3 px-4 text-center">{item.unidad}</td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.precio}
                        onChange={(e) => handlePriceChange(index, e)}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      />
                      {item.oldPrice !== item.precio && (
                        <span className="text-xs text-gray-500 block mt-1">
                          Precio anterior: ${item.oldPrice}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      ${item.precioTotal?.toLocaleString() || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={4} className="py-3 px-4 text-right font-bold">
                    Total:
                  </td>
                  <td className="py-3 px-4 text-right font-bold">
                    ${items.reduce((sum, item) => sum + item.precioTotal, 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <div className="flex justify-end mt-6 px-6 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <button
              type="button"
              className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-md shadow-sm cursor-pointer"
              onClick={onCancel}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 border border-transparent rounded-md shadow-sm cursor-pointer"
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Actualizar Precios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}