// src/components/productos/ConversionRequestModal.tsx
'use client';

import { useState } from 'react';
import { Product } from '@/services/productService';

export interface ConversionRequest {
  productId: string;
  productName: string;
  fromUnit: string;
  toUnit: string;
  value?: number;
  isReversed?: boolean;
}

export interface ConversionRequestModalProps {
  pendingConversions: ConversionRequest[];
  onSave: (conversions: Map<string, number>) => void;
  onCancel: () => void;
}

export default function ConversionRequestModal({ 
  pendingConversions, 
  onSave, 
  onCancel 
}: ConversionRequestModalProps) {
  const [conversions, setConversions] = useState<Map<string, number>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [reversedRequests, setReversedRequests] = useState<Set<string>>(new Set());

  const handleConversionChange = (key: string, value: string) => {
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue) && numericValue > 0) {
      const newConversions = new Map(conversions);
      newConversions.set(key, numericValue);
      setConversions(newConversions);
      setError(null);
    }
  };
  
  const toggleConversionDirection = (productId: string, fromUnit: string) => {
    const requestId = `${productId}-${fromUnit}`;
    const currentlyReversed = reversedRequests.has(requestId);
    const newReversedRequests = new Set(reversedRequests);
    
    if (currentlyReversed) {
      newReversedRequests.delete(requestId);
    } else {
      newReversedRequests.add(requestId);
    }
    
    setReversedRequests(newReversedRequests);
  };

  const handleSubmit = () => {
    // Validar que todas las conversiones estén completadas
    for (const request of pendingConversions) {
      const key = `${request.productId}-${request.fromUnit}-${request.toUnit}`;
      if (!conversions.has(key)) {
        setError('Debes completar todas las conversiones para continuar');
        return;
      }
    }
    
    // Ajustar las conversiones según la dirección seleccionada
    const finalConversions = new Map<string, number>();
    
    for (const [key, value] of conversions) {
      const [productId, fromUnit, toUnit] = key.split('-');
      const requestId = `${productId}-${fromUnit}`;
      const isReversed = reversedRequests.has(requestId);
      
      if (isReversed) {
        // Si está invertida, la conversión real debe ser inversa
        const reverseKey = `${productId}-${toUnit}-${fromUnit}`;
        const reverseValue = 1 / value;
        finalConversions.set(reverseKey, reverseValue);
      } else {
        finalConversions.set(key, value);
      }
    }
    
    onSave(finalConversions);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Conversiones Requeridas
          </h3>
        </div>
        
        <div className="px-6 py-4">
          <p className="text-sm text-gray-600 mb-4">
            Se encontraron productos con unidades de medida nuevas. 
            Por favor, define las conversiones entre unidades:
          </p>
          
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left">Producto</th>
                  <th className="py-3 px-4 text-center">Conversión</th>
                  <th className="py-3 px-4 text-center">Valor</th>
                </tr>
              </thead>
              <tbody>
                {pendingConversions.map((request, index) => {
                  const key = `${request.productId}-${request.fromUnit}-${request.toUnit}`;
                  const requestId = `${request.productId}-${request.fromUnit}`;
                  const isReversed = reversedRequests.has(requestId);
                  const displayFromUnit = isReversed ? request.toUnit : request.fromUnit;
                  const displayToUnit = isReversed ? request.fromUnit : request.toUnit;
                  
                  return (
                    <tr key={index} className="border-t border-gray-200">
                      <td className="py-3 px-4">{request.productName}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => toggleConversionDirection(request.productId, request.fromUnit)}
                            className="bg-gray-100 hover:bg-gray-200 p-1 rounded text-blue-600"
                            title="Cambiar dirección"
                          >
                            ⇄
                          </button>
                          <span className="text-nowrap">1 {displayFromUnit} equivale a</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="0"
                            value={conversions.get(key) || ''}
                            onChange={(e) => handleConversionChange(key, e.target.value)}
                            className="w-32 px-2 py-1 border rounded text-center"
                            min="0"
                            step="0.01"
                          />
                          <span>{displayToUnit}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-end mt-6 gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-md"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 border border-transparent rounded-md"
            >
              Guardar Conversiones
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}