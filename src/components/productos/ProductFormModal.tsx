// src/components/productos/ProductFormModal.tsx
// Simplificar el formulario de creación/edición de productos

'use client';

import { useState, useEffect } from 'react';
import { createProduct, updateProduct } from '@/services/productService';

interface Conversiones {
  [key: string]: {
    [key: string]: number;
  };
}

interface Product {
  id?: string;
  nombre: string;
  unidadPredeterminada?: string;
  precio?: number;
  margenGanancia?: number;
  stock?: {
    [key: string]: number;
  };
  conversiones?: Conversiones;
}

interface ProductFormModalProps {
  product: Product | null;
  onClose: () => void;
  onSave: () => void;
}

export default function ProductFormModal({ product, onClose, onSave }: ProductFormModalProps) {
  const [formData, setFormData] = useState<Product>({
    nombre: '',
    unidadPredeterminada: 'unidad',
    precio: 0,
    margenGanancia: 1.1, // default 10%
    conversiones: {}
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Si hay un producto, cargar sus datos
  useEffect(() => {
    if (product) {
      setFormData({
        nombre: product.nombre || '',
        unidadPredeterminada: product.unidadPredeterminada || 'unidad',
        precio: product.precio || 0,
        margenGanancia: product.margenGanancia || 1.1,
        conversiones: product.conversiones || {}
      });
    }
  }, [product]);

  // Manejar cambios en el formulario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'precio') {
      setFormData({ ...formData, [name]: parseFloat(value) || 0 });
    } else if (name === 'margenGanancia') {
      // Convertir de porcentaje a multiplicador (ej: 10% -> 1.1)
      const margin = parseFloat(value) || 0;
      // Redondear a 1 decimal
      const roundedMargin = Math.round((1 + (margin / 100)) * 10) / 10;
      setFormData({ ...formData, [name]: roundedMargin });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Manejar cambios en conversiones
  const handleConversionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const [unit, toUnit] = name.split('-'); // ej: "cajon-kg"
    
    const updatedConversions = { ...(formData.conversiones || {}) };
    
    if (!updatedConversions[unit]) {
      updatedConversions[unit] = {};
    }
    
    updatedConversions[unit][toUnit] = parseFloat(value) || 0;
    
    setFormData({ ...formData, conversiones: updatedConversions });
  };

  // Guardar producto
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (product?.id) {
        // Actualizar producto existente
        await updateProduct(product.id, formData);
      } else {
        // Crear nuevo producto
        await createProduct(formData);
      }
      
      setSuccess(true);
      setTimeout(() => {
        onSave();
      }, 1000);
    } catch (err) {
      console.error('Error al guardar producto:', err);
      setError('Error al guardar el producto. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {product ? 'Editar Producto' : 'Nuevo Producto'}
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
                Producto {product ? 'actualizado' : 'creado'} exitosamente.
              </span>
            </div>
          )}
          
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
            </select>
          </div>
          
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="precio">
                Precio
              </label>
              <input
                type="number"
                id="precio"
                name="precio"
                value={formData.precio}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="margenGanancia">
                Margen de Ganancia (%)
              </label>
              <input
                type="number"
                id="margenGanancia"
                name="margenGanancia"
                value={((formData.margenGanancia || 1.1) - 1) * 100}
                onChange={handleChange}
                min="0"
                step="1"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Conversiones
            </label>
            
            <div className="border border-gray-200 rounded p-3 mb-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Kilos por {formData.unidadPredeterminada}</span>
                <input
                  type="number"
                  name={`${formData.unidadPredeterminada}-kg`}
                  value={formData.conversiones?.[formData.unidadPredeterminada || '']?.kg || ''}
                  onChange={handleConversionChange}
                  min="0"
                  step="0.01"
                  placeholder="Ej: 10"
                  className="shadow appearance-none border rounded w-32 py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-6 px-6 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
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
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}