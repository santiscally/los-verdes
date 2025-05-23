'use client';

import { useState, useEffect, useRef } from 'react';
import { getAllProducts, deleteProduct, updateProduct, Product } from '@/services/productService';
import UnitConversionManager from '@/components/productos/UnitConversionManager';
import { FaEdit, FaSave, FaTrash, FaSyncAlt } from 'react-icons/fa';

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isConversionModalOpen, setIsConversionModalOpen] = useState<boolean>(false);
  const [currentProductId, setCurrentProductId] = useState<string>('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Estado para mantener los campos editables temporalmente
  const [editableFields, setEditableFields] = useState<{
    [productId: string]: {
      nombre: string;
      unidadPredeterminada: string;
      precio: number;
      margenGanancia: number;
    }
  }>({});

  // Cargar productos al montar el componente
  useEffect(() => {
    loadProducts();
  }, []);

  // Función para cargar productos
  async function loadProducts() {
    try {
      setLoading(true);
      const productsData = await getAllProducts();
      setProducts(productsData);
      
      // Inicializar los campos editables con los valores actuales
      const initialEditableFields: any = {};
      productsData.forEach(product => {
        initialEditableFields[product.id!] = {
          nombre: product.nombre,
          unidadPredeterminada: product.unidadPredeterminada,
          precio: product.precio || 0,
          margenGanancia: ((product.margenGanancia || 1.5) - 1) * 100
        };
      });
      setEditableFields(initialEditableFields);
      
      setError(null);
    } catch (err) {
      console.error('Error al cargar productos:', err);
      setError('Error al cargar los productos. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  // Función para abrir modal de gestión de conversiones
  function openConversionModal(productId: string) {
    setCurrentProductId(productId);
    setIsConversionModalOpen(true);
  }

  // Función para eliminar producto
  async function handleDeleteProduct(id: string) {
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      try {
        await deleteProduct(id);
        loadProducts(); // Recargar productos
        setSuccessMessage('Producto eliminado correctamente');
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        console.error('Error al eliminar producto:', err);
        setError('Error al eliminar el producto. Por favor, intenta nuevamente.');
      }
    }
  }

  // Función para obtener descripción de conversiones
  function getConversionsDescription(product: Product): string {
    if (!product.conversiones) return '-';
    
    const allConversions: string[] = [];
    const seen = new Set<string>();
    
    // Primero las conversiones desde la unidad predeterminada
    if (product.unidadPredeterminada && product.conversiones[product.unidadPredeterminada]) {
      Object.entries(product.conversiones[product.unidadPredeterminada])
        .filter(([toUnit]) => toUnit !== product.unidadPredeterminada)
        .forEach(([toUnit, value]) => {
          allConversions.push(`1 ${product.unidadPredeterminada} = ${value} ${toUnit}`);
          seen.add(`${product.unidadPredeterminada}-${toUnit}`);
        });
    }
    
    // Agregar otras conversiones relevantes hasta un límite
    Object.entries(product.conversiones).forEach(([fromUnit, toUnits]) => {
      Object.entries(toUnits).forEach(([toUnit, value]) => {
        if (fromUnit !== toUnit && !seen.has(`${fromUnit}-${toUnit}`)) {
          allConversions.push(`1 ${fromUnit} = ${value} ${toUnit}`);
          seen.add(`${fromUnit}-${toUnit}`);
          seen.add(`${toUnit}-${fromUnit}`);
        }
      });
    });
    
    // Limitar a un máximo de 5 conversiones para no sobrecargar la UI
    const displayedConversions = allConversions.slice(0, 5);
    if (allConversions.length > 5) {
      displayedConversions.push(`... y ${allConversions.length - 5} más`);
    }
    
    return displayedConversions.length > 0 ? displayedConversions.join(', ') : '-';
  }
  
  // Habilitar edición para un producto
  function enableEditing(productId: string) {
    setEditingProductId(productId);
  }
  
  // Manejar cambios en los campos editables
  function handleFieldChange(productId: string, field: string, value: string | number) {
    setEditableFields(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }));
  }
  
  // Guardar cambios de un producto
  async function saveProductChanges(productId: string) {
    try {
      setLoading(true);
      
      const editedFields = editableFields[productId];
      
      // Convertir margen de porcentaje a multiplicador
      const margenMultiplicador = 1 + (editedFields.margenGanancia / 100);
      
      await updateProduct(productId, {
        nombre: editedFields.nombre,
        unidadPredeterminada: editedFields.unidadPredeterminada,
        precio: editedFields.precio,
        margenGanancia: Math.round(margenMultiplicador * 10) / 10 // Redondear a 1 decimal
      });
      
      // Actualizar producto en estado local
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === productId
            ? { 
                ...product, 
                nombre: editedFields.nombre,
                unidadPredeterminada: editedFields.unidadPredeterminada,
                precio: editedFields.precio,
                margenGanancia: margenMultiplicador
              }
            : product
        )
      );
      
      setEditingProductId(null);
      setSuccessMessage('Producto actualizado correctamente');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error al guardar producto:', err);
      setError('Error al guardar los cambios. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }
  
  // Manejar doble clic para editar campo específico
  function handleDoubleClick(productId: string) {
    if (editingProductId !== productId) {
      enableEditing(productId);
    }
  }

  // Filtrar productos según término de búsqueda
  const filteredProducts = searchTerm
    ? products.filter(product => 
        product.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : products;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Productos</h1>
        <div className="flex space-x-2">
          <button
            onClick={loadProducts}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
            title="Actualizar lista"
          >
            <FaSyncAlt className="mr-1" />
          </button>
          <button
            onClick={() => {
              // Implementar la lógica para crear nuevo producto
              // Esta parte requiere un diálogo o formulario separado
              alert("Funcionalidad de nuevo producto aún no implementada");
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center"
          >
            + Nuevo Producto
          </button>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar productos..."
            className="w-full p-3 pl-10 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
        </div>
      </div>

      {/* Mensajes de estado */}
      {loading && <p className="text-center py-4">Cargando productos...</p>}
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

      {/* Tabla de productos */}
      {!loading && !error && (
        <>
          {filteredProducts.length === 0 ? (
            <p className="text-center py-4">No se encontraron productos.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-left">Nombre</th>
                    <th className="py-3 px-4 text-left">Unidad</th>
                    <th className="py-3 px-4 text-left">Precio</th>
                    <th className="py-3 px-4 text-left">Margen</th>
                    <th className="py-3 px-4 text-left">Conversiones</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const isEditing = editingProductId === product.id;
                    const editFields = editableFields[product.id!] || {
                      nombre: product.nombre,
                      unidadPredeterminada: product.unidadPredeterminada,
                      precio: product.precio || 0,
                      margenGanancia: ((product.margenGanancia || 1.5) - 1) * 100
                    };
                    
                    return (
                      <tr key={product.id} className={`border-t border-gray-200 ${isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                        <td className="py-3 px-4" onDoubleClick={() => handleDoubleClick(product.id!)}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editFields.nombre}
                              onChange={(e) => handleFieldChange(product.id!, 'nombre', e.target.value)}
                              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            />
                          ) : (
                            product.nombre
                          )}
                        </td>
                        
                        <td className="py-3 px-4" onDoubleClick={() => handleDoubleClick(product.id!)}>
                          {isEditing ? (
                            <select
                              value={editFields.unidadPredeterminada}
                              onChange={(e) => handleFieldChange(product.id!, 'unidadPredeterminada', e.target.value)}
                              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            >
                              <option value="unidad">Unidad</option>
                              <option value="kg">Kilogramo</option>
                              <option value="cajon">Cajón</option>
                              <option value="bolsa">Bolsa</option>
                              <option value="bandeja">Bandeja</option>
                              <option value="atado">Atado</option>
                            </select>
                          ) : (
                            product.unidadPredeterminada || 'unidad'
                          )}
                        </td>
                        
                        <td className="py-3 px-4" onDoubleClick={() => handleDoubleClick(product.id!)}>
                          {isEditing ? (
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">$</span>
                              </div>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editFields.precio}
                                onChange={(e) => handleFieldChange(product.id!, 'precio', parseFloat(e.target.value) || 0)}
                                className="shadow appearance-none border rounded w-full py-2 pl-7 pr-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                              />
                            </div>
                          ) : (
                            `$${product.precio?.toLocaleString() || 0}`
                          )}
                        </td>
                        
                        <td className="py-3 px-4" onDoubleClick={() => handleDoubleClick(product.id!)}>
                          {isEditing ? (
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={editFields.margenGanancia}
                                onChange={(e) => handleFieldChange(product.id!, 'margenGanancia', parseFloat(e.target.value) || 0)}
                                className="shadow appearance-none border rounded w-full py-2 px-3 pr-7 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                              />
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">%</span>
                              </div>
                            </div>
                          ) : (
                            `${((product.margenGanancia || 1.5) - 1) * 100}%`
                          )}
                        </td>
                        
                        <td className="py-3 px-4 text-sm">
                          {getConversionsDescription(product)}
                        </td>
                        
                        <td className="py-3 px-4">
                          <div className="flex justify-center space-x-2">
                            {isEditing ? (
                              <button
                                onClick={() => saveProductChanges(product.id!)}
                                className="text-green-600 hover:text-green-800 p-1 hover:bg-green-100 rounded"
                                title="Guardar cambios"
                              >
                                <FaSave />
                              </button>
                            ) : (
                              <button
                                onClick={() => enableEditing(product.id!)}
                                className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-100 rounded"
                                title="Editar"
                              >
                                <FaEdit />
                              </button>
                            )}
                            <button
                              onClick={() => openConversionModal(product.id!)}
                              className="text-purple-600 hover:text-purple-800 p-1 hover:bg-purple-100 rounded"
                              title="Gestionar Conversiones"
                            >
                              🔄
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id!)}
                              className="text-red-600 hover:text-red-800 p-1 hover:bg-red-100 rounded"
                              title="Eliminar"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal para gestionar conversiones */}
      {isConversionModalOpen && (
        <UnitConversionManager
          productId={currentProductId}
          onClose={() => setIsConversionModalOpen(false)}
          onSave={() => {
            setIsConversionModalOpen(false);
            loadProducts();
          }}
        />
      )}
    </div>
  );
}