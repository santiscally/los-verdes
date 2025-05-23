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
  getAvailableUnits,
  Product,
  updateProduct
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
  }[];
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
      
      // Asegurar que el producto tenga una unidad predeterminada
      if (!product.unidadPredeterminada) {
        console.warn(`Producto ${product.nombre} no tiene unidad predeterminada. Asignando '${item.unidad}' como predeterminada.`);
        product.unidadPredeterminada = item.unidad;
        try {
          await updateProduct(product.id!, { unidadPredeterminada: item.unidad });
        } catch (error) {
          console.error(`Error al actualizar unidad predeterminada para ${product.nombre}:`, error);
        }
      }
      
      // Obtener precio para esta unidad - SOLO PRECIOS DEFINIDOS MANUALMENTE
      let precioBase = null;
      
      // 1. Verificar si hay precio específico para esta unidad en product.precios
      if (product.precios && product.precios[item.unidad]) {
        precioBase = product.precios[item.unidad];
      }
      // 2. Si es la unidad predeterminada, usar el precio general del producto
      else if (item.unidad === product.unidadPredeterminada && product.precio) {
        precioBase = product.precio;
      }
      
      // Si no hay precio definido, usar precio temporal
      if (!precioBase) {
        console.warn(`No hay precio definido para ${product.nombre} en unidad ${item.unidad}. Asignando precio temporal.`);
        precioBase = 0; // Precio temporal para que la importación pueda continuar
      }
      
      // Calcular precio con margen de ganancia
      const precioVenta = precioBase * (product.margenGanancia || 1.1);
      
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
 * Agrupar pedidos para generar orden de compra consolidada
 * 
 * @param deliveryDate - Fecha de entrega
 * @returns Pedidos consolidados
 */
export async function generatePurchaseList(
  deliveryDate: string | Date
): Promise<ConsolidatedPurchaseList> {
  try {
    console.log(`Generando lista de compra para fecha: ${typeof deliveryDate === 'string' ? deliveryDate : deliveryDate.toISOString()}`);
    
    // Obtener pedidos para la fecha indicada
    const orders = await getOrdersByDeliveryDate(deliveryDate);
    console.log(`Encontrados ${orders.length} pedidos para la fecha seleccionada`);
    
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
            cantidadOptimaCompra: [], // Ahora es un array
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
    
    console.log(`Consolidados ${Object.keys(consolidatedItems).length} productos diferentes`);
    
    // Calcular la cantidad óptima de compra para cada producto
    const itemsArray = await Promise.all(
      Object.values(consolidatedItems).map(async (item) => {
        const product = await getProductById(item.productoId);
        
        if (!product) {
          return item;
        }
        
        console.log(`Calculando cantidades óptimas para ${item.nombreProducto}`);
        console.log(`Cantidades originales:`, item.cantidades);
        
        // Aplicar conversiones para optimizar (unidades pequeñas a grandes)
        const cantidadesOptimizadas = optimizarCantidades(product, item.cantidades);
        
        console.log(`Cantidades optimizadas:`, cantidadesOptimizadas);
        
        // Convertir el objeto de cantidades optimizadas a un array de { unidad, cantidad }
        const cantidadesCompra = Object.entries(cantidadesOptimizadas)
          .map(([unidad, cantidad]) => ({ unidad, cantidad }));
        
        console.log(`Cantidades de compra (array):`, cantidadesCompra);
        
        // Actualizar el item con las cantidades óptimas
        item.cantidadOptimaCompra = cantidadesCompra;
        
        return item;
      })
    );
    
    // Filtrar items con cantidad a comprar = 0
    const itemsToOrder = itemsArray.filter(item => 
      item.cantidadOptimaCompra && item.cantidadOptimaCompra.length > 0
    );
    
    console.log(`Items finales a comprar: ${itemsToOrder.length}`);
    
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
 * Optimiza las cantidades convirtiendo unidades menores a mayores según las conversiones disponibles
 * 
 * @param product - Producto con información de conversiones
 * @param cantidades - Cantidades en diferentes unidades
 * @returns Cantidades optimizadas
 */
function optimizarCantidades(
  product: Product, 
  cantidades: {[unidad: string]: number}
): {[unidad: string]: number} {
  const resultado = { ...cantidades };
  const conversiones = product.conversiones || {};
  
  // Para las unidades específicas que sabemos que deberían tener prioridad
  // (casos específicos como cajon > kg)
  if (resultado['kg'] && resultado['cajon']) {
    console.log("Procesando conversión de kg a cajon");
    // Verifica si tenemos la conversión necesaria
    if (conversiones['kg'] && conversiones['kg']['cajon']) {
      // Para 1 kg, cuántos cajones obtenemos
      const kgACajon = conversiones['kg']['cajon']; // Esto debería ser 0.1 (1kg = 0.1 cajon)
      
      // Cuántos cajones completos podemos obtener
      const cajonesCompletos = Math.floor(resultado['kg'] * kgACajon);
      
      if (cajonesCompletos > 0) {
        console.log(`Convirtiendo ${resultado['kg']} kg a cajones (${cajonesCompletos})`);
        
        // Actualizar cantidad de cajones
        resultado['cajon'] += cajonesCompletos;
        
        // Actualizar kg restantes
        const kgsConvertidos = cajonesCompletos / kgACajon; // Esto debería ser cajonesCompletos * 10
        resultado['kg'] -= kgsConvertidos;
        
        console.log(`Quedan ${resultado['kg']} kg y ahora hay ${resultado['cajon']} cajones`);
      }
    }
  }
  
  // Aplicar otras conversiones si es necesario
  // Este código se deja aquí para otros tipos de conversiones que puedan ser necesarias
  let cambioRealizado = true;
  const unidadesProcesadas = new Set<string>(); // Evitar procesar múltiples veces las mismas unidades
  
  // Seguir iterando mientras haya cambios
  while (cambioRealizado) {
    cambioRealizado = false;
    
    // Para cada par de unidades que no sean kg/cajon (ya procesados arriba)
    for (const [unidadMayor, conversionMap] of Object.entries(conversiones)) {
      for (const [unidadMenor, factorConversion] of Object.entries(conversionMap)) {
        // Evitar procesar kg/cajon de nuevo y solo procesar si no ha sido procesado
        if ((unidadMayor === 'cajon' && unidadMenor === 'kg') || 
            (unidadMayor === 'kg' && unidadMenor === 'cajon') ||
            unidadesProcesadas.has(`${unidadMayor}-${unidadMenor}`)) {
          continue;
        }
        
        // Marcar como procesado
        unidadesProcesadas.add(`${unidadMayor}-${unidadMenor}`);
        
        // Solo si tenemos la unidad menor en el resultado
        if (resultado[unidadMenor] && resultado[unidadMenor] > 0) {
          // Cantidad de unidades menores que se pueden convertir a mayores
          const cantidadConvertible = Math.floor(resultado[unidadMenor] / factorConversion);
          
          if (cantidadConvertible > 0) {
            console.log(`Convirtiendo ${resultado[unidadMenor]} ${unidadMenor} a ${unidadMayor}`);
            
            // Convertir unidades menores a mayores
            if (!resultado[unidadMayor]) resultado[unidadMayor] = 0;
            resultado[unidadMayor] += cantidadConvertible;
            resultado[unidadMenor] -= cantidadConvertible * factorConversion;
            
            // Eliminar la unidad si llega a cero o es muy cercano a cero
            if (Math.abs(resultado[unidadMenor]) < 0.001) {
              delete resultado[unidadMenor];
            }
            
            cambioRealizado = true;
          }
        }
      }
    }
  }
  
  // Eliminar cualquier cantidad muy cercana a cero (por errores de punto flotante)
  Object.keys(resultado).forEach(unidad => {
    if (Math.abs(resultado[unidad]) < 0.001) {
      delete resultado[unidad];
    }
  });
  
  return resultado;
}


/**
 * Determina las unidades óptimas para la compra
 * 
 * @param cantidades - Cantidades optimizadas por unidad
 * @returns Unidad y cantidad óptima para compra
 */
/**
 * Determina las unidades óptimas para la compra
 * 
 * @param cantidades - Cantidades optimizadas por unidad
 * @returns Unidad y cantidad óptima para compra
 */
function determinarUnidadesOptimas(cantidades: {[unidad: string]: number}): {unidad: string, cantidad: number} {
  console.log("Determinando unidades óptimas a partir de:", cantidades);
  
  // Si no hay cantidades, devolver un valor por defecto
  if (!cantidades || Object.keys(cantidades).length === 0) {
    console.warn("No hay cantidades para determinar unidades óptimas");
    return { unidad: "unidad", cantidad: 0 };
  }
  
  // Buscar la unidad con mayor cantidad (priorizando unidades mayores)
  let unidadOptima = "";
  let cantidadOptima = 0;
  
  // Orden de prioridad: cajon > kg > unidad (podría ampliarse según necesidades)
  const prioridades: {[unidad: string]: number} = {
    "cajon": 100,
    "kg": 50,
    "unidad": 10,
    // Añadir más unidades si es necesario
  };
  
  // Primera pasada: buscar la unidad con mayor prioridad que tenga cantidad > 0
  for (const [unidad, cantidad] of Object.entries(cantidades)) {
    const prioridad = prioridades[unidad] || 1; // Si no está en la lista, prioridad baja
    
    if (cantidad > 0 && (unidadOptima === "" || prioridad > (prioridades[unidadOptima] || 0))) {
      unidadOptima = unidad;
      cantidadOptima = cantidad;
    }
  }
  
  // Si no encontramos ninguna, tomar la primera con cantidad > 0
  if (unidadOptima === "") {
    for (const [unidad, cantidad] of Object.entries(cantidades)) {
      if (cantidad > 0) {
        unidadOptima = unidad;
        cantidadOptima = cantidad;
        break;
      }
    }
  }
  
  console.log(`Unidad óptima determinada: ${cantidadOptima} ${unidadOptima}`);
  return { unidad: unidadOptima, cantidad: cantidadOptima };
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


