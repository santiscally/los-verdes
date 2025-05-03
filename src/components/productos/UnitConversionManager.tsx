// src/components/productos/UnitConversionManager.tsx

import { useState, useEffect } from 'react';
import { getProductById, updateProductConversions, buildCompleteConversions } from '@/services/productService';

interface ConversionEditorProps {
  productId: string;
  onClose: () => void;
  onSave: () => void;
}

const commonUnits = [
  { value: 'cajon', label: 'Cajón' },
  { value: 'kg', label: 'Kilogramo' },
  { value: 'unidad', label: 'Unidad' },
  { value: 'atado', label: 'Atado' },
  { value: 'bolsa', label: 'Bolsa' },
  { value: 'bandeja', label: 'Bandeja' },
  { value: 'riestra', label: 'Riestra' },
  { value: 'maple', label: 'Maple' }
];

export default function UnitConversionManager({ productId, onClose, onSave }: ConversionEditorProps) {
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [conversions, setConversions] = useState<{[key: string]: {[key: string]: number}}>({}); 
  const [fromUnit, setFromUnit] = useState<string>('');
  const [toUnit, setToUnit] = useState<string>('');
  const [conversionValue, setConversionValue] = useState<string>('');
  const [customUnit, setCustomUnit] = useState<string>('');
  const [showCustomUnit, setShowCustomUnit] = useState<boolean>(false);

  // Cargar datos del producto
  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        const productData = await getProductById(productId);
        setProduct(productData);
        setConversions(productData?.conversiones || {});
        setFromUnit(productData?.unidadPredeterminada || '');
      } catch (err) {
        console.error('Error al cargar producto:', err);
        setError('Error al cargar datos. Por favor, intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    }
    
    loadProduct();
  }, [productId]);

  // Manejar adición de conversión
  const handleAddConversion = () => {
    if (!fromUnit || !toUnit || !conversionValue) {
      setError('Todos los campos son requeridos');
      return;
    }

    const numValue = parseFloat(conversionValue);
    
    if (isNaN(numValue) || numValue <= 0) {
      setError('El valor de conversión debe ser un número positivo');
      return;
    }

    // Crear una copia de las conversiones actuales
    const updatedConversions = { ...conversions };
    
    // Asegurar que existe la unidad de origen
    if (!updatedConversions[fromUnit]) {
      updatedConversions[fromUnit] = {};
    }
    
    // Establecer la conversión directa
    updatedConversions[fromUnit][toUnit] = numValue;
    
    // También establecer la conversión inversa
    if (!updatedConversions[toUnit]) {
      updatedConversions[toUnit] = {};
    }
    updatedConversions[toUnit][fromUnit] = 1 / numValue;
    
    setConversions(updatedConversions);
    setToUnit('');
    setConversionValue('');
    setError(null);
  };

  // Guardar todas las conversiones
  const handleSaveConversions = async () => {
    try {
      setLoading(true);
      
      // Actualizar las conversiones en la base de datos
      await updateProductConversions(productId, conversions);
      
      // Completar todas las conversiones posibles
      await buildCompleteConversions(productId);
      
      onSave();
    } catch (err) {
      console.error('Error al guardar conversiones:', err);
      setError('Error al guardar conversiones. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Añadir unidad personalizada
  const handleAddCustomUnit = () => {
    if (!customUnit.trim()) {
      setError('El nombre de la unidad no puede estar vacío');
      return;
    }
    
    // Agregar a la lista de selección
    setToUnit(customUnit);
    setShowCustomUnit(false);
    setCustomUnit('');
  };

  // Eliminar una conversión
  const handleDeleteConversion = (fromUnit: string, toUnit: string) => {
    const updatedConversions = { ...conversions };
    
    // Eliminar conversión directa
    if (updatedConversions[fromUnit]) {
      delete updatedConversions[fromUnit][toUnit];
      
      // Eliminar la clave si no quedan conversiones
      if (Object.keys(updatedConversions[fromUnit]).length === 0) {
        delete updatedConversions[fromUnit];
      }
    }
    
    // Eliminar conversión inversa
    if (updatedConversions[toUnit]) {
      delete updatedConversions[toUnit][fromUnit];
      
      // Eliminar la clave si no quedan conversiones
      if (Object.keys(updatedConversions[toUnit]).length === 0) {
        delete updatedConversions[toUnit];
      }
    }
    
    setConversions(updatedConversions);
  };

  // Obtener todas las unidades disponibles (existentes + comunes)
  const getAllUnits = () => {
    const existingUnits = new Set<string>();
    
    // Agregar unidades de conversiones existentes
    Object.keys(conversions).forEach(unit => {
      existingUnits.add(unit);
      Object.keys(conversions[unit]).forEach(u => existingUnits.add(u));
    });
    
    // Agregar unidades comunes que no estén ya incluidas
    const allUnits = [...existingUnits];
    
    commonUnits.forEach(unit => {
      if (!existingUnits.has(unit.value)) {
        allUnits.push(unit.value);
      }
    });
    
    return allUnits.sort();
  };

  if (loading && !product) {
    return <div className="text-center py-6">Cargando datos...</div>;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Gestionar Conversiones - {product?.nombre}
          </h3>
        </div>
        
        <div className="px-6 py-4">
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          {/* Formulario para agregar nueva conversión */}
          <div className="mb-6 p-4 border border-gray-200 rounded">
            <h4 className="font-medium mb-3">Agregar Nueva Conversión</h4>
            
            <div className="grid grid-cols-6 gap-3 mb-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidad de Origen
                </label>
                <select 
                  value={fromUnit}
                  onChange={(e) => setFromUnit(e.target.value)}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                >
                  <option value="">Seleccionar...</option>
                  {getAllUnits().map(unit => (
                    <option key={`from-${unit}`} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidad de Destino
                </label>
                {showCustomUnit ? (
                  <div className="flex">
                    <input
                      type="text"
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      className="block w-full border-gray-300 rounded-l-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                      placeholder="Nueva unidad..."
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomUnit}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-r-md text-white bg-green-600 hover:bg-green-700"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <div className="flex">
                    <select 
                      value={toUnit}
                      onChange={(e) => setToUnit(e.target.value)}
                      className="block w-full border-gray-300 rounded-l-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    >
                      <option value="">Seleccionar...</option>
                      {getAllUnits()
                        .filter(unit => unit !== fromUnit)
                        .map(unit => (
                          <option key={`to-${unit}`} value={unit}>
                            {unit}
                          </option>
                        ))
                      }
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowCustomUnit(true)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-r-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
              
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor de Conversión
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={conversionValue}
                    onChange={(e) => setConversionValue(e.target.value)}
                    step="0.001"
                    min="0"
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    placeholder="Ej: 20"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  1 {fromUnit} = ? {toUnit}
                </p>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddConversion}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                Agregar Conversión
              </button>
            </div>
          </div>
          
          {/* Tabla de conversiones existentes */}
          <div className="mb-6">
            <h4 className="font-medium mb-3">Conversiones Definidas</h4>
            
            {Object.keys(conversions).length === 0 ? (
              <p className="text-gray-500 italic">No hay conversiones definidas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Desde
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hasta
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(conversions).flatMap(([from, toMap]) => 
                      Object.entries(toMap).map(([to, value]) => (
                        <tr key={`${from}-${to}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {from}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {to}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {value}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button
                              onClick={() => handleDeleteConversion(from, to)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Botones de acción */}
          <div className="flex justify-end space-x-3 mt-6 px-6 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveConversions}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Guardar Conversiones'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}