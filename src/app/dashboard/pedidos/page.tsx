// src/app/dashboard/pedidos/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { getAllOrders, deleteOrder, updateOrderStatus } from '@/services/orderService';
import { createReceiptFromOrder } from '@/services/receiptService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import OrderFormModal from '@/components/pedidos/OrderFormalModal';
import GenerateReceiptModal from '@/components/pedidos/GenerateReceiptModal';

export interface OrderItem {
  productoId: string;
  nombreProducto: string;
  cantidad: number;
  unidad: string;
  precioUnitario?: number;
  precioTotal?: number;
  observaciones?: string;
}

export interface Order {
  id: string;
  clienteId: string;
  nombreCliente: string;
  fechaEntrega: string;
  fechaCreacion?: string;
  items: OrderItem[];
  estado: string;
  total: number;
  observaciones?: string;
}

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [currentOrderId, setCurrentOrderId] = useState<string>('');

  // Cargar pedidos al montar el componente
  useEffect(() => {
    loadOrders();
  }, []);

  // Función para cargar pedidos
  async function loadOrders() {
    try {
      setLoading(true);
      const ordersData = await getAllOrders();
      setOrders(ordersData as Order[]);
      setError(null);
    } catch (err) {
      console.error('Error al cargar pedidos:', err);
      setError('Error al cargar los pedidos. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  // Función para abrir modal de creación/edición
  function openOrderModal(order: Order | null = null) {
    setCurrentOrder(order);
    setIsModalOpen(true);
  }

  // Función para eliminar pedido
  async function handleDeleteOrder(id: string) {
    if (window.confirm('¿Estás seguro de que deseas eliminar este pedido?')) {
      try {
        await deleteOrder(id);
        loadOrders(); // Recargar pedidos
        setSuccessMessage('Pedido eliminado correctamente');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (err) {
        console.error('Error al eliminar pedido:', err);
        setError('Error al eliminar el pedido. Por favor, intenta nuevamente.');
      }
    }
  }

  // Función para cambiar estado de pedido
  async function handleChangeStatus(id: string, newStatus: string) {
    try {
      await updateOrderStatus(id, newStatus);
      loadOrders(); // Recargar pedidos
      setSuccessMessage(`Estado del pedido cambiado a "${newStatus}"`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error al cambiar estado del pedido:', err);
      setError('Error al cambiar el estado del pedido. Por favor, intenta nuevamente.');
    }
  }

  // Función para generar remito desde pedido (directa)
  async function handleGenerateReceipt(id: string) {
    try {
      await createReceiptFromOrder(id);
      loadOrders(); // Recargar pedidos
      setSuccessMessage('Remito generado correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error al generar remito:', err);
      setError('Error al generar el remito. Por favor, intenta nuevamente.');
    }
  }

  // Función para abrir el modal de generación de remitos
  function openReceiptModal(id: string) {
    setCurrentOrderId(id);
    setShowReceiptModal(true);
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

  // Filtrar pedidos según término de búsqueda
  const filteredOrders = searchTerm
    ? orders.filter(order => 
        order.nombreCliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.estado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatDate(order.fechaEntrega).includes(searchTerm)
      )
    : orders;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <button
          onClick={() => openOrderModal()}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center"
        >
          + Nuevo Pedido
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar pedidos..."
            className="w-full p-3 pl-10 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
        </div>
      </div>

      {/* Mensajes de estado */}
      {loading && <p className="text-center py-4">Cargando pedidos...</p>}
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

      {/* Tabla de pedidos */}
      {!loading && !error && (
        <>
          {filteredOrders.length === 0 ? (
            <p className="text-center py-4">No se encontraron pedidos.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-left">Cliente</th>
                    <th className="py-3 px-4 text-left">Fecha Entrega</th>
                    <th className="py-3 px-4 text-left">Estado</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4">{order.nombreCliente || '-'}</td>
                      <td className="py-3 px-4">{formatDate(order.fechaEntrega)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${order.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' : 
                            order.estado === 'procesado' ? 'bg-blue-100 text-blue-800' : 
                            order.estado === 'entregado' ? 'bg-green-100 text-green-800' : 
                            'bg-gray-100 text-gray-800'}`}>
                          {order.estado || 'pendiente'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">${order.total?.toLocaleString() || 0}</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => openOrderModal(order)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                          {order.estado === 'pendiente' && (
                            <button
                              onClick={() => openReceiptModal(order.id)}
                              className="text-green-600 hover:text-green-800"
                              title="Generar Remito"
                            >
                              📄
                            </button>
                          )}
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

      {/* Modal para crear/editar pedido */}
      {isModalOpen && (
        <OrderFormModal
          order={currentOrder}
          onClose={() => setIsModalOpen(false)}
          onSave={() => {
            setIsModalOpen(false);
            loadOrders();
          }}
        />
      )}

      {/* Modal para generar remito */}
      {showReceiptModal && (
        <GenerateReceiptModal
          orderId={currentOrderId}
          onClose={() => setShowReceiptModal(false)}
          onSuccess={() => {
            setShowReceiptModal(false);
            loadOrders();
            setSuccessMessage('Remito generado correctamente');
            setTimeout(() => setSuccessMessage(''), 3000);
          }}
        />
      )}
    </div>
  );
}