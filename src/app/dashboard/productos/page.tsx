'use client';

import { useState, useEffect } from 'react';
import { getAllProducts, deleteProduct } from '@/services/productService';
import ProductFormModal from '@/components/productos/ProductFormModal';

interface Conversiones {
  [key: string]: {
    [key: string]: number;
  };
}

interface Product {
  id: string;
  nombre: string;
  unidadPredeterminada?: string;
  precio?: number;
  proveedor?: string;
  margenGanancia?: number;
  categoria?: string;
  stock?: {
    [key: string]: number;
  };
  conversiones?: Conversiones;
}

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);

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

  // Función para abrir modal de creación/edición
  function openProductModal(product: Product | null = null) {
    setCurrentProduct(product);
    setIsModalOpen(true);
  }

  // Función para eliminar producto
  async function handleDeleteProduct(id: string) {
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      try {
        await deleteProduct(id);
        loadProducts(); // Recargar productos
      } catch (err) {
        console.error('Error al eliminar producto:', err);
        setError('Error al eliminar el producto. Por favor, intenta nuevamente.');
      }
    }
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
        <h1 className="text-2xl font-bold">Productos</h1>
        <button
          onClick={() => openProductModal()}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center"
        >
          + Nuevo Producto
        </button>
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
      {error && <p className="text-center text-red-500 py-4">{error}</p>}

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
                    <th className="py-3 px-4 text-left">Proveedor</th>
                    <th className="py-3 px-4 text-left">Margen</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4">{product.nombre}</td>
                      <td className="py-3 px-4">{product.unidadPredeterminada || 'unidad'}</td>
                      <td className="py-3 px-4">${product.precio?.toLocaleString() || 0}</td>
                      <td className="py-3 px-4">{product.proveedor || '-'}</td>
                      <td className="py-3 px-4">
                        {(product.margenGanancia 
                          ? `${((product.margenGanancia - 1) * 100).toFixed(0)}%` 
                          : '10%')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => openProductModal(product)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Eliminar"
                          >
                            🗑️
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

      {/* Modal para crear/editar producto */}
      {isModalOpen && (
        <ProductFormModal
          product={currentProduct}
          onClose={() => setIsModalOpen(false)}
          onSave={() => {
            setIsModalOpen(false);
            loadProducts();
          }}
        />
      )}
    </div>
  );
}