// src/components/productos/QuickProductCreation.tsx
'use client';

import { useState } from 'react';
import { createProduct } from '@/services/productService';

interface QuickProductCreationProps {
  productName: string;
  initialUnit: string;
  onSave: (productId: string) => void;
  onCancel: () => void;
}

export default function QuickProductCreation({ 
  productName, 
  initialUnit, 
  onSave, 
  onCancel 
}: QuickProductCreationProps) {
  const [formData, setFormData] = useState({
    nombre: productName,
    unidadPredeterminada: initialUnit,
    precio: undefined as number | undefined,
    margenGanancia: 1.1 // Default 10%
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'precio') {
      setFormData({ ...formData, [name]: value ? parseFloat(value) : undefined });
    } else if (name === 'margenGanancia') {
      // Convertir de porcentaje a multiplicador y redondear a 1 decimal
      const margin = parseFloat(value) || 0;
      const roundedMargin = Math.round((1 + (margin / 100)) * 10) / 10;
      setFormData({ ...formData, [name]: roundedMargin });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Crear producto con datos mínimos
      const newProduct = await createProduct({
        nombre: formData.nombre,
        unidadPredeterminada: formData.unidadPredeterminada,
        precio: formData.precio,
        margenGanancia: formData.margenGanancia,
        conversiones: {} // Iniciar con conversiones vacías
      });
      
      onSave(newProduct.id!);
    } catch (err) {
      console.error('Error al crear producto:', err);
      setError('Error al crear el producto. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Nuevo Producto Detectado
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4">
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          <p className="mb-4 text-gray-600">
            Este producto no existe en el sistema. Complete la información básica para crearlo rápidamente.
          </p>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nombre">
              Nombre *
            </label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="unidadPredeterminada">
              Unidad Predeterminada *
            </label>
            <select
              id="unidadPredeterminada"
              name="unidadPredeterminada"
              value={formData.unidadPredeterminada}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            >
              <option value="unidad">Unidad</option>
              <option value="kg">Kilogramo</option>
              <option value="cajon">Cajón</option>
              <option value="bolsa">Bolsa</option>
              <option value="bandeja">Bandeja</option>
              <option value="atado">Atado</option>
            </select>
          </div>
          
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="precio">
                Precio (opcional)
              </label>
              <input
                type="number"
                id="precio"
                name="precio"
                value={formData.precio || ''}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
              <p className="text-xs text-gray-500 mt-1">
                Puede dejarlo vacío y completarlo después.
              </p>
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="margenGanancia">
                Margen de Ganancia (%)
              </label>
              <input
                type="number"
                id="margenGanancia"
                name="margenGanancia"
                value={((formData.margenGanancia) - 1) * 100}
                onChange={handleChange}
                min="0"
                step="1"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 mt-6">
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
              {loading ? 'Creando...' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}