// src/components/pedidos/OrderConsolidationView.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  getOrdersByDeliveryDate, 
  consolidateOrdersForPurchase,
  generatePurchaseList,
  ConsolidatedPurchaseList
} from '@/services/orderService';
import { generatePurchaseFromConsolidatedOrders } from '@/services/purchaseService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

export default function OrderConsolidationView() {
  const [deliveryDate, setDeliveryDate] = useState<Date>(new Date(Date.now() + 24 * 60 * 60 * 1000)); // Mañana por defecto
  const [orders, setOrders] = useState<any[]>([]);
  const [consolidatedList, setConsolidatedList] = useState<ConsolidatedPurchaseList | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Cargar pedidos para la fecha seleccionada
  useEffect(() => {
    loadOrders();
  }, [deliveryDate]);

  async function loadOrders() {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setConsolidatedList(null);
      
      const ordersData = await getOrdersByDeliveryDate(deliveryDate);
      setOrders(ordersData);
      
      // Si hay pedidos, generar lista consolidada automáticamente
      if (ordersData.length > 0) {
        const consolidated = await generatePurchaseList(deliveryDate);
        setConsolidatedList(consolidated);
      }
    } catch (err) {
      console.error('Error al cargar pedidos:', err);
      setError('Error al cargar los pedidos. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  // Generar compra a partir de la lista consolidada
  async function handleGeneratePurchase() {
    if (!consolidatedList) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Generar orden de compra
      await generatePurchaseFromConsolidatedOrders(consolidatedList);
      
      setSuccess('Orden de compra generada exitosamente.');
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    } catch (err) {
      console.error('Error al generar orden de compra:', err);
      setError('Error al generar la orden de compra. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  // Exportar lista de compra a CSV/Excel
  function handleExportToCsv() {
    if (!consolidatedList) return;
    
    // Preparar datos para CSV
    const headers = ['Producto', 'Cantidad', 'Unidad', 'Pedidos'];
    const rows = [
      headers,
      ...consolidatedList.items.map(item => [
        item.nombreProducto,
        item.cantidadOptimaCompra.cantidad.toString(),
        item.cantidadOptimaCompra.unidad,
        item.pedidos.length.toString()
      ])
    ];
    
    // Convertir a CSV
    const csvContent = rows.map(row => row.join(',')).join('\n');
    
    // Crear un blob y descargar
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `lista_compra_${format(deliveryDate, 'dd-MM-yyyy')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Consolidación de Pedidos</h1>
      
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{success}</span>
        </div>
      )}
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Fecha de Entrega
          </label>
          <div className="flex items-center">
            <DatePicker
              selected={deliveryDate}
              onChange={(date: Date) => setDeliveryDate(date)}
              dateFormat="dd/MM/yyyy"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              locale={es}
            />
            <button
              onClick={loadOrders}
              className="ml-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              disabled={loading}
            >
              {loading ? 'Cargando...' : 'Buscar'}
            </button>
          </div>
        </div>
        
        {orders.length === 0 && !loading ? (
          <p className="text-gray-500 italic">No hay pedidos para la fecha seleccionada.</p>
        ) : (
          <div>
            <h2 className="text-lg font-semibold mb-2">Pedidos ({orders.length})</h2>
            <ul className="mb-4 max-h-40 overflow-y-auto">
              {orders.map(order => (
                <li key={order.id} className="p-2 border-b border-gray-200 hover:bg-gray-50">
                  <div className="flex justify-between">
                    <span className="font-medium">{order.nombreCliente}</span>
                    <span className="text-gray-600 text-sm">
                      {order.items.length} ítems | ${order.total?.toLocaleString() || 0}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {consolidatedList && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Lista de Compra</h2>
            <div className="space-x-2">
              <button
                onClick={handleExportToCsv}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                disabled={loading}
              >
                Exportar CSV
              </button>
              <button
                onClick={handleGeneratePurchase}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                disabled={loading}
              >
                Generar Orden de Compra
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left">Producto</th>
                  <th className="py-3 px-4 text-center">Cantidad a Comprar</th>
                  <th className="py-3 px-4 text-left">Detalles</th>
                </tr>
              </thead>
              <tbody>
                {consolidatedList.items.map((item, index) => (
                  <tr key={index} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4">{item.nombreProducto}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="font-medium">
                        {item.cantidadOptimaCompra.cantidad.toFixed(2)} {item.cantidadOptimaCompra.unidad}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        <details>
                          <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                            Ver detalles ({item.pedidos.length} pedidos)
                          </summary>
                          <div className="mt-2 p-2 bg-gray-50 rounded">
                            <ul className="space-y-1">
                              {Object.entries(item.cantidades).map(([unit, qty]) => (
                                <li key={unit} className="text-gray-600">
                                  {qty.toFixed(2)} {unit}
                                </li>
                              ))}
                              <li className="mt-2 pt-2 border-t border-gray-200">
                                <strong>Clientes:</strong>
                              </li>
                              {item.pedidos.map((pedido, idx) => (
                                <li key={idx} className="text-gray-600">
                                  {pedido.nombreCliente}: {pedido.cantidad} {pedido.unidad}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </details>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}