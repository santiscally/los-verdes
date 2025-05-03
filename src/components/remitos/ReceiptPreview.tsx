// src/components/remitos/ReceiptPreview.tsx
'use client';

import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Receipt } from '@/services/receiptService';
import { useReactToPrint } from 'react-to-print';

interface ReceiptPreviewProps {
  receipt: Receipt;
  onClose: () => void;
}

export default function ReceiptPreview({ receipt, onClose }: ReceiptPreviewProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const componentRef = useRef<HTMLDivElement>(null);

  // Función para imprimir el remito
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    onBeforeGetContent: () => {
      setLoading(true);
      return Promise.resolve();
    },
    onAfterPrint: () => {
      setLoading(false);
    }
  });

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            Vista Previa de Remito
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              disabled={loading}
            >
              {loading ? 'Imprimiendo...' : 'Imprimir'}
            </button>
            <button
              onClick={onClose}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded"
            >
              Cerrar
            </button>
          </div>
        </div>
        
        {/* Contenido del remito para imprimir */}
        <div ref={componentRef} className="p-8 bg-white">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">Los Verdes</h1>
            <h2 className="text-xl">Remito de Entrega</h2>
          </div>
          
          <div className="flex justify-between mb-6">
            <div>
              <p><strong>Cliente:</strong> {receipt.nombreCliente}</p>
              <p><strong>Dirección:</strong> {receipt.direccionCliente || '-'}</p>
            </div>
            <div className="text-right">
              <p><strong>Fecha de Emisión:</strong> {formatDate(receipt.fechaEmision)}</p>
              <p><strong>Fecha de Entrega:</strong> {formatDate(receipt.fechaEntrega)}</p>
              <p><strong>Nº de Remito:</strong> {receipt.id}</p>
            </div>
          </div>
          
          <table className="w-full mb-6 border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 py-2 px-3 text-left">Producto</th>
                <th className="border border-gray-300 py-2 px-3 text-center">Cantidad</th>
                <th className="border border-gray-300 py-2 px-3 text-center">Unidad</th>
                <th className="border border-gray-300 py-2 px-3 text-right">Precio Unit.</th>
                <th className="border border-gray-300 py-2 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((item, index) => (
                <tr key={index} className="border-t border-gray-200">
                  <td className="border border-gray-300 py-2 px-3">{item.nombreProducto}</td>
                  <td className="border border-gray-300 py-2 px-3 text-center">{item.cantidad}</td>
                  <td className="border border-gray-300 py-2 px-3 text-center">{item.unidad}</td>
                  <td className="border border-gray-300 py-2 px-3 text-right">${item.precioUnitario?.toLocaleString() || 0}</td>
                  <td className="border border-gray-300 py-2 px-3 text-right">${item.precioTotal?.toLocaleString() || 0}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td colSpan={4} className="border border-gray-300 py-2 px-3 text-right font-bold">
                  Total:
                </td>
                <td className="border border-gray-300 py-2 px-3 text-right font-bold">
                  ${receipt.total?.toLocaleString() || 0}
                </td>
              </tr>
            </tfoot>
          </table>
          
          {receipt.observaciones && (
            <div className="mb-6">
              <p><strong>Observaciones:</strong> {receipt.observaciones}</p>
            </div>
          )}
          
          <div className="flex justify-between mt-12 pt-6">
            <div className="text-center w-40 border-t border-gray-400">
              <p>Entregado por</p>
            </div>
            <div className="text-center w-40 border-t border-gray-400">
              <p>Recibido por</p>
              {receipt.estado === 'entregado' && receipt.firmadoPor && (
                <p className="font-bold mt-2">{receipt.firmadoPor}</p>
              )}
            </div>
          </div>
          
          <div className="text-center text-sm text-gray-500 mt-16 pt-4 border-t border-gray-200">
            <p>Los Verdes - Sistema de Gestión de Pedidos y Distribución</p>
          </div>
        </div>
      </div>
    </div>
  );
}