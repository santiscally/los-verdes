// src/components/remitos/GenerateReceiptModal.tsx
'use client';

import { useState } from 'react';
import { createReceiptFromOrder } from '@/services/receiptService';

interface GenerateReceiptModalProps {
  orderId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function GenerateReceiptModal({ orderId, onClose, onSuccess }: GenerateReceiptModalProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateReceipt = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await createReceiptFromOrder(orderId);
      onSuccess();
    } catch (err) {
      console.error('Error al generar remito:', err);
      setError('Error al generar el remito. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Generar Remito
          </h3>
        </div>
        
        <div className="px-6 py-4">
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          <p className="mb-4 text-gray-600">
            ¿Está seguro de que desea generar un remito para este pedido? 
            Se utilizarán los precios actuales de los productos con sus márgenes de ganancia correspondientes.
          </p>
          
          <div className="flex justify-end space-x-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-md shadow-sm"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGenerateReceipt}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 border border-transparent rounded-md shadow-sm"
              disabled={loading}
            >
              {loading ? 'Generando...' : 'Generar Remito'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}