import { useState, useEffect } from 'react';
import { getProductById, updateProductConversions, buildCompleteConversions } from '@/services/productService';
import { FaPlus, FaTrash, FaSave, FaUndo } from 'react-icons/fa';

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
  const [allUnits, setAllUnits] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);

  // Cargar datos del producto
  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        const productData = await getProductById(productId);
        setProduct(productData);
        setConversions(productData?.conversiones || {});
        setFromUnit(productData?.unidadPredeterminada || '');
        
        // Recopilar todas las unidades disponibles
        const units = new Set<string>();
        if (productData?.unidadPredeterminada) {
          units.add(productData.unidadPredeterminada);
        }
        
        // Agregar unidades de conversiones existentes
        if (productData?.conversiones) {
          Object.keys(productData.conversiones).forEach(unit => {
            units.add(unit);
            Object.keys(productData.conversiones[unit]).forEach(u => units.add(u));
          });
        }
        
        // Agregar unidades comunes que no estén ya incluidas
        commonUnits.forEach(unit => {
          units.add(unit.value);
        });
        
        setAllUnits(Array.from(units).sort());
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
    setSuccess('Conversión agregada. No olvides guardar los cambios.');
    setTimeout(() => setSuccess(null), 3000);
  };

  // Guardar todas las conversiones
  const handleSaveConversions = async () => {
    try {
      setLoading(true);
      
      // Actualizar las conversiones en la base de datos
      await updateProductConversions(productId, conversions);
      
      // Completar todas las conversiones posibles
      await buildCompleteConversions(productId);
      
      setSuccess('Conversiones guardadas correctamente');
      setTimeout(() => onSave(), 1500);
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
    
    // Agregar a la lista de unidades
    setAllUnits(prev => [...prev, customUnit].sort());
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
    setSuccess('Conversión eliminada. No olvides guardar los cambios.');
    setTimeout(() => setSuccess(null), 3000);
  };

  if (loading && !product) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
          </div>
          <p className="text-center mt-4">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center z-10">
          <h3 className="text-xl font-medium text-gray-900 flex items-center">
            <span className="mr-2">🔄</span>
            Gestionar Conversiones: <span className="ml-2 font-bold">{product?.nombre}</span>
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="px-6 py-4">
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
          
          {/* Información sobre la unidad predeterminada */}
          <div className="mb-6 bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-700 mb-2">Unidad Predeterminada</h4>
            <p className="text-blue-700">
              Este producto utiliza <span className="font-bold">{product?.unidadPredeterminada || 'unidad'}</span> como unidad principal.
              Las conversiones te permitirán trabajar con múltiples unidades de medida.
            </p>
          </div>
          
          {/* Formulario para agregar nueva conversión */}
          <div className="mb-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 rounded-t-lg flex justify-between items-center">
              <h4 className="font-medium text-gray-700">Agregar Nueva Conversión</h4>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unidad de Origen
                  </label>
                  <select 
                    value={fromUnit}
                    onChange={(e) => setFromUnit(e.target.value)}
                    className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm p-2"
                  >
                    <option value="">Seleccionar...</option>
                    {allUnits.map(unit => (
                      <option key={`from-${unit}`} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unidad de Destino
                  </label>
                  {showCustomUnit ? (
                    <div className="flex">
                      <input
                        type="text"
                        value={customUnit}
                        onChange={(e) => setCustomUnit(e.target.value)}
                        className="block w-full border border-gray-300 rounded-l-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm p-2"
                        placeholder="Nueva unidad..."
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomUnit}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-green-600 hover:bg-green-700"
                      >
                        <FaPlus />
                      </button>
                    </div>
                  ) : (
                    <div className="flex">
                      <select 
                        value={toUnit}
                        onChange={(e) => setToUnit(e.target.value)}
                        className="block w-full border border-gray-300 rounded-l-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm p-2"
                      >
                        <option value="">Seleccionar...</option>
                        {allUnits
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
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-blue-600 hover:bg-blue-700"
                        title="Agregar nueva unidad"
                      >
                        <FaPlus />
                      </button>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor de Conversión
                  </label>
                  <div className="flex items-center">
                    <div className="relative flex-grow">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">1 {fromUnit || '?'} =</span>
                      </div>
                      <input
                        type="number"
                        value={conversionValue}
                        onChange={(e) => setConversionValue(e.target.value)}
                        step="0.001"
                        min="0"
                        className="block w-full pl-20 pr-12 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm p-2"
                        placeholder="valor"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">{toUnit || '?'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddConversion}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  disabled={!fromUnit || !toUnit || !conversionValue}
                >
                  <FaPlus className="mr-2" /> Agregar Conversión
                </button>
              </div>
            </div>
          </div>
          
          {/* Tabla de conversiones existentes */}
          <div className="mb-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 rounded-t-lg">
              <h4 className="font-medium text-gray-700">Conversiones Existentes</h4>
            </div>
            
            {Object.keys(conversions).length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="text-xl mb-2">No hay conversiones definidas</p>
                <p>Agrega conversiones para poder trabajar con diferentes unidades de medida.</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unidad Origen
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unidad Destino
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(conversions).flatMap(([from, toMap]) => 
                      Object.entries(toMap).map(([to, value]) => (
                        <tr key={`${from}-${to}`} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                            {from}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                            {to}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                            1 {from} = {value} {to}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                            <button
                              onClick={() => handleDeleteConversion(from, to)}
                              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                              title="Eliminar conversión"
                            >
                              <FaTrash />
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
          <div className="sticky bottom-0 flex justify-end space-x-3 py-4 bg-white border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              <FaUndo className="mr-2" /> Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveConversions}
              className="inline-flex items-center px-4 py-2 border border-transparent bg-green-600 text-white rounded-md hover:bg-green-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <FaSave className="mr-2" /> Guardar Conversiones
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}