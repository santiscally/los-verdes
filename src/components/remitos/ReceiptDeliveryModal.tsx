// src/components/remitos/ReceiptDeliveryModal.tsx
'use client';

import { useState } from 'react';
import { markReceiptAsDelivered } from '@/services/receiptService';

interface ReceiptDeliveryModalProps {
  receiptId: string;
  onClose: () => void;
  onSave: () => void;
}

export default function ReceiptDeliveryModal({ receiptId, onClose, onSave }: ReceiptDeliveryModalProps) {
  const [signedBy, setSignedBy] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signedBy.trim()) {
      setError('Por favor, ingrese el nombre de quien recibió el pedido.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      await markReceiptAsDelivered(receiptId, signedBy);
      onSave();
    } catch (err) {
      console.error('Error al marcar remito como entregado:', err);
      setError('Error al procesar la entrega. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Marcar Remito como Entregado
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4">
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="signedBy">
              Recibido por *
            </label>
            <input
              type="text"
              id="signedBy"
              value={signedBy}
              onChange={(e) => setSignedBy(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Nombre de quien recibe el pedido"
              required
            />
          </div>
          
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
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 border border-transparent rounded-md shadow-sm"
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Confirmar Entrega'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}