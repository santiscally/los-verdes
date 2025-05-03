// src/services/receiptService.ts
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
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';

import { 
  getOrderById, 
  updateOrderStatus, 
  OrderItem,
  getOrdersByDeliveryDate,
  getOrdersByStatus
} from './orderService';

import { getClientById } from './clientService';
import { getProductById } from './productService';
import { db } from '@/app/firebase/config';

// Interfaces
export interface Receipt {
  id?: string;
  pedidoId: string;
  clienteId: string;
  nombreCliente: string;
  direccionCliente?: string;
  fechaEmision: string;
  fechaEntrega: string;
  fechaEntregaReal?: string;
  items: OrderItem[];
  total: number;
  estado: string;
  observaciones?: string;
  firmadoPor?: string;
  urlFirma?: string;
  createdAt?: any;
  updatedAt?: any;
}

// Constantes
const RECEIPTS_COLLECTION = 'remitos';

/**
 * Crear un nuevo remito a partir de un pedido
 * 
 * @param orderId - ID del pedido
 * @returns Remito creado con ID
 */
export async function createReceiptFromOrder(orderId: string): Promise<Receipt> {
  try {
    // Obtener datos del pedido
    const order = await getOrderById(orderId);
    if (!order) {
      throw new Error(`Pedido con ID ${orderId} no encontrado`);
    }
    
    // Verificar que el pedido no tenga ya un remito
    const q = query(
      collection(db, RECEIPTS_COLLECTION), 
      where("pedidoId", "==", orderId)
    );
    
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      throw new Error(`El pedido con ID ${orderId} ya tiene un remito generado`);
    }
    
    // Obtener datos del cliente
    const client = await getClientById(order.clienteId);
    if (!client) {
      throw new Error(`Cliente con ID ${order.clienteId} no encontrado`);
    }
    
    // Crear objeto del remito
    const remito = {
      pedidoId: orderId,
      clienteId: order.clienteId,
      nombreCliente: client.nombre,
      direccionCliente: client.direccion,
      fechaEmision: new Date().toISOString(),
      fechaEntrega: order.fechaEntrega,
      items: order.items,
      total: order.total,
      estado: 'generado',
      observaciones: order.observaciones || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Guardar en Firestore
    const docRef = await addDoc(collection(db, RECEIPTS_COLLECTION), remito);
    
    // Actualizar estado del pedido
    await updateOrderStatus(orderId, 'procesado');
    
    return { id: docRef.id, ...remito } as Receipt;
  } catch (error) {
    console.error("Error al crear remito:", error);
    throw error;
  }
}

/**
 * Obtener un remito por ID
 * 
 * @param receiptId - ID del remito
 * @returns Remito o null si no existe
 */
export async function getReceiptById(receiptId: string): Promise<Receipt | null> {
  try {
    const docRef = doc(db, RECEIPTS_COLLECTION, receiptId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Receipt;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error al obtener remito:", error);
    throw error;
  }
}

/**
 * Obtener remitos por pedido ID
 * 
 * @param orderId - ID del pedido
 * @returns Lista de remitos para ese pedido
 */
export async function getReceiptsByOrderId(orderId: string): Promise<Receipt[]> {
  try {
    const q = query(
      collection(db, RECEIPTS_COLLECTION), 
      where("pedidoId", "==", orderId)
    );
    
    const querySnapshot = await getDocs(q);
    const receipts: Receipt[] = [];
    
    querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      receipts.push({ id: doc.id, ...doc.data() } as Receipt);
    });
    
    return receipts;
  } catch (error) {
    console.error("Error al obtener remitos por ID de pedido:", error);
    throw error;
  }
}

/**
 * Obtener todos los remitos
 * 
 * @returns Lista de remitos
 */
export async function getAllReceipts(): Promise<Receipt[]> {
  try {
    const q = query(
      collection(db, RECEIPTS_COLLECTION), 
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    const receipts: Receipt[] = [];
    
    querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      receipts.push({ id: doc.id, ...doc.data() } as Receipt);
    });
    
    return receipts;
  } catch (error) {
    console.error("Error al obtener todos los remitos:", error);
    throw error;
  }
}

/**
 * Obtener remitos por cliente
 * 
 * @param clientId - ID del cliente
 * @returns Lista de remitos del cliente
 */
export async function getReceiptsByClient(clientId: string): Promise<Receipt[]> {
  try {
    const q = query(
      collection(db, RECEIPTS_COLLECTION), 
      where("clienteId", "==", clientId),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    const receipts: Receipt[] = [];
    
    querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      receipts.push({ id: doc.id, ...doc.data() } as Receipt);
    });
    
    return receipts;
  } catch (error) {
    console.error("Error al obtener remitos por cliente:", error);
    throw error;
  }
}

/**
 * Obtener remitos por fecha
 * 
 * @param date - Fecha de emisión
 * @returns Lista de remitos para esa fecha
 */
export async function getReceiptsByDate(date: string | Date): Promise<Receipt[]> {
  try {
    // Convertir fecha a formato timestamp si es necesario
    let startDate, endDate;
    
    if (typeof date === 'string') {
      // Si es string, asumimos formato ISO
      startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Si ya es un objeto Date
      startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
    }
    
    const q = query(
      collection(db, RECEIPTS_COLLECTION), 
      where("fechaEmision", ">=", startDate.toISOString()),
      where("fechaEmision", "<=", endDate.toISOString()),
      orderBy("fechaEmision", "asc")
    );
    
    const querySnapshot = await getDocs(q);
    const receipts: Receipt[] = [];
    
    querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      receipts.push({ id: doc.id, ...doc.data() } as Receipt);
    });
    
    return receipts;
  } catch (error) {
    console.error("Error al obtener remitos por fecha:", error);
    throw error;
  }
}

/**
 * Obtener remitos por estado
 * 
 * @param status - Estado del remito (generado, entregado, etc.)
 * @returns Lista de remitos con ese estado
 */
export async function getReceiptsByStatus(status: string): Promise<Receipt[]> {
  try {
    const q = query(
      collection(db, RECEIPTS_COLLECTION), 
      where("estado", "==", status),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    const receipts: Receipt[] = [];
    
    querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      receipts.push({ id: doc.id, ...doc.data() } as Receipt);
    });
    
    return receipts;
  } catch (error) {
    console.error("Error al obtener remitos por estado:", error);
    throw error;
  }
}

/**
 * Actualizar un remito
 * 
 * @param receiptId - ID del remito
 * @param receiptData - Datos a actualizar
 * @returns Remito actualizado
 */
export async function updateReceipt(
  receiptId: string, 
  receiptData: Partial<Receipt>
): Promise<Receipt> {
  try {
    const docRef = doc(db, RECEIPTS_COLLECTION, receiptId);
    
    // Verificar si el remito existe
    const receiptDoc = await getDoc(docRef);
    if (!receiptDoc.exists()) {
      throw new Error(`Remito con ID ${receiptId} no encontrado`);
    }
    
    // Actualizar datos del remito
    const updates = {
      ...receiptData,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(docRef, updates);
    return { id: receiptId, ...updates } as Receipt;
  } catch (error) {
    console.error("Error al actualizar remito:", error);
    throw error;
  }
}

/**
 * Actualizar estado de un remito
 * 
 * @param receiptId - ID del remito
 * @param newStatus - Nuevo estado
 * @returns Resultado de la operación
 */
export async function updateReceiptStatus(
  receiptId: string, 
  newStatus: string
): Promise<{id: string; estado: string}> {
  try {
    const docRef = doc(db, RECEIPTS_COLLECTION, receiptId);
    
    await updateDoc(docRef, {
      estado: newStatus,
      updatedAt: serverTimestamp()
    });
    
    return { id: receiptId, estado: newStatus };
  } catch (error) {
    console.error("Error al actualizar estado del remito:", error);
    throw error;
  }
}

/**
 * Marcar remito como entregado
 * 
 * @param receiptId - ID del remito
 * @param signedBy - Nombre de quien recibió
 * @param signatureUrl - URL de la firma (opcional)
 * @returns Remito actualizado
 */
export async function markReceiptAsDelivered(
  receiptId: string, 
  signedBy: string = '', 
  signatureUrl: string | null = null
): Promise<Receipt> {
  try {
    const docRef = doc(db, RECEIPTS_COLLECTION, receiptId);
    
    // Verificar si el remito existe
    const receiptDoc = await getDoc(docRef);
    if (!receiptDoc.exists()) {
      throw new Error(`Remito con ID ${receiptId} no encontrado`);
    }
    
    const receipt = receiptDoc.data();
    
    // Actualizar estado del remito
    const updates = {
      estado: 'entregado',
      fechaEntregaReal: new Date().toISOString(),
      firmadoPor: signedBy || '',
      urlFirma: signatureUrl || '',
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(docRef, updates);
    
    // Actualizar estado del pedido si es necesario
    if (receipt.pedidoId) {
      await updateOrderStatus(receipt.pedidoId, 'entregado');
    }
    
    return { id: receiptId, ...receipt, ...updates } as Receipt;
  } catch (error) {
    console.error("Error al marcar remito como entregado:", error);
    throw error;
  }
}

/**
 * Eliminar un remito
 * 
 * @param receiptId - ID del remito
 * @returns true si se elimina correctamente
 */
export async function deleteReceipt(receiptId: string): Promise<boolean> {
  try {
    // Obtener el remito para restaurar el estado del pedido
    const docRef = doc(db, RECEIPTS_COLLECTION, receiptId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const receipt = docSnap.data();
      
      // Actualizar estado del pedido si es necesario
      if (receipt.pedidoId) {
        await updateOrderStatus(receipt.pedidoId, 'pendiente');
      }
    }
    
    // Eliminar el documento
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error al eliminar remito:", error);
    throw error;
  }
}

/**
 * Generar remitos para todos los pedidos de una fecha
 * 
 * @param deliveryDate - Fecha de entrega
 * @returns Lista de remitos generados
 */
export async function generateReceiptsForDeliveryDate(
  deliveryDate: string | Date
): Promise<Receipt[]> {
  try {
    // Convertir fecha a formato timestamp si es necesario
    let queryDate;
    if (typeof deliveryDate === 'string') {
      queryDate = new Date(deliveryDate);
    } else {
      queryDate = new Date(deliveryDate);
    }
    
    const startDate = new Date(queryDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(queryDate);
    endDate.setHours(23, 59, 59, 999);
    
    // Consultar pedidos pendientes para esa fecha
    const q = query(
      collection(db, 'pedidos'), 
      where("fechaEntrega", ">=", startDate.toISOString()),
      where("fechaEntrega", "<=", endDate.toISOString()),
      where("estado", "==", "pendiente")
    );
    
    const querySnapshot = await getDocs(q);
    const generatedReceipts: Receipt[] = [];
    
    // Generar remitos para cada pedido
    const promises = [];
    querySnapshot.forEach((doc) => {
      promises.push(
        createReceiptFromOrder(doc.id)
          .then(receipt => generatedReceipts.push(receipt))
          .catch(error => console.error(`Error al generar remito para pedido ${doc.id}:`, error))
      );
    });
    
    await Promise.all(promises);
    
    return generatedReceipts;
  } catch (error) {
    console.error("Error al generar remitos para fecha de entrega:", error);
    throw error;
  }
}

/**
 * Generar remitos con precios actualizados según la última compra
 * 
 * @param deliveryDate - Fecha de entrega
 * @returns Lista de remitos generados
 */
export async function generateReceiptsWithUpdatedPrices(
  deliveryDate: string | Date
): Promise<Receipt[]> {
  try {
    // Obtener pedidos pendientes para esa fecha
    const orders = await getOrdersByStatus('pendiente');
    
    // Filtrar por fecha de entrega
    const startDate = new Date(deliveryDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(deliveryDate);
    endDate.setHours(23, 59, 59, 999);
    
    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.fechaEntrega);
      return orderDate >= startDate && orderDate <= endDate;
    });
    
    // Generar remitos con precios actualizados
    const generatedReceipts: Receipt[] = [];
    
    for (const order of filteredOrders) {
      try {
        // Generar remito con precios actualizados
        const receipt = await generateReceiptWithLatestPrices(order.id!);
        generatedReceipts.push(receipt);
      } catch (error) {
        console.error(`Error al generar remito para pedido ${order.id}:`, error);
      }
    }
    
    return generatedReceipts;
  } catch (error) {
    console.error("Error al generar remitos con precios actualizados:", error);
    throw error;
  }
}

/**
 * Genera un remito individual con precios actualizados según la última compra
 * 
 * @param orderId - ID del pedido
 * @returns Remito generado
 */
export async function generateReceiptWithLatestPrices(orderId: string): Promise<Receipt> {
  try {
    // Obtener datos del pedido
    const order = await getOrderById(orderId);
    if (!order) {
      throw new Error(`Pedido con ID ${orderId} no encontrado`);
    }
    
    // Verificar que el pedido no tenga ya un remito
    const existingReceipts = await getReceiptsByOrderId(orderId);
    if (existingReceipts.length > 0) {
      throw new Error(`El pedido con ID ${orderId} ya tiene un remito generado`);
    }
    
    // Obtener datos del cliente
    const client = await getClientById(order.clienteId);
    if (!client) {
      throw new Error(`Cliente con ID ${order.clienteId} no encontrado`);
    }
    
    // Actualizar precios de los items según la última compra
    const updatedItems = await Promise.all(order.items.map(async (item) => {
      const product = await getProductById(item.productoId);
      if (!product) {
        throw new Error(`Producto con ID ${item.productoId} no encontrado`);
      }
      
      // Obtener precio actual del producto
      const currentPrice = product.precio || 0;
      
      // Aplicar margen de ganancia
      const margin = product.margenGanancia || 1.3; // 30% por defecto
      const sellingPrice = currentPrice * margin;
      
      // Calcular precio total
      const totalPrice = sellingPrice * item.cantidad;
      
      return {
        ...item,
        precioUnitario: sellingPrice,
        precioTotal: totalPrice
      };
    }));
    
    // Calcular total del remito
    const total = updatedItems.reduce((sum, item) => sum + (item.precioTotal || 0), 0);
    
    // Crear objeto del remito
    const remito = {
      pedidoId: orderId,
      clienteId: order.clienteId,
      nombreCliente: client.nombre,
      direccionCliente: client.direccion,
      fechaEmision: new Date().toISOString(),
      fechaEntrega: order.fechaEntrega,
      items: updatedItems,
      total,
      estado: 'generado',
      observaciones: order.observaciones || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Guardar en Firestore
    const docRef = await addDoc(collection(db, RECEIPTS_COLLECTION), remito);
    
    // Actualizar estado del pedido
    await updateOrderStatus(orderId, 'procesado');
    
    return { id: docRef.id, ...remito } as Receipt;
  } catch (error) {
    console.error("Error al generar remito con precios actualizados:", error);
    throw error;
  }
}

/**
 * Regenera los precios de un remito existente según los precios actuales
 * 
 * @param receiptId - ID del remito
 * @returns Remito actualizado
 */
export async function updateReceiptPrices(receiptId: string): Promise<Receipt> {
  try {
    const receipt = await getReceiptById(receiptId);
    
    if (!receipt) {
      throw new Error(`Remito con ID ${receiptId} no encontrado`);
    }
    
    // Actualizar precios de los items según la última compra
    const updatedItems = await Promise.all(receipt.items.map(async (item) => {
      const product = await getProductById(item.productoId);
      if (!product) {
        throw new Error(`Producto con ID ${item.productoId} no encontrado`);
      }
      
      // Obtener precio actual del producto
      const currentPrice = product.precio || 0;
      
      // Aplicar margen de ganancia
      const margin = product.margenGanancia || 1.3; // 30% por defecto
      const sellingPrice = currentPrice * margin;
      
      // Calcular precio total
      const totalPrice = sellingPrice * item.cantidad;
      
      return {
        ...item,
        precioUnitario: sellingPrice,
        precioTotal: totalPrice
      };
    }));
    
    // Calcular total del remito
    const total = updatedItems.reduce((sum, item) => sum + (item.precioTotal || 0), 0);
    
    // Actualizar remito
    const updates = {
      items: updatedItems,
      total,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(doc(db, RECEIPTS_COLLECTION, receiptId), updates);
    
    return { ...receipt, ...updates };
  } catch (error) {
    console.error("Error al actualizar precios del remito:", error);
    throw error;
  }
}