'use client';

import { useState, useEffect } from 'react';
import { getAllProducts, updateProductStock } from '@/services/productService';
import StockAdjustmentModal from '@/components/inventory/StockAdjusmentModal';


interface Product {
  id: string;
  nombre: string;
  unidadPredeterminada?: string;
  precio?: number;
  proveedor?: string;
  margenGanancia?: number;
  stock?: {
    [key: string]: number;
  };
}

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');

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

  // Filtrar productos según término de búsqueda
  const filteredProducts = searchTerm
    ? products.filter(product => 
        product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.proveedor?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : products;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Stock de Productos</h1>
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

      {/* Tabla de productos con stock */}
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
                    <th className="py-3 px-4 text-left">Proveedor</th>
                    <th className="py-3 px-4 text-center">Stock Disponible</th>
                    <th className="py-3 px-4 text-right">Precio</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4">{product.nombre}</td>
                      <td className="py-3 px-4">{product.unidadPredeterminada || 'unidad'}</td>
                      <td className="py-3 px-4">{product.proveedor || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        {product.stock ? (
                          <div>
                            {Object.entries(product.stock).map(([unit, quantity]) => (
                              <div key={unit}>
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