// src/services/orderService.ts
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
  QuerySnapshot,
  limit,
  startAfter
} from 'firebase/firestore';

import { getClientById, addOrderToClientHistory, Client } from './clientService';
import { db } from '@/app/firebase/config';
import { 
  getProductById, 
  convertUnits,
  getAvailableUnits
} from './productService';

// Interfaces
export interface OrderItem {
  productoId: string;
  nombreProducto: string;
  cantidad: number;
  unidad: string;
  precioUnitario?: number;
  precioTotal?: number;
  observaciones?: string;
}

export interface Order {
  id?: string;
  clienteId: string;
  nombreCliente: string;
  fechaEntrega: string;
  fechaCreacion?: string;
  items: OrderItem[];
  estado: string;
  total: number;
  observaciones?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface ConsolidatedOrderItem {
  productoId: string;
  nombreProducto: string;
  cantidad: number;
  unidad: string;
  pedidos: {
    pedidoId: string;
    clienteId: string;
    nombreCliente: string;
    cantidad: number;
  }[];
  defaultUnit?: string;
  lastPurchasePrice?: number;
}

export interface ConsolidatedOrder {
  fechaEntrega: string | Date;
  items: ConsolidatedOrderItem[];
  totalPedidos: number;
}

export interface PaginatedOrders {
  orders: Order[];
  lastVisible: any;
}

export interface ConsolidatedPurchaseItem {
  productoId: string;
  nombreProducto: string;
  cantidades: {[unidad: string]: number};
  cantidadOptimaCompra: {
    unidad: string;
    cantidad: number;
  };
  pedidos: {
    pedidoId: string;
    clienteId: string;
    nombreCliente: string;
    cantidad: number;
    unidad: string;
  }[];
}

export interface ConsolidatedPurchaseList {
  fechaEntrega: string | Date;
  items: ConsolidatedPurchaseItem[];
  totalPedidos: number;
}

// Constantes
const ORDERS_COLLECTION = 'pedidos';

/**
 * Crear un nuevo pedido
 * 
 * @param orderData - Datos del pedido
 * @returns Pedido creado con ID
 */
export async function createOrder(orderData: Omit<Order, 'id' | 'estado' | 'total'>): Promise<Order> {
  try {
    // Validar que el cliente exista
    const client = await getClientById(orderData.clienteId);
    if (!client) {
      throw new Error(`Cliente con ID ${orderData.clienteId} no encontrado`);
    }
    
    // Procesar productos en el pedido
    const items = await Promise.all(orderData.items.map(async (item) => {
      // Obtener información del producto
      const product = await getProductById(item.productoId);
      if (!product) {
        throw new Error(`Producto con ID ${item.productoId} no encontrado`);
      }
      
      // Calcular precio con margen de ganancia
      const precioVenta = (product.precio || 0) * (product.margenGanancia || 1.1);
      
      // Calcular precio total
      const precioTotal = precioVenta * item.cantidad;
      
      return {
        ...item,
        precioUnitario: precioVenta,
        precioTotal: precioTotal,
        nombreProducto: product.nombre
      };
    }));
    
    // Calcular total del pedido
    const total = items.reduce((sum, item) => sum + (item.precioTotal || 0), 0);
    
    // Crear objeto del pedido
    const pedidoCompleto = {
      ...orderData,
      items,
      total,
      estado: 'pendiente',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Guardar en Firestore
    const docRef = await addDoc(collection(db, ORDERS_COLLECTION), pedidoCompleto);
    
    // Agregar el pedido al historial del cliente
    await addOrderToClientHistory(orderData.clienteId, docRef.id);
    
    return { id: docRef.id, ...pedidoCompleto } as Order;
  } catch (error) {
    console.error("Error al crear pedido:", error);
    throw error;
  }
}

/**
 * Obtener un pedido por ID
 * 
 * @param orderId - ID del pedido
 * @returns Pedido o null si no existe
 */
export async function getOrderById(orderId: string): Promise<Order | null> {
  try {
    const docRef = doc(db, ORDERS_COLLECTION, orderId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Order;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error al obtener pedido:", error);
    throw error;
  }
}

/**
 * Obtener todos los pedidos
 * 
 * @param limitNumber - Límite de pedidos a obtener
 * @returns Lista de pedidos
 */
export async function getAllOrders(limitNumber: number = 50): Promise<Order[]> {
  try {
    const q = query(
      collection(db, ORDERS_COLLECTION), 
      orderBy("createdAt", "desc"),
      limit(limitNumber)
    );
    
    const querySnapshot = await getDocs(q);
    const orders: Order[] = [];
    
    querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      orders.push({ id: doc.id, ...doc.data() } as Order);
    });
    
    return orders;
  } catch (error) {
    console.error("Error al obtener todos los pedidos:", error);
    throw error;
  }
}

/**
 * Obtener pedidos paginados
 * 
 * @param lastDoc - Último documento para paginación
 * @param limitNumber - Límite de pedidos a obtener
 * @returns Pedidos paginados y último documento visible
 */
export async function getPaginatedOrders(
  lastDoc: any, 
  limitNumber: number = 50
): Promise<PaginatedOrders> {
  try {
    let q;
    
    if (lastDoc) {
      q = query(
        collection(db, ORDERS_COLLECTION), 
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(limitNumber)
      );
    } else {
      q = query(
        collection(db, ORDERS_COLLECTION), 
        orderBy("createdAt", "desc"),
        limit(limitNumber)
      );
    }
    
    const querySnapshot = await getDocs(q);
    const orders: Order[] = [];
    
    querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      orders.push({ id: doc.id, ...doc.data() } as Order);
    });
    
    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
    
    return {
      orders,
      lastVisible
    };
  } catch (error) {
    console.error("Error al obtener pedidos paginados:", error);
    throw error;
  }
}

/**
 * Obtener pedidos por cliente
 * 
 * @param clientId - ID del cliente
 * @returns Lista de pedidos del cliente
 */
export async function getOrdersByClient(clientId: string): Promise<Order[]> {
  try {
    const q = query(
      collection(db, ORDERS_COLLECTION), 
      where("clienteId", "==", clientId),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    const orders: Order[] = [];
    
    querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      orders.push({ id: doc.id, ...doc.data() } as Order);
    });
    
    return orders;
  } catch (error) {
    console.error("Error al obtener pedidos por cliente:", error);
    throw error;
  }
}

/**
 * Obtener pedidos por fecha de entrega
 * 
 * @param date - Fecha de entrega
 * @returns Lista de pedidos para esa fecha
 */
export async function getOrdersByDeliveryDate(date: string | Date): Promise<Order[]> {
  try {
    // Convertir fecha a formato timestamp
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const q = query(
      collection(db, ORDERS_COLLECTION), 
      where("fechaEntrega", ">=", startOfDay.toISOString()),
      where("fechaEntrega", "<=", endOfDay.toISOString()),
      orderBy("fechaEntrega", "asc")
    );
    
    const querySnapshot = await getDocs(q);
    const orders: Order[] = [];
    
    querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      orders.push({ id: doc.id, ...doc.data() } as Order);
    });
    
    return orders;
  } catch (error) {
    console.error("Error al obtener pedidos por fecha de entrega:", error);
    throw error;
  }
}

/**
 * Obtener pedidos por estado
 * 
 * @param status - Estado del pedido
 * @returns Lista de pedidos con ese estado
 */
export async function getOrdersByStatus(status: string): Promise<Order[]> {
  try {
    const q = query(
      collection(db, ORDERS_COLLECTION), 
      where("estado", "==", status),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    const orders: Order[] = [];
    
    querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      orders.push({ id: doc.id, ...doc.data() } as Order);
    });
    
    return orders;
  } catch (error) {
    console.error("Error al obtener pedidos por estado:", error);
    throw error;
  }
}

/**
 * Actualizar un pedido
 * 
 * @param orderId - ID del pedido
 * @param orderData - Datos a actualizar
 * @returns Pedido actualizado
 */
export async function updateOrder(orderId: string, orderData: Partial<Order>): Promise<Order> {
  try {
    const docRef = doc(db, ORDERS_COLLECTION, orderId);
    
    // Verificar si el pedido existe
    const orderDoc = await getDoc(docRef);
    if (!orderDoc.exists()) {
      throw new Error(`Pedido con ID ${orderId} no encontrado`);
    }
    
    // Si hay cambios en los items, recalcular precios
    if (orderData.items) {
      const clientRef = doc(db, 'clientes', orderData.clienteId || orderDoc.data().clienteId);
      const clientDoc = await getDoc(clientRef);
      
      if (!clientDoc.exists()) {
        throw new Error(`Cliente no encontrado`);
      }
      
      // Procesar los items del pedido para recalcular precios
      const items = await Promise.all(orderData.items.map(async (item) => {
        // Obtener información del producto
        const product = await getProductById(item.productoId);
        if (!product) {
          throw new Error(`Producto con ID ${item.productoId} no encontrado`);
        }
        
        // Calcular precio con margen de ganancia
        const precioVenta = (product.precio || 0) * (product.margenGanancia || 1.1);
        
        // Calcular precio total
        const precioTotal = precioVenta * item.cantidad;
        
        return {
          ...item,
          precioUnitario: precioVenta,
          precioTotal: precioTotal,
          nombreProducto: product.nombre
        };
      }));
      
      // Calcular total del pedido
      const total = items.reduce((sum, item) => sum + (item.precioTotal || 0), 0);
      
      // Actualizar datos del pedido
      const updates = {
        ...orderData,
        items,
        total,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(docRef, updates);
      return { id: orderId, ...updates } as Order;
    } else {
      // Si no hay cambios en los items, simplemente actualizar los datos proporcionados
      const updates = {
        ...orderData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(docRef, updates);
      return { id: orderId, ...updates } as Order;
    }
  } catch (error) {
    console.error("Error al actualizar pedido:", error);
    throw error;
  }
}

/**
 * Actualizar estado de un pedido
 * 
 * @param orderId - ID del pedido
 * @param newStatus - Nuevo estado
 * @returns Resultado de la operación
 */
export async function updateOrderStatus(
  orderId: string, 
  newStatus: string
): Promise<{id: string; status: string}> {
  try {
    const docRef = doc(db, ORDERS_COLLECTION, orderId);
    
    await updateDoc(docRef, {
      estado: newStatus,
      updatedAt: serverTimestamp()
    });
    
    return { id: orderId, status: newStatus };
  } catch (error) {
    console.error("Error al actualizar estado del pedido:", error);
    throw error;
  }
}

/**
 * Eliminar un pedido
 * 
 * @param orderId - ID del pedido
 * @returns true si se elimina correctamente
 */
export async function deleteOrder(orderId: string): Promise<boolean> {
  try {
    // Obtener datos del pedido para actualizar el historial del cliente
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    const orderDoc = await getDoc(orderRef);
    
    if (orderDoc.exists()) {
      const orderData = orderDoc.data();
      
      // Actualizar historial de pedidos del cliente
      const clientRef = doc(db, 'clientes', orderData.clienteId);
      const clientDoc = await getDoc(clientRef);
      
      if (clientDoc.exists()) {
        const clientOrderHistory = clientDoc.data().historialPedidos || [];
        const updatedHistory = clientOrderHistory.filter(
          (item: {pedidoId: string, fecha: string}) => item.pedidoId !== orderId
        );
        
        await updateDoc(clientRef, {
          historialPedidos: updatedHistory,
          updatedAt: serverTimestamp()
        });
      }
    }
    
    // Eliminar el pedido
    await deleteDoc(orderRef);
    return true;
  } catch (error) {
    console.error("Error al eliminar pedido:", error);
    throw error;
  }
}

/**
 * Agrupar pedidos para generar orden de compra consolidada
 * 
 * @param deliveryDate - Fecha de entrega
 * @returns Pedidos consolidados
 */
export async function consolidateOrdersForPurchase(
  deliveryDate: string | Date
): Promise<ConsolidatedOrder> {
  try {
    // Obtener pedidos para la fecha de entrega especificada
    const orders = await getOrdersByDeliveryDate(deliveryDate);
    
    // Agrupar productos de todos los pedidos
    const consolidatedItems: {[key: string]: ConsolidatedOrderItem} = {};
    
    for (const order of orders) {
      for (const item of order.items) {
        const key = `${item.productoId}-${item.unidad}`;
        
        if (!consolidatedItems[key]) {
          consolidatedItems[key] = {
            productoId: item.productoId,
            nombreProducto: item.nombreProducto,
            cantidad: 0,
            unidad: item.unidad,
            pedidos: []
          };
        }
        
        consolidatedItems[key].cantidad += item.cantidad;
        consolidatedItems[key].pedidos.push({
          pedidoId: order.id || '',
          clienteId: order.clienteId,
          nombreCliente: order.nombreCliente,
          cantidad: item.cantidad
        });
      }
    }
    
    // Convertir a array
    const consolidatedItemsArray = Object.values(consolidatedItems);
    
    // Enriquecer con información de productos
    const enrichedItems = await Promise.all(
      consolidatedItemsArray.map(async (item) => {
        const product = await getProductById(item.productoId);
        return {
          ...item,
          nombreProducto: product ? product.nombre : 'Desconocido',
          defaultUnit: product ? product.unidadPredeterminada : 'unidad',
          lastPurchasePrice: product ? product.precio : 0
        };
      })
    );
    
    return {
      fechaEntrega: deliveryDate,
      items: enrichedItems,
      totalPedidos: orders.length
    };
  } catch (error) {
    console.error("Error al consolidar pedidos para compra:", error);
    throw error;
  }
}

/**
 * Agrupa y consolida productos de múltiples pedidos para generar una lista de compra
 * 
 * @param deliveryDate - Fecha de entrega para filtrar pedidos
 * @returns Lista consolidada para compra
 */
export async function generatePurchaseList(
  deliveryDate: string | Date
): Promise<ConsolidatedPurchaseList> {
  try {
    // Obtener pedidos para la fecha indicada
    const orders = await getOrdersByDeliveryDate(deliveryDate);
    
    // Mapa para agrupar items por producto
    const consolidatedItems: {[key: string]: ConsolidatedPurchaseItem} = {};
    
    // Procesar cada pedido
    for (const order of orders) {
      for (const item of order.items) {
        const product = await getProductById(item.productoId);
        
        if (!product) {
          console.error(`Producto ${item.productoId} no encontrado`);
          continue;
        }
        
        const key = item.productoId;
        
        if (!consolidatedItems[key]) {
          consolidatedItems[key] = {
            productoId: item.productoId,
            nombreProducto: item.nombreProducto,
            cantidades: {},
            cantidadOptimaCompra: {
              unidad: product.unidadPredeterminada,
              cantidad: 0
            },
            pedidos: []
          };
        }
        
        // Agregar cantidad en la unidad solicitada
        if (!consolidatedItems[key].cantidades[item.unidad]) {
          consolidatedItems[key].cantidades[item.unidad] = 0;
        }
        
        consolidatedItems[key].cantidades[item.unidad] += item.cantidad;
        
        // Registrar el pedido individual
        consolidatedItems[key].pedidos.push({
          pedidoId: order.id!,
          clienteId: order.clienteId,
          nombreCliente: order.nombreCliente,
          cantidad: item.cantidad,
          unidad: item.unidad
        });
      }
    }
    
    // Calcular la cantidad óptima de compra para cada producto
    const itemsArray = await Promise.all(
      Object.values(consolidatedItems).map(async (item) => {
        const product = await getProductById(item.productoId);
        
        if (!product) {
          return item;
        }
        
        // Convertir todas las cantidades a la unidad predeterminada
        let totalInDefaultUnit = 0;
        
        for (const [unit, quantity] of Object.entries(item.cantidades)) {
          try {
            if (unit === product.unidadPredeterminada) {
              totalInDefaultUnit += quantity;
            } else {
              // Intentar convertir a la unidad predeterminada
              try {
                const convertedQty = convertUnits(
                  product, 
                  unit, 
                  product.unidadPredeterminada, 
                  quantity
                );
                totalInDefaultUnit += convertedQty;
              } catch (error) {
                console.error(`Error al convertir de ${unit} a ${product.unidadPredeterminada}:`, error);
                // Si falla la conversión, mantener la cantidad en la unidad original
                if (!item.cantidadOptimaCompra.unidad) {
                  item.cantidadOptimaCompra.unidad = unit;
                  item.cantidadOptimaCompra.cantidad = quantity;
                } else {
                  // Si ya hay una unidad asignada, mantener la más grande
                  if (quantity > item.cantidadOptimaCompra.cantidad) {
                    item.cantidadOptimaCompra.unidad = unit;
                    item.cantidadOptimaCompra.cantidad = quantity;
                  }
                }
              }
            }
          } catch (error) {
            console.error(`Error al procesar cantidades:`, error);
          }
        }
        
        // Verificar stock existente
        const currentStock = product.stock && product.stock[product.unidadPredeterminada] 
          ? product.stock[product.unidadPredeterminada] 
          : 0;
        
        // Restar stock existente de la cantidad requerida
        const requiredQuantity = Math.max(0, totalInDefaultUnit - currentStock);
        
        // Redondear hacia arriba para unidades enteras como cajones o bolsas
        if (['cajon', 'bolsa', 'bandeja', 'atado', 'riestra'].includes(product.unidadPredeterminada)) {
          const roundedQuantity = Math.ceil(requiredQuantity);
          item.cantidadOptimaCompra = {
            unidad: product.unidadPredeterminada,
            cantidad: roundedQuantity
          };
        } else {
          // Para unidades continuas como kg, no es necesario redondear
          item.cantidadOptimaCompra = {
            unidad: product.unidadPredeterminada,
            cantidad: requiredQuantity
          };
        }
        
        return item;
      })
    );
    
    // Filtrar items con cantidad a comprar = 0
    const itemsToOrder = itemsArray.filter(item => item.cantidadOptimaCompra.cantidad > 0);
    
    return {
      fechaEntrega: deliveryDate,
      items: itemsToOrder,
      totalPedidos: orders.length
    };
  } catch (error) {
    console.error("Error al generar lista de compra:", error);
    throw error;
  }
}

/**
 * Obtiene el stock necesario para cubrir los pedidos de una fecha
 * teniendo en cuenta el stock actual
 * 
 * @param deliveryDate - Fecha de entrega
 * @returns Lista de productos a comprar con cantidades necesarias
 */
export async function calculateRequiredStock(
  deliveryDate: string | Date
): Promise<ConsolidatedPurchaseList> {
  try {
    // Obtener la lista de compra consolidada
    const purchaseList = await generatePurchaseList(deliveryDate);
    
    // Verificar stock actual para cada producto
    const requiredItems = await Promise.all(
      purchaseList.items.map(async (item) => {
        const product = await getProductById(item.productoId);
        
        if (!product || !product.stock) {
          return item; // Si no hay stock, se requiere comprar toda la cantidad
        }
        
        // Verificar si hay stock en la unidad de compra
        const currentStock = product.stock[item.cantidadOptimaCompra.unidad] || 0;
        let requiredQuantity = item.cantidadOptimaCompra.cantidad - currentStock;
        
        // Si el stock es suficiente, no se necesita comprar
        if (requiredQuantity <= 0) {
          requiredQuantity = 0;
        }
        
        // Actualizar la cantidad óptima de compra
        return {
          ...item,
          cantidadOptimaCompra: {
            unidad: item.cantidadOptimaCompra.unidad,
            cantidad: requiredQuantity
          }
        };
      })
    );
    
    // Filtrar solo los productos que necesitan compra
    const filteredItems = requiredItems.filter(item => item.cantidadOptimaCompra.cantidad > 0);
    
    return {
      fechaEntrega: deliveryDate,
      items: filteredItems,
      totalPedidos: purchaseList.totalPedidos
    };
  } catch (error) {
    console.error("Error al calcular stock requerido:", error);
    throw error;
  }
}


