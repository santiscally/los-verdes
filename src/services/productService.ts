// src/services/productService.ts
import { db } from '@/app/firebase/config';
import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
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


// Interfaces
export interface UnitConversion {
  [key: string]: number;
}

export interface Conversiones {
  [key: string]: UnitConversion;
}

export interface Product {
  id?: string;
  nombre: string;
  unidadPredeterminada: string;
  precios?: {
    [unidad: string]: number;
  };
  precio?: number; // Mantener para compatibilidad
  margenGanancia?: number; // Global como solicitado
  stock?: {
    [key: string]: number;
  };
  conversiones: Conversiones;
  createdAt?: any;
  updatedAt?: any;
}

// Constantes
const PRODUCTS_COLLECTION = 'productos';

/**
 * Crear un nuevo producto
 * 
 * @param productData - Datos del producto
 * @returns Producto creado con ID
 */
export async function createProduct(productData: Omit<Product, 'id'>): Promise<Product> {
  try {
    // Redondear el margen de ganancia a 1 decimal si existe
    const margenGanancia = productData.margenGanancia 
      ? Math.round(productData.margenGanancia * 10) / 10 
      : 1.1;
    
    // Asegurar que siempre haya una unidad predeterminada
    const unidadPredeterminada = productData.unidadPredeterminada || 'unidad';
    
    // Construir objeto sin campos undefined
    const productWithDefaults: any = {
      nombre: productData.nombre,
      unidadPredeterminada,
      margenGanancia,
      conversiones: productData.conversiones || {},
      precios: productData.precios || {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    // Solo agregar precio si tiene valor
    if (productData.precio !== undefined) {
      productWithDefaults.precio = productData.precio;
    }
    
    const docRef = await addDoc(collection(db, PRODUCTS_COLLECTION), productWithDefaults);
    return { id: docRef.id, ...productWithDefaults };
  } catch (error) {
    console.error("Error al crear producto:", error);
    throw error;
  }
}

/**
 * Crear producto con ID personalizado
 * 
 * @param id - ID personalizado
 * @param productData - Datos del producto
 * @returns Producto creado
 */
export async function createProductWithId(
  id: string, 
  productData: Omit<Product, 'id'>
): Promise<Product> {
  try {
    // Agregar campos de metadatos
    const productWithMeta = {
      ...productData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    // Crear un nuevo documento con ID específico
    await setDoc(doc(db, PRODUCTS_COLLECTION, id), productWithMeta);
    return { id, ...productWithMeta };
  } catch (error) {
    console.error("Error al crear producto con ID:", error);
    throw error;
  }
}

/**
 * Obtener un producto por ID
 * 
 * @param productId - ID del producto
 * @returns Producto o null si no existe
 */
export async function getProductById(productId: string): Promise<Product | null> {
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, productId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Product;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error al obtener producto:", error);
    throw error;
  }
}

/**
 * Obtener todos los productos
 * 
 * @returns Lista de productos
 */
export async function getAllProducts(): Promise<Product[]> {
  try {
    const q = query(collection(db, PRODUCTS_COLLECTION), orderBy("nombre"));
    const querySnapshot = await getDocs(q);
    const products: Product[] = [];
    
    querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      products.push({ id: doc.id, ...doc.data() } as Product);
    });
    
    return products;
  } catch (error) {
    console.error("Error al obtener todos los productos:", error);
    throw error;
  }
}

/**
 * Actualizar un producto
 * 
 * @param productId - ID del producto
 * @param productData - Datos a actualizar
 * @returns Producto actualizado
 */
export async function updateProduct(
  productId: string, 
  productData: Partial<Product>
): Promise<Product> {
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, productId);
    
    // Si se proporciona margenGanancia, redondearlo a 1 decimal
    let updates = { ...productData };
    if (updates.margenGanancia !== undefined) {
      updates.margenGanancia = Math.round(updates.margenGanancia * 10) / 10;
    }
    
    // Agregar timestamp de actualización
    updates = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(docRef, updates);
    return { id: productId, ...updates } as Product;
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    throw error;
  }
}

/**
 * Eliminar un producto
 * 
 * @param productId - ID del producto
 * @returns true si se elimina correctamente
 */
export async function deleteProduct(productId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, PRODUCTS_COLLECTION, productId));
    return true;
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    throw error;
  }
}

/**
 * Actualizar el stock de un producto
 * 
 * @param productId - ID del producto
 * @param stockUpdates - Actualizaciones de stock por unidad
 * @returns Resultado de la operación
 */
export async function updateProductStock(
  productId: string, 
  stockUpdates: {[key: string]: number}
): Promise<{id: string; previousStock: {[key: string]: number}; newStock: {[key: string]: number}}> {
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, productId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error(`Producto con ID ${productId} no encontrado`);
    }
    
    const currentProduct = docSnap.data();
    const currentStock = currentProduct.stock || {};
    
    // Actualizar el stock actual
    const updatedStock = { ...currentStock };
    
    // Actualizar cada unidad de stock proporcionada
    Object.keys(stockUpdates).forEach(unit => {
      if (updatedStock[unit] !== undefined) {
        updatedStock[unit] += stockUpdates[unit];
      } else {
        updatedStock[unit] = stockUpdates[unit];
      }
    });
    
    // Actualizar el documento
    await updateDoc(docRef, {
      stock: updatedStock,
      updatedAt: serverTimestamp()
    });
    
    return {
      id: productId,
      previousStock: currentStock,
      newStock: updatedStock
    };
  } catch (error) {
    console.error("Error al actualizar stock:", error);
    throw error;
  }
}

/**
 * Actualizar el precio de un producto
 * 
 * @param productId - ID del producto
 * @param newPrice - Nuevo precio
 * @returns Resultado de la operación
 */
export async function updateProductPrice(
  productId: string, 
  newPrice: number
): Promise<{id: string; oldPrice: number; newPrice: number; priceHistory: {fecha: string; precio: number}[]}> {
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, productId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error(`Producto con ID ${productId} no encontrado`);
    }
    
    const currentProduct = docSnap.data();
    const oldPrice = currentProduct.precio || 0;
    
    // Agregar el precio anterior al historial
    let priceHistory = currentProduct.historialPrecios || [];
    
    // Agregar nuevo registro al historial
    priceHistory.push({
      fecha: new Date().toISOString(),
      precio: newPrice
    });
    
    // Limitar el historial a los últimos 10 registros para evitar documentos demasiado grandes
    if (priceHistory.length > 10) {
      priceHistory = priceHistory.slice(-10);
    }
    
    // Actualizar el documento
    await updateDoc(docRef, {
      precio: newPrice,
      historialPrecios: priceHistory,
      updatedAt: serverTimestamp()
    });
    
    return {
      id: productId,
      oldPrice,
      newPrice,
      priceHistory
    };
  } catch (error) {
    console.error("Error al actualizar precio:", error);
    throw error;
  }
}

/**
 * Buscar productos por nombre
 * 
 * @param name - Nombre o parte del nombre a buscar
 * @returns Lista de productos que coinciden
 */
export async function getProductsByName(name: string): Promise<Product[]> {
  try {
    // Nota: En Firestore no se pueden hacer consultas de "contiene" directamente.
    // Esta es una implementación simple que obtiene todos los productos y filtra en memoria.
    
    const products = await getAllProducts();
    
    return products.filter(product => 
      product.nombre.toLowerCase().includes(name.toLowerCase())
    );
  } catch (error) {
    console.error("Error al buscar productos por nombre:", error);
    throw error;
  }
}

/**
 * Convierte una cantidad de una unidad a otra
 * 
 * @param product - Producto con información de conversiones
 * @param fromUnit - Unidad de origen
 * @param toUnit - Unidad de destino
 * @param quantity - Cantidad a convertir
 * @returns Cantidad convertida
 */
export function convertUnits(product: Product, fromUnit: string, toUnit: string, quantity: number): number {
  // Si las unidades son iguales, retornar la misma cantidad
  if (fromUnit === toUnit) {
    return quantity;
  }

  // Verificar que el producto tenga conversiones definidas
  if (!product.conversiones) {
    throw new Error(`El producto ${product.nombre} no tiene conversiones definidas`);
  }

  // Verificar conversión directa
  if (product.conversiones[fromUnit]?.[toUnit]) {
    return quantity * product.conversiones[fromUnit][toUnit];
  }

  // Verificar conversión inversa
  if (product.conversiones[toUnit]?.[fromUnit]) {
    return quantity / product.conversiones[toUnit][fromUnit];
  }

  // Intentar conversión a través de kg como unidad común
  if (product.conversiones[fromUnit]?.kg && product.conversiones[toUnit]?.kg) {
    // Convertir a kg primero
    const kgValue = quantity * product.conversiones[fromUnit].kg;
    
    // Luego convertir de kg a la unidad destino
    return kgValue / product.conversiones[toUnit].kg;
  }

  // Intentar encontrar cualquier camino de conversión a través de otras unidades
  const visitadas = new Set<string>();
  const camino = buscarCaminoConversion(product.conversiones, fromUnit, toUnit, visitadas);
  
  if (camino.length > 0) {
    // Aplicar cada conversión en el camino
    let resultado = quantity;
    for (let i = 0; i < camino.length - 1; i++) {
      const desde = camino[i];
      const hacia = camino[i + 1];
      
      if (product.conversiones[desde]?.[hacia]) {
        resultado *= product.conversiones[desde][hacia];
      } else if (product.conversiones[hacia]?.[desde]) {
        resultado /= product.conversiones[hacia][desde];
      } else {
        throw new Error(`Camino de conversión inválido de ${desde} a ${hacia}`);
      }
    }
    return resultado;
  }

  throw new Error(`No se encontró una conversión de ${fromUnit} a ${toUnit} para el producto ${product.nombre}`);
}
/**
 * Busca un camino de conversión entre dos unidades
 * 
 * @param conversiones - Mapa de conversiones del producto
 * @param inicio - Unidad de inicio
 * @param fin - Unidad de destino
 * @param visitadas - Set de unidades ya visitadas (para evitar ciclos)
 * @returns Camino de conversión (array de unidades)
 */
function buscarCaminoConversion(
  conversiones: Conversiones, 
  inicio: string, 
  fin: string, 
  visitadas: Set<string>
): string[] {
  // Si ya visitamos esta unidad, evitar ciclos
  if (visitadas.has(inicio)) {
    return [];
  }
  
  // Marcar como visitada
  visitadas.add(inicio);
  
  // Si hay conversión directa, devolver el camino
  if (conversiones[inicio]?.[fin]) {
    return [inicio, fin];
  }
  
  // Probar cada vecino como siguiente paso
  const vecinos = conversiones[inicio] ? Object.keys(conversiones[inicio]) : [];
  for (const vecino of vecinos) {
    const restoCamino = buscarCaminoConversion(conversiones, vecino, fin, visitadas);
    if (restoCamino.length > 0) {
      return [inicio, ...restoCamino];
    }
  }
  
  // También probar conversiones inversas
  for (const [unidad, convs] of Object.entries(conversiones)) {
    if (unidad !== inicio && convs[inicio] && !visitadas.has(unidad)) {
      const restoCamino = buscarCaminoConversion(conversiones, unidad, fin, visitadas);
      if (restoCamino.length > 0) {
        return [inicio, ...restoCamino];
      }
    }
  }
  
  // Si no encontramos camino, devolver array vacío
  return [];
}
/**
 * Actualiza o crea las conversiones para un producto
 * 
 * @param productId - ID del producto
 * @param unitConversions - Mapa de conversiones entre unidades
 * @returns Producto actualizado
 */
export async function updateProductConversions(
  productId: string,
  newConversions: Conversiones
): Promise<Product> {
  try {
    // Obtener el producto actual con sus conversiones existentes
    const product = await getProductById(productId);
    
    if (!product) {
      throw new Error(`Producto con ID ${productId} no encontrado`);
    }
    
    // Obtener conversiones existentes o inicializar objeto vacío
    const existingConversions = product.conversiones || {};
    
    // Combinar conversiones existentes con las nuevas
    const updatedConversions = { ...existingConversions };
    
    // Para cada unidad de origen en las nuevas conversiones
    Object.keys(newConversions).forEach(fromUnit => {
      if (!updatedConversions[fromUnit]) {
        updatedConversions[fromUnit] = {};
      }
      
      // Para cada unidad de destino
      Object.keys(newConversions[fromUnit]).forEach(toUnit => {
        updatedConversions[fromUnit][toUnit] = newConversions[fromUnit][toUnit];
      });
    });
    
    // Actualizar el documento en Firestore
    await updateDoc(doc(db, PRODUCTS_COLLECTION, productId), {
      conversiones: updatedConversions,
      updatedAt: serverTimestamp()
    });
    
    console.log(`Conversiones actualizadas para producto ${productId}:`, updatedConversions);
    
    // Devolver el producto actualizado
    return { 
      ...product, 
      conversiones: updatedConversions 
    };
  } catch (error) {
    console.error("Error al actualizar conversiones:", error);
    throw error;
  }
}

/**
 * Completa todas las conversiones posibles basadas en las existentes
 * 
 * @param productId - ID del producto
 * @returns Mapa completo de conversiones
 */
export async function buildCompleteConversions(productId: string): Promise<Conversiones> {
  const product = await getProductById(productId);
  
  if (!product || !product.conversiones) {
    throw new Error("Producto sin conversiones definidas");
  }
  
  const conversiones = {...product.conversiones};
  const units = new Set<string>();
  
  // Recolectar todas las unidades
  Object.keys(conversiones).forEach(fromUnit => {
    units.add(fromUnit);
    Object.keys(conversiones[fromUnit]).forEach(toUnit => {
      units.add(toUnit);
    });
  });
  
  const allUnits = Array.from(units);
  
  // Para cada par de unidades, intentar encontrar una conversión
  for (const fromUnit of allUnits) {
    if (!conversiones[fromUnit]) {
      conversiones[fromUnit] = {};
    }
    
    for (const toUnit of allUnits) {
      if (fromUnit === toUnit) continue;
      
      // Si ya existe una conversión directa, la mantenemos
      if (conversiones[fromUnit][toUnit]) continue;
      
      try {
        // Intentar conversión a través de kg o unidades comunes
        const conversionRate = convertUnits(
          { ...product, conversiones }, 
          fromUnit, 
          toUnit, 
          1
        );
        
        conversiones[fromUnit][toUnit] = conversionRate;
      } catch (error) {
        // No se pudo establecer conversión
        console.info(`No se pudo establecer conversión de ${fromUnit} a ${toUnit}`);
      }
    }
  }
  
  // Guardar las conversiones completadas
  await updateProductConversions(productId, conversiones);
  
  return conversiones;
}

/**
 * Obtiene la equivalencia en kg para una cantidad en una unidad determinada
 * 
 * @param product - Producto
 * @param unit - Unidad
 * @param quantity - Cantidad
 * @returns Equivalencia en kg o null si no es posible
 */
export function getKgEquivalent(product: Product, unit: string, quantity: number): number | null {
  try {
    if (unit === 'kg') {
      return quantity;
    }
    
    if (!product.conversiones?.[unit]?.['kg']) {
      return null;
    }
    
    return quantity * product.conversiones[unit]['kg'];
  } catch (error) {
    console.error("Error al calcular equivalencia en kg:", error);
    return null;
  }
}

/**
 * Obtiene todas las unidades disponibles para un producto
 * 
 * @param product - Producto
 * @returns Array de unidades disponibles
 */
export function getAvailableUnits(product: Product): string[] {
  const units = new Set<string>();
  
  // Agregar unidad predeterminada
  units.add(product.unidadPredeterminada);
  
  // Agregar unidades de conversiones
  if (product.conversiones) {
    Object.keys(product.conversiones).forEach(fromUnit => {
      units.add(fromUnit);
      Object.keys(product.conversiones![fromUnit]).forEach(toUnit => {
        units.add(toUnit);
      });
    });
  }
  
  // Agregar unidades secundarias
  if (product.unidadesSecundarias) {
    product.unidadesSecundarias.forEach(unit => units.add(unit));
  }
  
  return Array.from(units);
}

/**
 * Obtener precio por unidad específica
 * 
 * @param product - Producto
 * @param unit - Unidad de medida
 * @returns Precio en la unidad solicitada o null si no existe
 */
export function getPriceForUnit(product: Product, unit: string): number | null {
  // Verificar si hay precio específico para esta unidad
  if (product.precios && product.precios[unit]) {
    return product.precios[unit];
  }
  
  // Verificar si hay precio base para la unidad predeterminada
  if (unit === product.unidadPredeterminada && (product.precio || product.precios?.[product.unidadPredeterminada])) {
    return product.precio || product.precios[product.unidadPredeterminada];
  }
  
  return null;
}

/**
 * Actualizar precio para una unidad específica
 * 
 * @param productId - ID del producto
 * @param unit - Unidad de medida
 * @param price - Precio para esa unidad
 * @returns Producto actualizado
 */
export async function updatePriceForUnit(
  productId: string, 
  unit: string, 
  price: number
): Promise<Product> {
  try {
    const product = await getProductById(productId);
    if (!product) {
      throw new Error(`Producto con ID ${productId} no encontrado`);
    }
    
    const updatedPrices = { ...product.precios } || {};
    updatedPrices[unit] = price;
    
    await updateDoc(doc(db, PRODUCTS_COLLECTION, productId), {
      precios: updatedPrices,
      updatedAt: serverTimestamp()
    });
    
    return { 
      ...product, 
      precios: updatedPrices
    };
  } catch (error) {
    console.error("Error al actualizar precio por unidad:", error);
    throw error;
  }
}
