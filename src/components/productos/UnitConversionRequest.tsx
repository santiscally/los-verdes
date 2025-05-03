// src/components/productos/UnitConversionRequest.tsx
'use client';

import { useState } from 'react';
import { updateProductConversions, Product } from '@/services/productService';

interface UnitConversionRequestProps {
  product: Product;
  newUnit: string;
  onSave: () => void;
  onCancel: () => void;
}

export default function UnitConversionRequest({ 
  product, 
  newUnit, 
  onSave, 
  onCancel 
}: UnitConversionRequestProps) {
  const [conversionValue, setConversionValue] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!conversionValue) {
      setError('Por favor, ingrese un valor de conversión');
      return;
    }
    
    const numericValue = parseFloat(conversionValue);
    if (isNaN(numericValue) || numericValue <= 0) {
      setError('El valor de conversión debe ser un número positivo');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Crear objeto de conversión
      const conversion = {
        [newUnit]: {
          [product.unidadPredeterminada]: numericValue
        },
        [product.unidadPredeterminada]: {
          [newUnit]: 1 / numericValue
        }
      };
      
      // Actualizar conversiones del producto
      await updateProductConversions(product.id!, conversion);
      onSave();
    } catch (err) {
      console.error('Error al actualizar conversión:', err);
      setError('Error al guardar la conversión. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Nueva Unidad de Medida Detectada
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4">
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          <p className="mb-4 text-gray-600">
            Se ha detectado una nueva unidad de medida <strong>"{newUnit}"</strong> para 
            el producto <strong>"{product.nombre}"</strong>. Por favor, indique la relación 
            de conversión con la unidad predeterminada <strong>"{product.unidadPredeterminada}"</strong>.
          </p>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Conversión: 1 {newUnit} equivale a:
            </label>
            <div className="flex items-center">
              <input
                type="number"
                value={conversionValue}
                onChange={(e) => setConversionValue(e.target.value)}
                min="0.001"
                step="0.001"
                className="shadow appearance-none border rounded-l w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Ej: 10"
                required
              />
              <span className="bg-gray-200 py-2 px-3 rounded-r border-t border-r border-b border-gray-300">
                {product.unidadPredeterminada}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Ejemplo: Si 1 {newUnit} equivale a 10 {product.unidadPredeterminada}, ingrese "10".
            </p>
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onCancel}
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
              {loading ? 'Guardando...' : 'Guardar Conversión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}