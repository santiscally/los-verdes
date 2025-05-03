// src/app/dashboard/remitos/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  getAllReceipts, 
  deleteReceipt, 
  markReceiptAsDelivered,
  getReceiptById,
  Receipt
} from '@/services/receiptService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ReceiptDeliveryModal from '@/components/remitos/ReceiptDeliveryModal';
import ReceiptPreview from '@/components/remitos/ReceiptPreview';


export default function RemitosPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState<boolean>(false);
  const [currentReceiptId, setCurrentReceiptId] = useState<string>('');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Cargar remitos al montar el componente
  useEffect(() => {
    loadReceipts();
  }, []);

  // Función para cargar remitos
  async function loadReceipts() {
    try {
      setLoading(true);
      const receiptsData = await getAllReceipts();
      setReceipts(receiptsData);
      setError(null);
    } catch (err) {
      console.error('Error al cargar remitos:', err);
      setError('Error al cargar los remitos. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  // Función para eliminar remito
  async function handleDeleteReceipt(id: string) {
    if (window.confirm('¿Estás seguro de que deseas eliminar este remito?')) {
      try {
        await deleteReceipt(id);
        loadReceipts(); // Recargar remitos
        setSuccessMessage('Remito eliminado correctamente');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (err) {
        console.error('Error al eliminar remito:', err);
        setError('Error al eliminar el remito. Por favor, intenta nuevamente.');
      }
    }
  }

  // Función para abrir la vista previa de un remito
  async function handlePreviewReceipt(id: string) {
    try {
      setLoading(true);
      const receipt = await getReceiptById(id);
      if (receipt) {
        setSelectedReceipt(receipt);
        setShowPreview(true);
      }
    } catch (err) {
      console.error('Error al cargar remito:', err);
      setError('Error al cargar el remito para vista previa.');
    } finally {
      setLoading(false);
    }
  }

  // Función para abrir modal de entrega
  function handleMarkAsDelivered(id: string) {
    setCurrentReceiptId(id);
    setShowDeliveryModal(true);
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

  // Filtrar remitos según término de búsqueda
  const filteredReceipts = searchTerm
    ? receipts.filter(receipt => 
        receipt.nombreCliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.estado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatDate(receipt.fechaEmision).includes(searchTerm) ||
        formatDate(receipt.fechaEntrega).includes(searchTerm)
      )
    : receipts;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Remitos</h1>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar remitos..."
            className="w-full p-3 pl-10 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
        </div>
      </div>

      {/* Mensajes de estado */}
      {loading && <p className="text-center py-4">Cargando remitos...</p>}
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

      {/* Tabla de remitos */}
      {!loading && !error && (
        <>
          {filteredReceipts.length === 0 ? (
            <p className="text-center py-4">No se encontraron remitos.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-left">Cliente</th>
                    <th className="py-3 px-4 text-left">Fecha Emisión</th>
                    <th className="py-3 px-4 text-left">Fecha Entrega</th>
                    <th className="py-3 px-4 text-left">Estado</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReceipts.map((receipt) => (
                    <tr key={receipt.id} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4">{receipt.nombreCliente || '-'}</td>
                      <td className="py-3 px-4">{formatDate(receipt.fechaEmision)}</td>
                      <td className="py-3 px-4">{formatDate(receipt.fechaEntrega)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${receipt.estado === 'generado' ? 'bg-yellow-100 text-yellow-800' : 
                            receipt.estado === 'entregado' ? 'bg-green-100 text-green-800' : 
                            'bg-gray-100 text-gray-800'}`}>
                          {receipt.estado || 'generado'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">${receipt.total?.toLocaleString() || 0}</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => handlePreviewReceipt(receipt.id!)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Vista Previa"
                          >
                            👁️
                          </button>
                          <button
                            onClick={() => handleMarkAsDelivered(receipt.id!)}
                            className="text-green-600 hover:text-green-800"
                            title="Marcar como Entregado"
                            disabled={receipt.estado === 'entregado'}
                          >
                            ✅
                          </button>
                          <button
                            onClick={() => handleDeleteReceipt(receipt.id!)}
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

      {/* Modal de vista previa de remito */}
      {showPreview && selectedReceipt && (
        <ReceiptPreview
          receipt={selectedReceipt}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Modal para marcar como entregado */}
      {showDeliveryModal && (
        <ReceiptDeliveryModal
          receiptId={currentReceiptId}
          onClose={() => setShowDeliveryModal(false)}
          onSave={() => {
            setShowDeliveryModal(false);
            loadReceipts();
            setSuccessMessage('Remito marcado como entregado correctamente');
            setTimeout(() => setSuccessMessage(''), 3000);
          }}
        />
      )}
    </div>
  );
}