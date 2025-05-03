'use client';

import { useState, useEffect } from 'react';
import { getAllReceipts, deleteReceipt, markReceiptAsDelivered } from '@/services/receiptService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReceiptItem {
  productoId: string;
  nombreProducto: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  precioTotal: number;
}

interface Receipt {
  id: string;
  pedidoId: string;
  clienteId: string;
  nombreCliente: string;
  direccionCliente?: string;
  fechaEmision: string;
  fechaEntrega: string;
  items: ReceiptItem[];
  total: number;
  estado: string;
  observaciones?: string;
  firmadoPor?: string;
  urlFirma?: string;
}

export default function RemitosPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
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

  // Función para marcar remito como entregado
  async function handleMarkAsDelivered(id: string) {
    const signedBy = prompt('Ingrese el nombre de quien recibió el pedido:');
    if (signedBy) {
      try {
        await markReceiptAsDelivered(id, signedBy);
        loadReceipts(); // Recargar remitos
        setSuccessMessage('Remito marcado como entregado correctamente');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (err) {
        console.error('Error al marcar remito como entregado:', err);
        setError('Error al marcar el remito como entregado. Por favor, intenta nuevamente.');
      }
    }
  }

  // Función para imprimir remito
  function handlePrintReceipt(receipt: Receipt) {
    // Abrir una nueva ventana para imprimir
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      alert('Por favor, permite las ventanas emergentes para esta página');
      return;
    }
    
    // Crear contenido HTML del remito
    const content = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Remito - ${receipt.nombreCliente}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 10px;
          }
          .info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .info-section {
            width: 45%;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          th {
            background-color: #f5f5f5;
          }
          .total {
            text-align: right;
            font-weight: bold;
            margin-top: 20px;
          }
          .footer {
            margin-top: 30px;
            border-top: 1px solid #ccc;
            padding-top: 10px;
            text-align: center;
          }
          .signature {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
          }
          .signature-line {
            width: 40%;
            border-top: 1px solid #000;
            padding-top: 5px;
            text-align: center;
          }
          @media print {
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Los Verdes</h1>
          <h2>Remito de Entrega</h2>
        </div>
        
        <div class="info">
          <div class="info-section">
            <p><strong>Cliente:</strong> ${receipt.nombreCliente}</p>
            <p><strong>Dirección:</strong> ${receipt.direccionCliente || '-'}</p>
          </div>
          <div class="info-section">
            <p><strong>Fecha de Emisión:</strong> ${formatDate(receipt.fechaEmision)}</p>
            <p><strong>Fecha de Entrega:</strong> ${formatDate(receipt.fechaEntrega)}</p>
            <p><strong>Nº de Remito:</strong> ${receipt.id}</p>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Unidad</th>
              <th>Precio Unit.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${receipt.items.map(item => `
              <tr>
                <td>${item.nombreProducto}</td>
                <td>${item.cantidad}</td>
                <td>${item.unidad}</td>
                <td>$${item.precioUnitario?.toLocaleString() || 0}</td>
                <td>$${item.precioTotal?.toLocaleString() || 0}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="total">
          <p>Total: $${receipt.total?.toLocaleString() || 0}</p>
        </div>
        
        <div class="signature">
          <div class="signature-line">
            <p>Entregado por</p>
          </div>
          <div class="signature-line">
            <p>Recibido por</p>
          </div>
        </div>
        
        <div class="footer">
          <p>Gracias por su compra. Los Verdes - Sistema de Gestión</p>
        </div>
        
        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()">Imprimir Remito</button>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
    
    // Esperar a que se cargue el contenido y luego imprimir
    printWindow.onload = function() {
      printWindow.focus();
      // Esto no imprimirá automáticamente, pero mostrará el diálogo de impresión
      // printWindow.print();
    };
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
                            onClick={() => handlePrintReceipt(receipt)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Imprimir"
                          >
                            🖨️
                          </button>
                          {receipt.estado !== 'entregado' && (
                            <button
                              onClick={() => handleMarkAsDelivered(receipt.id)}
                              className="text-green-600 hover:text-green-800"
                              title="Marcar como Entregado"
                            >
                              ✅
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteReceipt(receipt.id)}
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
    </div>
  );
}