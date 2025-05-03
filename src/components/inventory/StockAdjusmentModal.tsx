'use client';

import { useState, useEffect } from 'react';
import { updateProductStock } from '@/services/productService';

interface Product {
  id: string;
  nombre: string;
  unidadPredeterminada?: string;
  stock?: {
    [key: string]: number;
  };
}

interface StockAdjustmentModalProps {
  product: Product | null;
  onClose: () => void;
  onSave: () => void;
}

interface FormData {
  unidad: string;
  cantidad: number;
  esAjuste: boolean;
  motivo: string;
}

export default function StockAdjustmentModal({ product, onClose, onSave }: StockAdjustmentModalProps) {
  const [formData, setFormData] = useState<FormData>({
    unidad: '',
    cantidad: 0,
    esAjuste: false, // true = ajuste absoluto, false = incremento/decremento
    motivo: ''
  });

  const [currentStock, setCurrentStock] = useState<{[key: string]: number}>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Inicializar datos con el producto seleccionado
  useEffect(() => {
    if (product) {
      setCurrentStock(product.stock || {});
      setFormData({
        ...formData,
        unidad: product.unidadPredeterminada || 'unidad'
      });
    }
  }, [product]);

  // Manejar cambios en el formulario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const isChecked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: isChecked });
    } else if (name === 'cantidad') {
      setFormData({ ...formData, [name]: parseFloat(value) || 0 });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Guardar ajuste de stock
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (!product) {
        throw new Error('No se ha seleccionado un producto');
      }
      
      // Calcular la cantidad a actualizar
      let stockUpdate: {[key: string]: number} = {};
      const { unidad, cantidad, esAjuste } = formData;
      
      if (esAjuste) {
        // Ajuste absoluto - establecer el valor exacto
        stockUpdate[unidad] = cantidad;
      } else {
        // Incremento/decremento - añadir o restar del stock actual
        stockUpdate[unidad] = cantidad;
      }
      
      // Actualizar stock
      await updateProductStock(product.id, stockUpdate);
      
      setSuccess(true);
      setTimeout(() => {
        onSave();
      }, 1000);
    } catch (err) {
      console.error('Error al ajustar stock:', err);
      setError('Error al ajustar el stock. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Calcular el nuevo valor de stock según el formulario actual
  const calculateNewStock = (): number => {
    const { unidad, cantidad, esAjuste } = formData;
    const currentValue = currentStock[unidad] || 0;
    
    if (esAjuste) {
      return cantidad;
    } else {
      return currentValue + cantidad;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Ajustar Stock - {product?.nombre}
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4">
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          {success && (
            <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
              <span className="block sm:inline">
                Stock actualizado exitosamente.
              </span>
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="unidad">
              Unidad de Medida
            </label>
            <select
              id="unidad"
              name="unidad"
              value={formData.unidad}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            >
              <option value="unidad">Unidad</option>
              <option value="kg">Kilogramo</option>
              <option value="cajon">Cajón</option>
              <option value="bolsa">Bolsa</option>
              <option value="bandeja">Bandeja</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label className="flex items-center text-gray-700 text-sm font-bold mb-2">
              <input
                type="checkbox"
                name="esAjuste"
                checked={formData.esAjuste}
                onChange={handleChange}
                className="mr-2"
              />
              Ajuste absoluto (en lugar de incremento/decremento)
            </label>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="cantidad">
              {formData.esAjuste ? 'Nueva Cantidad' : 'Cantidad a Añadir/Restar'} *
            </label>
            <input
              type="number"
              id="cantidad"
              name="cantidad"
              value={formData.cantidad}
              onChange={handleChange}
              step="0.01"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              {!formData.esAjuste && 'Use valores negativos para reducir el stock.'}
            </p>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="motivo">
              Motivo del Ajuste
            </label>
            <textarea
              id="motivo"
              name="motivo"
              value={formData.motivo}
              onChange={handleChange}
              rows={2}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Ej: Recuento físico, merma, error en ingreso, etc."
            ></textarea>
          </div>
          
          <div className="bg-gray-100 p-3 rounded mb-4">
            <p className="text-sm">
              <span className="font-bold">Stock Actual en {formData.unidad}:</span> {currentStock[formData.unidad] || 0}
            </p>
            <p className="text-sm">
              <span className="font-bold">Nuevo Stock:</span> {calculateNewStock()} {formData.unidad}
            </p>
          </div>
          
          <div className="flex justify-end mt-6">
            <button
              type="button"
              className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-md shadow-sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 border border-transparent rounded-md shadow-sm"
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Guardar Ajuste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}