// src/components/import/ImportPreviewModal.tsx
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface PreviewItem {
  product: string;
  cantidad: number;
  unidad: string;
  conversionRequired?: {
    from: string;
    to: string;
    value: number;
  };
}

export interface PreviewOrder {
  client: string;
  items: PreviewItem[];
}

export interface ImportPreviewModalProps {
  orders: PreviewOrder[];
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ImportPreviewModal({ 
  orders, 
  onConfirm, 
  onCancel 
}: ImportPreviewModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Vista Previa de Importación
          </h3>
        </div>
        
        <div className="px-6 py-4">
          <p className="text-sm text-gray-600 mb-4">
            A continuación se muestra lo que se va a importar:
          </p>
          
          <div className="overflow-x-auto">
            {orders.map((order, orderIndex) => (
              <div key={orderIndex} className="mb-6">
                <h4 className="font-semibold text-lg mb-2">{order.client}</h4>
                <table className="min-w-full bg-white border border-gray-200 rounded-lg mb-4">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-2 px-4 text-left">Producto</th>
                      <th className="py-2 px-4 text-center">Cantidad</th>
                      <th className="py-2 px-4 text-center">Unidad</th>
                      <th className="py-2 px-4 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, itemIndex) => (
                      <tr key={itemIndex} className="border-t border-gray-200">
                        <td className="py-2 px-4">{item.product}</td>
                        <td className="py-2 px-4 text-center">{item.cantidad}</td>
                        <td className="py-2 px-4 text-center">{item.unidad}</td>
                        <td className="py-2 px-4">
                          {item.conversionRequired ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Conversión: 1 {item.conversionRequired.from} = {item.conversionRequired.value} {item.conversionRequired.to}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Listo
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
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
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 border border-transparent rounded-md"
            >
              Confirmar Importación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}