// src/components/pedidos/OrderConsolidation.tsx

import { useState, useEffect } from 'react';
import { generatePurchaseList, ConsolidatedPurchaseList, ConsolidatedPurchaseItem } from '@/services/orderService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

export default function OrderConsolidation() {
  const [deliveryDate, setDeliveryDate] = useState<Date>(new Date());
  const [consolidatedList, setConsolidatedList] = useState<ConsolidatedPurchaseList | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConsolidate() {
    try {
      setLoading(true);
      setError(null);
      
      const result = await generatePurchaseList(deliveryDate);
      setConsolidatedList(result);
    } catch (err: any) {
      console.error('Error al consolidar pedidos:', err);
      setError(`Error al consolidar pedidos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportToCSV() {
    if (!consolidatedList) return;
    
    // Preparar datos para CSV
    const rows = [
      // Encabezados
      ['ITEM', 'Q', 'UM', 'Precio', 'Precio Referencia', 'NAVE', 'TOTAL'],
      // Filas de datos
      ...consolidatedList.items.map(item => [
        item.nombreProducto,
        item.cantidadOptimaCompra.cantidad.toFixed(2),
        item.cantidadOptimaCompra.unidad,
        '', // Precio a completar manualmente
        '', // Proveedor a completar manualmente
        '', // NAVE a completar manualmente
        '' // TOTAL a completar manualmente
      ])
    ];
    
    // Convertir a CSV
    const csvContent = rows.map(row => row.join(',')).join('\n');
    
    // Crear un blob y descargar
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Compra_Mercado_${format(deliveryDate, 'dd-MM-yyyy')}.csv`);
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
      
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Fecha de Entrega
          </label>
          <DatePicker
            selected={deliveryDate}
            onChange={(date: Date) => setDeliveryDate(date)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            dateFormat="dd/MM/yyyy"
            locale={es}
          />
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={handleConsolidate}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            {loading ? 'Procesando...' : 'Consolidar Pedidos'}
          </button>
        </div>
      </div>
      
      {consolidatedList && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Lista de Compra</h2>
            <div className="flex space-x-2">
              <button
                onClick={handleExportToCSV}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Exportar CSV
              </button>
            </div>
          </div>
          
          <p className="mb-4">
            <strong>Fecha de Entrega:</strong> {format(new Date(consolidatedList.fechaEntrega), 'dd/MM/yyyy', { locale: es })}
            <br />
            <strong>Total Pedidos:</strong> {consolidatedList.totalPedidos}
          </p>
          
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left">Producto</th>
                  <th className="py-3 px-4 text-center">Cantidad a Comprar</th>
                  <th className="py-3 px-4 text-left">Desglose por Cliente</th>
                </tr>
              </thead>
              <tbody>
                {consolidatedList.items.map((item, index) => (
                  <tr key={index} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium">{item.nombreProducto}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="font-medium">
                        {item.cantidadOptimaCompra.cantidad.toFixed(2)} {item.cantidadOptimaCompra.unidad}
                      </div>
                      <div className="text-sm text-gray-500">
                        {Object.entries(item.cantidades).map(([unit, qty]) => (
                          <div key={unit}>
                            {qty.toFixed(2)} {unit}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm max-h-32 overflow-y-auto">
                        {item.pedidos.map((pedido, idx) => (
                          <div key={idx} className="mb-1 pb-1 border-b border-gray-100">
                            {pedido.nombreCliente}: {pedido.cantidad} {pedido.unidad}
                          </div>
                        ))}
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