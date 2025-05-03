// src/services/purchaseService.ts
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

import { getProductById, updateProductPrice, updateProductStock } from './productService';
import { ConsolidatedOrderItem } from './orderService';
import { db } from '@/app/firebase/config';

// Interfaces
export interface PurchaseItem {
  productoId: string;
  nombreProducto: string;
  cantidad: number;
  unidad: string;
  precio: number;
  precioTotal: number;
}

export interface Purchase {
  id?: string;
  fechaCompra: string;
  estado: string;
  items: PurchaseItem[];
  total: number;
  observaciones?: string;
  createdAt?: any;
  updatedAt?: any;
}

// Constantes
const PURCHASES_COLLECTION = 'compras';

/**
 * Crear una nueva compra
 * 
 * @param purchaseData - Datos de la compra
 * @returns Compra creada con ID
 */
export async function createPurchase(
  purchaseData: Omit<Purchase, 'id' | 'estado' | 'total' | 'items'> & { items: Omit<PurchaseItem, 'precioTotal'>[] }
): Promise<Purchase> {
  try {
    // Procesar los items de la compra
    const items = await Promise.all(purchaseData.items.map(async (item) => {
      // Obtener información del producto
      const product = await getProductById(item.productoId);
      if (!product) {
        throw new Error(`Producto con ID ${item.productoId} no encontrado`);
      }
      
      // Calcular precio total
      const precioTotal = item.precio * item.cantidad;
      
      // Actualizar precio del producto si ha cambiado
      if (product.precio !== item.precio) {
        await updateProductPrice(item.productoId, item.precio);
      }
      
      // Actualizar stock del producto
      await updateProductStock(item.productoId, {
        [item.unidad]: item.cantidad
      });
      
      return {
        ...item,
        precioTotal,
        nombreProducto: product.nombre
      };
    }));
    
    // Calcular total de la compra
    const total = items.reduce((sum, item) => sum + item.precioTotal, 0);
    
    // Crear objeto de la compra
    const compraCompleta = {
      ...purchaseData,
      items,
      total,
      estado: 'completada',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Guardar en Firestore
    const docRef = await addDoc(collection(db, PURCHASES_COLLECTION), compraCompleta);
    
    return { id: docRef.id, ...compraCompleta } as Purchase;
  } catch (error) {
    console.error("Error al crear compra:", error);
    throw error;
  }
}

/**
 * Obtener una compra por ID
 * 
 * @param purchaseId - ID de la compra
 * @returns Compra o null si no existe
 */
export async function getPurchaseById(purchaseId: string): Promise<Purchase | null> {
  try {
    const docRef = doc(db, PURCHASES_COLLECTION, purchaseId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Purchase;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error al obtener compra:", error);
    throw error;
  }
}

/**
 * Obtener todas las compras
 * 
 * @returns Lista de compras
 */
export async function getAllPurchases(): Promise<Purchase[]> {
  try {
    const q = query(
      collection(db, PURCHASES_COLLECTION), 
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    const purchases: Purchase[] = [];
    
    querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      purchases.push({ id: doc.id, ...doc.data() } as Purchase);
    });
    
    return purchases;
  } catch (error) {
    console.error("Error al obtener todas las compras:", error);
    throw error;
  }
}

/**
 * Obtener compras por fecha
 * 
 * @param date - Fecha de compra
 * @returns Lista de compras para esa fecha
 */
export async function getPurchasesByDate(date: string | Date): Promise<Purchase[]> {
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
      collection(db, PURCHASES_COLLECTION), 
      where("fechaCompra", ">=", startDate.toISOString()),
      where("fechaCompra", "<=", endDate.toISOString()),
      orderBy("fechaCompra", "asc")
    );
    
    const querySnapshot = await getDocs(q);
    const purchases: Purchase[] = [];
    
    querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      purchases.push({ id: doc.id, ...doc.data() } as Purchase);
    });
    
    return purchases;
  } catch (error) {
    console.error("Error al obtener compras por fecha:", error);
    throw error;
  }
}

/**
 * Actualizar una compra
 * 
 * @param purchaseId - ID de la compra
 * @param purchaseData - Datos a actualizar
 * @returns Compra actualizada
 */
export async function updatePurchase(
  purchaseId: string, 
  purchaseData: Partial<Purchase>
): Promise<Purchase> {
  try {
    const docRef = doc(db, PURCHASES_COLLECTION, purchaseId);
    
    // Verificar si la compra existe
    const purchaseDoc = await getDoc(docRef);
    if (!purchaseDoc.exists()) {
      throw new Error(`Compra con ID ${purchaseId} no encontrada`);
    }
    
    const originalPurchase = purchaseDoc.data();
    
    // Si hay cambios en los items, procesar cada uno
    if (purchaseData.items) {
      // Primero, revertir los cambios de stock de la compra original
      for (const originalItem of originalPurchase.items) {
        await updateProductStock(originalItem.productoId, {
          [originalItem.unidad]: -originalItem.cantidad
        });
      }
      
      // Luego, procesar los nuevos items
      const items = await Promise.all(purchaseData.items.map(async (item) => {
        // Obtener información del producto
        const product = await getProductById(item.productoId);
        if (!product) {
          throw new Error(`Producto con ID ${item.productoId} no encontrado`);
        }
        
        // Calcular precio total
        const precioTotal = item.precio * item.cantidad;
        
        // Actualizar precio del producto si ha cambiado
        if (product.precio !== item.precio) {
          await updateProductPrice(item.productoId, item.precio);
        }
        
        // Actualizar stock del producto
        await updateProductStock(item.productoId, {
          [item.unidad]: item.cantidad
        });
        
        return {
          ...item,
          precioTotal,
          nombreProducto: product.nombre
        };
      }));
      
      // Calcular total de la compra
      const total = items.reduce((sum, item) => sum + item.precioTotal, 0);
      
      // Actualizar datos de la compra
      const updates = {
        ...purchaseData,
        items,
        total,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(docRef, updates);
      return { id: purchaseId, ...updates } as Purchase;
    } else {
      // Si no hay cambios en los items, simplemente actualizar los datos proporcionados
      const updates = {
        ...purchaseData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(docRef, updates);
      return { id: purchaseId, ...updates } as Purchase;
    }
  } catch (error) {
    console.error("Error al actualizar compra:", error);
    throw error;
  }
}

/**
 * Eliminar una compra
 * 
 * @param purchaseId - ID de la compra
 * @returns true si se elimina correctamente
 */
export async function deletePurchase(purchaseId: string): Promise<boolean> {
  try {
    // Obtener la compra para revertir cambios de stock
    const docRef = doc(db, PURCHASES_COLLECTION, purchaseId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const purchase = docSnap.data();
      
      // Revertir cambios de stock
      for (const item of purchase.items) {
        await updateProductStock(item.productoId, {
          [item.unidad]: -item.cantidad
        });
      }
    }
    
    // Eliminar el documento
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error al eliminar compra:", error);
    throw error;
  }
}

/**
 * Generar una compra a partir de pedidos consolidados
 * 
 * @param consolidatedData - Datos consolidados de pedidos
 * @returns Compra generada
 */
export async function generatePurchaseFromConsolidatedOrders(
  consolidatedData: {
    fechaEntrega: string | Date;
    items: ConsolidatedOrderItem[];
    totalPedidos: number;
  }
): Promise<Purchase> {
  try {
    const items = await Promise.all(consolidatedData.items.map(async (item) => {
      // Obtener información del producto
      const product = await getProductById(item.productoId);
      if (!product) {
        throw new Error(`Producto con ID ${item.productoId} no encontrado`);
      }
      
      return {
        productoId: item.productoId,
        nombreProducto: item.nombreProducto || product.nombre,
        cantidad: item.cantidad,
        unidad: item.unidad,
        precio: product.precio || 0,
        precioTotal: (product.precio || 0) * item.cantidad
      };
    }));
    
    // Calcular total de la compra
    const total = items.reduce((sum, item) => sum + item.precioTotal, 0);
    
    // Crear objeto de la compra
    const compra = {
      fechaCompra: new Date().toISOString(),
      items,
      total,
      estado: 'pendiente',
      observaciones: `Generado a partir de pedidos para entrega del ${
        typeof consolidatedData.fechaEntrega === 'string' 
          ? consolidatedData.fechaEntrega 
          : consolidatedData.fechaEntrega.toISOString().split('T')[0]
      }`,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Guardar en Firestore
    const docRef = await addDoc(collection(db, PURCHASES_COLLECTION), compra);
    
    return { id: docRef.id, ...compra } as Purchase;
  } catch (error) {
    console.error("Error al generar compra desde pedidos consolidados:", error);
    throw error;
  }
}

/**
 * Actualizar el estado de una compra
 * 
 * @param purchaseId - ID de la compra
 * @param newStatus - Nuevo estado
 * @returns Compra actualizada
 */
export async function updatePurchaseStatus(
  purchaseId: string, 
  newStatus: string
): Promise<Purchase> {
  try {
    const docRef = doc(db, PURCHASES_COLLECTION, purchaseId);
    
    // Verificar si la compra existe
    const purchaseDoc = await getDoc(docRef);
    if (!purchaseDoc.exists()) {
      throw new Error(`Compra con ID ${purchaseId} no encontrada`);
    }
    
    const purchase = purchaseDoc.data();
    
    // Si la compra pasa de pendiente a completada, actualizar el stock
    if (purchase.estado === 'pendiente' && newStatus === 'completada') {
      // Actualizar stock para cada ítem
      for (const item of purchase.items) {
        await updateProductStock(
          item.productoId, 
          { [item.unidad]: item.cantidad }
        );
      }
    }
    
    // Actualizar estado de la compra
    const updates = {
      estado: newStatus,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(docRef, updates);
    
    return { 
      id: purchaseId, 
      ...purchase,
      ...updates 
    } as Purchase;
  } catch (error) {
    console.error("Error al actualizar estado de compra:", error);
    throw error;
  }
}

/**
 * Actualiza los precios de una compra y actualiza el stock
 * 
 * @param purchaseId - ID de la compra
 * @param updatedItems - Lista de items con precios actualizados
 * @returns Compra actualizada
 */
export async function updatePurchasePrices(
  purchaseId: string,
  updatedItems: PurchaseItem[]
): Promise<Purchase> {
  try {
    const docRef = doc(db, PURCHASES_COLLECTION, purchaseId);
    
    // Verificar si la compra existe
    const purchaseDoc = await getDoc(docRef);
    if (!purchaseDoc.exists()) {
      throw new Error(`Compra con ID ${purchaseId} no encontrada`);
    }
    
    const purchase = purchaseDoc.data();
    
    // Actualizar precios de productos
    for (const item of updatedItems) {
      // Solo actualizar si el precio cambió
      const originalItem = purchase.items.find((i: PurchaseItem) => i.productoId === item.productoId);
      if (originalItem && originalItem.precio !== item.precio) {
        await updateProductPrice(item.productoId, item.precio);
      }
    }
    
    // Calcular nuevo total
    const total = updatedItems.reduce((sum, item) => sum + item.precioTotal, 0);
    
    // Actualizar la compra
    const updates = {
      items: updatedItems,
      total,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(docRef, updates);
    
    // Si la compra estaba en estado pendiente, actualizarla a completada y actualizar stock
    if (purchase.estado === 'pendiente') {
      await updatePurchaseStatus(purchaseId, 'completada');
    }
    
    return { 
      id: purchaseId, 
      ...purchase, 
      ...updates,
      estado: 'completada'
    } as Purchase;
  } catch (error) {
    console.error("Error al actualizar precios de compra:", error);
    throw error;
  }
}