'use client';

import { useState, useEffect } from 'react';
import StockAdjustmentModal from '@/components/inventory/StockAdjusmentModal';
import { 
  getAllProducts, 
  updateProductStock,
  Product  // Importar la interfaz
} from '@/services/productService';

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [filterStock, setFilterStock] = useState<string>('all'); // 'all', 'low', 'out'

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
      setError(null);
    } catch (err) {
      console.error('Error al cargar productos:', err);
      setError('Error al cargar los productos. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  // Función para abrir modal de ajuste de stock
  function openStockModal(product: Product) {
    setCurrentProduct(product);
    setIsModalOpen(true);
  }

  // Filtrar productos según término de búsqueda y filtro de stock
  const filteredProducts = products
    .filter(product => 
      product.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(product => {
      if (filterStock === 'all') return true;
      
      const stockLevel = getStockLevel(product);
      if (filterStock === 'low') return stockLevel === 'low';
      if (filterStock === 'out') return stockLevel === 'out';
      
      return true;
    });

  // Determinar nivel de stock
  function getStockLevel(product: Product): 'ok' | 'low' | 'out' {
    if (!product.stock || !product.unidadPredeterminada) return 'out';
    
    const stockInDefaultUnit = product.stock[product.unidadPredeterminada] || 0;
    
    if (stockInDefaultUnit <= 0) return 'out';
    if (stockInDefaultUnit < 5) return 'low'; // Umbral arbitrario, ajustar según necesidades
    
    return 'ok';
  }

  // Obtener color de fondo según nivel de stock
  function getStockBgColor(product: Product): string {
    const level = getStockLevel(product);
    
    if (level === 'out') return 'bg-red-100';
    if (level === 'low') return 'bg-yellow-100';
    
    return '';
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Stock de Productos</h1>
        <button
          onClick={() => loadProducts()}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
        <div className="relative flex-grow">
          <input
            type="text"
            placeholder="Buscar productos..."
            className="w-full p-3 pl-10 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-gray-700">Filtrar:</span>
          <select
            value={filterStock}
            onChange={(e) => setFilterStock(e.target.value)}
            className="p-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">Todos</option>
            <option value="low">Stock Bajo</option>
            <option value="out">Sin Stock</option>
          </select>
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

      {/* Tabla de productos con stock */}
      {!loading && !error && (
        <>
          {filteredProducts.length === 0 ? (
            <p className="text-center py-4">No se encontraron productos que coincidan con los criterios.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-left">Nombre</th>
                    <th className="py-3 px-4 text-left">Unidad Predeterminada</th>
                    <th className="py-3 px-4 text-center">Stock Disponible</th>
                    <th className="py-3 px-4 text-right">Precio</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className={`border-t border-gray-200 hover:bg-gray-50 ${getStockBgColor(product)}`}>
                      <td className="py-3 px-4">{product.nombre}</td>
                      <td className="py-3 px-4">{product.unidadPredeterminada || 'unidad'}</td>
                      <td className="py-3 px-4 text-center">
                        {product.stock ? (
                          <div>
                            {Object.entries(product.stock).map(([unit, quantity]) => (
                              <div key={unit} className={quantity <= 0 ? 'text-red-600' : ''}>
                                {quantity} {unit}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-red-500">Sin stock</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">${product.precio?.toLocaleString() || 0}</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center">
                          <button
                            onClick={() => openStockModal(product)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Ajustar Stock"
                          >
                            ✏️
                          </button>
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

      {/* Modal para ajustar stock */}
      {isModalOpen && (
        <StockAdjustmentModal
          product={currentProduct}
          onClose={() => setIsModalOpen(false)}
          onSave={() => {
            setIsModalOpen(false);
            loadProducts();
            setSuccessMessage("Stock actualizado correctamente");
            setTimeout(() => setSuccessMessage(""), 3000);
          }}
        />
      )}
    </div>
  );
}