// src/components/pedidos/OrderFormModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { createOrder, updateOrder } from '@/services/orderService';
import { getAllClients } from '@/services/clientService';
import { 
  getAllProducts, 
  getProductById, 
  getProductsByName,
  convertUnits,
  Product
} from '@/services/productService';
import { FaPlus, FaTrash } from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import QuickProductCreation from '@/components/productos/QuickProductCreation';
import UnitConversionRequest from '@/components/productos/UnitConversionRequest';

// Restauramos las interfaces originales
interface OrderItem {
  productoId: string;
  nombreProducto: string;
  cantidad: number;
  unidad: string;
  precioUnitario?: number;
  precioTotal?: number;
  observaciones?: string;
}

interface Order {
  id?: string;
  clienteId: string;
  nombreCliente: string;
  fechaEntrega: Date | string;
  items: OrderItem[];
  observaciones?: string;
  estado?: string;
  total?: number;
}

interface OrderFormModalProps {
  order: Order | null;
  onClose: () => void;
  onSave: () => void;
}

export default function OrderFormModal({ order, onClose, onSave }: OrderFormModalProps) {
  const [formData, setFormData] = useState<Order>({
    clienteId: '',
    nombreCliente: '',
    fechaEntrega: new Date(Date.now() + 24 * 60 * 60 * 1000), // Mañana por defecto
    items: [],
    observaciones: ''
  });

  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  
  // Estados para controlar la creación de productos y conversiones
  const [showProductCreation, setShowProductCreation] = useState<boolean>(false);
  const [newProductData, setNewProductData] = useState<{ nombre: string; unidad: string }>({ nombre: '', unidad: '' });
  const [showConversionRequest, setShowConversionRequest] = useState<boolean>(false);
  const [conversionData, setConversionData] = useState<{ product: Product | null; newUnit: string; itemIndex: number }>({ product: null, newUnit: '', itemIndex: -1 });
  const [productSearchTerm, setProductSearchTerm] = useState<string>('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [activeItemIndex, setActiveItemIndex] = useState<number>(-1);

  // Cargar datos necesarios al montar el componente
  useEffect(() => {
    loadData();
  }, []);

  // Si hay un pedido, cargar sus datos
  useEffect(() => {
    if (order) {
      const fechaEntrega = order.fechaEntrega ? 
        (typeof order.fechaEntrega === 'string' ? new Date(order.fechaEntrega) : order.fechaEntrega) : 
        new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      setFormData({
        clienteId: order.clienteId || '',
        nombreCliente: order.nombreCliente || '',
        fechaEntrega,
        items: order.items?.map(item => ({
          ...item,
          productoId: item.productoId || '',
          nombreProducto: item.nombreProducto || '',
          cantidad: item.cantidad || 0,
          unidad: item.unidad || 'unidad',
          observaciones: item.observaciones || ''
        })) || [],
        observaciones: order.observaciones || '',
        estado: order.estado,
        total: order.total
      });
    }
  }, [order]);

  // Filtrar productos cuando cambia el término de búsqueda
  useEffect(() => {
    if (productSearchTerm.length > 2) {
      const filtered = products.filter(product => 
        product.nombre.toLowerCase().includes(productSearchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [productSearchTerm, products]);

  // Cargar clientes y productos
  async function loadData() {
    try {
      setDataLoading(true);
      const [clientsData, productsData] = await Promise.all([
        getAllClients(),
        getAllProducts()
      ]);
      setClients(clientsData);
      setProducts(productsData);
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar los datos necesarios. Por favor, intenta nuevamente.');
    } finally {
      setDataLoading(false);
    }
  }

  // Manejar cambios en el formulario principal
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'clienteId') {
      const selectedClient = clients.find(client => client.id === value);
      setFormData({
        ...formData,
        clienteId: value,
        nombreCliente: selectedClient ? selectedClient.nombre : ''
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Manejar cambio de fecha
  const handleDateChange = (date: Date) => {
    setFormData({ ...formData, fechaEntrega: date });
  };

  // Agregar ítem al pedido
  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          productoId: '',
          nombreProducto: '',
          cantidad: 1,
          unidad: 'unidad',
          observaciones: ''
        }
      ]
    });
  };

  // Eliminar ítem del pedido
  const removeItem = (index: number) => {
    const updatedItems = [...formData.items];
    updatedItems.splice(index, 1);
    setFormData({ ...formData, items: updatedItems });
  };

  // Manejar cambios en los ítems
  const handleItemChange = async (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updatedItems = [...formData.items];
    
    if (name === 'productoId') {
      try {
        // Si se selecciona un producto existente
        if (value) {
          const selectedProduct = products.find(product => product.id === value);
          if (selectedProduct) {
            // Verificar si la unidad actual es válida para este producto
            const currentUnit = updatedItems[index].unidad;
            
            if (currentUnit && currentUnit !== selectedProduct.unidadPredeterminada) {
              // Verificar si existe conversión para esta unidad
              try {
                // Intentar obtener la conversión
                convertUnits(selectedProduct, currentUnit, selectedProduct.unidadPredeterminada, 1);
                // Si no lanza error, la conversión existe
              } catch (err) {
                // No existe conversión, mostrar modal para solicitarla
                setConversionData({
                  product: selectedProduct,
                  newUnit: currentUnit,
                  itemIndex: index
                });
                setShowConversionRequest(true);
                return;
              }
            }
            
            updatedItems[index] = {
              ...updatedItems[index],
              productoId: value,
              nombreProducto: selectedProduct.nombre,
              unidad: currentUnit || selectedProduct.unidadPredeterminada
            };
          }
        }
      } catch (err) {
        console.error('Error al procesar cambio de producto:', err);
      }
    } else if (name === 'nombreProducto') {
      // Manejar búsqueda de producto por nombre
      setProductSearchTerm(value);
      setActiveItemIndex(index);
      
      updatedItems[index] = {
        ...updatedItems[index],
        nombreProducto: value,
        productoId: '' // Limpiar ID si se edita manualmente el nombre
      };
    } else if (name === 'unidad') {
      const productoId = updatedItems[index].productoId;
      
      if (productoId) {
        // Si ya hay un producto seleccionado, verificar si la unidad es válida
        try {
          const product = await getProductById(productoId);
          
          if (product) {
            try {
              // Verificar si existe conversión para esta unidad
              convertUnits(product, value, product.unidadPredeterminada, 1);
              // Si no lanza error, la conversión existe
            } catch (err) {
              // No existe conversión, mostrar modal para solicitarla
              setConversionData({
                product,
                newUnit: value,
                itemIndex: index
              });
              setShowConversionRequest(true);
              
              // Actualizar temporalmente la unidad en el formulario
              updatedItems[index] = {
                ...updatedItems[index],
                unidad: value
              };
              setFormData({ ...formData, items: updatedItems });
              return;
            }
          }
        } catch (err) {
          console.error('Error al verificar unidad:', err);
        }
      }
      
      updatedItems[index] = {
        ...updatedItems[index],
        unidad: value
      };
    } else if (name === 'cantidad') {
      updatedItems[index] = {
        ...updatedItems[index],
        cantidad: parseFloat(value) || 0
      };
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        [name]: value
      };
    }
    
    setFormData({ ...formData, items: updatedItems });
  };

  // Manejar selección de producto desde la búsqueda
  const handleProductSelect = (product: Product) => {
    if (activeItemIndex >= 0) {
      const updatedItems = [...formData.items];
      updatedItems[activeItemIndex] = {
        ...updatedItems[activeItemIndex],
        productoId: product.id!,
        nombreProducto: product.nombre,
        unidad: product.unidadPredeterminada
      };
      
      setFormData({ ...formData, items: updatedItems });
      setProductSearchTerm('');
      setFilteredProducts([]);
      setActiveItemIndex(-1);
    }
  };

  // Manejar creación de nuevo producto
  const handleCreateNewProduct = () => {
    if (activeItemIndex >= 0 && productSearchTerm) {
      setNewProductData({
        nombre: productSearchTerm,
        unidad: formData.items[activeItemIndex].unidad || 'unidad'
      });
      setShowProductCreation(true);
    }
  };

  // Manejar guardado de nuevo producto
  const handleProductCreated = async (productId: string) => {
    try {
      // Cargar el nuevo producto
      const newProduct = await getProductById(productId);
      
      if (newProduct && activeItemIndex >= 0) {
        // Actualizar la lista de productos
        setProducts([...products, newProduct]);
        
        // Actualizar el ítem del pedido
        const updatedItems = [...formData.items];
        updatedItems[activeItemIndex] = {
          ...updatedItems[activeItemIndex],
          productoId: newProduct.id!,
          nombreProducto: newProduct.nombre,
          unidad: newProduct.unidadPredeterminada
        };
        
        setFormData({ ...formData, items: updatedItems });
      }
      
      setShowProductCreation(false);
      setProductSearchTerm('');
      setActiveItemIndex(-1);
    } catch (err) {
      console.error('Error al procesar nuevo producto:', err);
    }
  };

  // Manejar guardado de conversión
  const handleConversionSaved = async () => {
    try {
      if (conversionData.itemIndex >= 0 && conversionData.product) {
        // Recargar el producto con las conversiones actualizadas
        const updatedProduct = await getProductById(conversionData.product.id!);
        
        if (updatedProduct) {
          // Actualizar la lista de productos
          setProducts(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
        }
      }
      
      setShowConversionRequest(false);
      setConversionData({ product: null, newUnit: '', itemIndex: -1 });
    } catch (err) {
      console.error('Error al actualizar después de guardar conversión:', err);
    }
  };

  // Guardar pedido
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar que haya al menos un ítem
    if (formData.items.length === 0) {
      setError('El pedido debe tener al menos un ítem.');
      return;
    }
    
    // Validar que todos los ítems tengan producto y cantidad
    const invalidItems = formData.items.filter(
      item => !item.productoId || item.cantidad <= 0
    );
    
    if (invalidItems.length > 0) {
      setError('Todos los ítems deben tener un producto y una cantidad mayor a 0.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Preparar datos para guardar
      const orderData = {
        ...formData,
        fechaEntrega: format(formData.fechaEntrega as Date, "yyyy-MM-dd'T'HH:mm:ss")
      };
      
      if (order?.id) {
        // Actualizar pedido existente
        await updateOrder(order.id, orderData);
      } else {
        // Crear nuevo pedido
        await createOrder(orderData);
      }
      
      setSuccess(true);
      setTimeout(() => {
        onSave();
      }, 1000);
    } catch (err) {
      console.error('Error al guardar pedido:', err);
      setError('Error al guardar el pedido. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {order ? 'Editar Pedido' : 'Nuevo Pedido'}
          </h3>
        </div>
        
        {dataLoading ? (
          <div className="px-6 py-4">
            <p className="text-center py-4">Cargando datos...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-4">
            {error && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            
            {success && (
              <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
                <span className="block sm:inline">
                  Pedido {order ? 'actualizado' : 'creado'} exitosamente.
                </span>
              </div>
            )}
            
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="clienteId">
                  Cliente *
                </label>
                <select
                  id="clienteId"
                  name="clienteId"
                  value={formData.clienteId}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                >
                  <option value="">Seleccionar cliente...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.nombre}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Fecha de Entrega *
                </label>
                <DatePicker
                  selected={formData.fechaEntrega as Date}
                  onChange={handleDateChange}
                  dateFormat="dd/MM/yyyy"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  locale={es}
                  minDate={new Date()}
                />
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-gray-700 text-sm font-bold">
                  Ítems del Pedido *
                </label>
                <button
                  type="button"
                  onClick={addItem}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm py-1 px-2 rounded flex items-center"
                >
                  <FaPlus className="mr-1" /> Agregar Ítem
                </button>
              </div>
              
              {formData.items.length === 0 ? (
                <p className="text-gray-500 text-sm italic mb-2">No hay ítems en el pedido.</p>
              ) : (
                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex items-start space-x-2 p-3 border border-gray-200 rounded">
                      <div className="flex-grow grid grid-cols-12 gap-2">
                        {/* Producto */}
                        <div className="col-span-5 relative">
                          <input
                            type="text"
                            name="nombreProducto"
                            value={item.nombreProducto}
                            onChange={(e) => handleItemChange(index, e)}
                            className="shadow appearance-none border rounded w-full py-2 px-2 text-gray-700 text-sm leading-tight focus:outline-none focus:shadow-outline"
                            placeholder="Buscar producto..."
                            required
                          />
                          
                          {/* Resultados de búsqueda */}
                          {activeItemIndex === index && filteredProducts.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md max-h-48 overflow-y-auto border border-gray-300">
                              {filteredProducts.map((product) => (
                                <div 
                                  key={product.id}
                                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                  onClick={() => handleProductSelect(product)}
                                >
                                  {product.nombre}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Opción para crear nuevo producto */}
                          {activeItemIndex === index && productSearchTerm.length > 2 && filteredProducts.length === 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md border border-gray-300">
                              <div 
                                className="px-3 py-2 hover:bg-green-50 cursor-pointer text-sm text-green-700 flex items-center"
                                onClick={handleCreateNewProduct}
                              >
                                <FaPlus className="mr-1" /> Crear "{productSearchTerm}"
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Cantidad */}
                        <div className="col-span-2">
                          <input
                            type="number"
                            name="cantidad"
                            value={item.cantidad}
                            onChange={(e) => handleItemChange(index, e)}
                            min="0.01"
                            step="0.01"
                            className="shadow appearance-none border rounded w-full py-2 px-2 text-gray-700 text-sm leading-tight focus:outline-none focus:shadow-outline"
                            required
                            placeholder="Cantidad"
                          />
                        </div>
                        
                        {/* Unidad */}
                        <div className="col-span-2">
                          <select
                            name="unidad"
                            value={item.unidad}
                            onChange={(e) => handleItemChange(index, e)}
                            className="shadow appearance-none border rounded w-full py-2 px-2 text-gray-700 text-sm leading-tight focus:outline-none focus:shadow-outline"
                          >
                            <option value="unidad">Unidad</option>
                            <option value="kg">Kilogramo</option>
                            <option value="cajon">Cajón</option>
                            <option value="bolsa">Bolsa</option>
                            <option value="bandeja">Bandeja</option>
                            <option value="atado">Atado</option>
                          </select>
                        </div>
                        
                        {/* Observaciones */}
                        <div className="col-span-3">
                          <input
                            type="text"
                            name="observaciones"
                            value={item.observaciones}
                            onChange={(e) => handleItemChange(index, e)}
                            className="shadow appearance-none border rounded w-full py-2 px-2 text-gray-700 text-sm leading-tight focus:outline-none focus:shadow-outline"
                            placeholder="Observaciones"
                          />
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800 pt-2"
                        title="Eliminar ítem"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="observaciones">
                Observaciones
              </label>
              <textarea
                id="observaciones"
                name="observaciones"
                value={formData.observaciones}
                onChange={handleChange}
                rows={3}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Observaciones adicionales para el pedido"
              ></textarea>
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
        )}
      </div>
      
      {/* Modal de creación rápida de productos */}
      {showProductCreation && (
        <QuickProductCreation
          productName={newProductData.nombre}
          initialUnit={newProductData.unidad}
          onSave={handleProductCreated}
          onCancel={() => setShowProductCreation(false)}
        />
      )}
      
      {/* Modal de solicitud de conversión */}
      {showConversionRequest && conversionData.product && (
        <UnitConversionRequest
          product={conversionData.product}
          newUnit={conversionData.newUnit}
          onSave={handleConversionSaved}
          onCancel={() => setShowConversionRequest(false)}
        />
      )}
    </div>
  );
}