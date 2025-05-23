// src/services/importService.ts
import Papa from 'papaparse';

import { createClient, getClientById, updateClient, getClientsByName } from './clientService';
import { createOrder } from './orderService';
import { createPurchase } from './purchaseService';
import { 
  updateProduct, 
  createProduct, 
  getProductsByName, 
  convertUnits,
  updateProductConversions,
  Product,
  Conversiones,
  buildCompleteConversions
} from './productService';
import { PreviewItem, PreviewOrder } from '@/components/importar/ImportPreviewModal';
import { ConversionRequest } from '@/components/productos/ConversionRequestModal';

// Interfaces
export interface ImportResult {
  total: number;
  success: number;
  failed: number;
  failures?: {
    item: string;
    error: string;
  }[];
}

export interface ImportOrdersOptions {
  collectConversions?: boolean;
}

export interface ImportWithConversionsResult extends ImportResult {
  pendingConversions?: ConversionRequest[];
  ordersPreviwed?: PreviewOrder[];
}
/*
* Función para importar pedidos desde CSV con creación dinámica de productos
* 
* @param csvFile - Archivo CSV o contenido en string
* @param options - Opciones de importación
* @returns Resultado de la importación
*/
export async function importOrdersFromCSV(
 csvFile: File | string,
 options: ImportOrdersOptions = { collectConversions: true }
): Promise<ImportWithConversionsResult> {
 try {
   const parsePromise = new Promise<Papa.ParseResult<any>>((resolve, reject) => {
     Papa.parse(csvFile, {
       header: true,
       skipEmptyLines: true,
       dynamicTyping: true,
       complete: (results) => resolve(results),
       error: (error) => reject(error)
     });
   });

   const results = await parsePromise;
   const orderItems = results.data;
   
   // Agrupar por cliente
   const ordersByClient = groupOrdersByClient(orderItems);
   
   const importResults: ImportWithConversionsResult = {
     total: Object.keys(ordersByClient).length,
     success: 0,
     failed: 0,
     failures: [],
     pendingConversions: [],
     ordersPreviwed: []
   };

   // Primera pasada: detectar conversiones necesarias
   if (options.collectConversions) {
     for (const clientName in ordersByClient) {
       for (const item of ordersByClient[clientName]) {
         const products = await getProductsByName(item.producto);
         
         if (products && products.length > 0) {
           const product = products[0];
           
           // Verificar si la unidad requiere conversión
           if (item.unidad && item.unidad !== product.unidadPredeterminada) {
             // Verificar si ya existe la conversión
             const conversionExists = product.conversiones?.[item.unidad]?.[product.unidadPredeterminada] ||
                                    product.conversiones?.[product.unidadPredeterminada]?.[item.unidad];
             
             if (!conversionExists) {
               // Agregar a conversiones pendientes
               const existingRequest = importResults.pendingConversions!.find(
                 r => r.productId === product.id && 
                      r.fromUnit === item.unidad && 
                      r.toUnit === product.unidadPredeterminada
               );
               
               if (!existingRequest) {
                 importResults.pendingConversions!.push({
                   productId: product.id!,
                   productName: product.nombre,
                   fromUnit: item.unidad,
                   toUnit: product.unidadPredeterminada
                 });
               }
             }
           }
         }
       }
     }

     // Si hay conversiones pendientes, devolver sin importar
     if (importResults.pendingConversions!.length > 0) {
       // Generar preview de pedidos
       const previewOrders: PreviewOrder[] = [];
       
       for (const clientName in ordersByClient) {
         const client = await getClientByNameExact(clientName);
         if (!client) continue;
         
         const previewItems: PreviewItem[] = [];
         
         for (const item of ordersByClient[clientName]) {
           const product = await getOrCreateProduct(item.producto, item.unidad);
           if (!product) continue;
           
           const previewItem: PreviewItem = {
             product: item.producto,
             cantidad: item.cantidad,
             unidad: item.unidad
           };
           
           // Verificar si necesita conversión
           const needsConversion = importResults.pendingConversions!.find(
             p => p.productId === product.id && p.fromUnit === item.unidad
           );
           
           if (needsConversion) {
             previewItem.conversionRequired = {
               from: needsConversion.fromUnit,
               to: needsConversion.toUnit,
               value: 0 // Se llenará después
             };
           }
           
           previewItems.push(previewItem);
         }
         
         previewOrders.push({
           client: clientName,
           items: previewItems
         });
       }
       
       importResults.ordersPreviwed = previewOrders;
       return importResults;
     }
   }

   // Ejecutar importación normal
   for (const clientName in ordersByClient) {
     try {
       // Buscar cliente
       const client = await getClientByNameExact(clientName);
       
       if (!client) {
         throw new Error(`Cliente "${clientName}" no encontrado`);
       }
       
       const items: any[] = [];
       let hasErrors = false;
       
       // Procesar cada ítem del pedido
       for (const item of ordersByClient[clientName]) {
         try {
           // Buscar o crear producto
           const product = await getOrCreateProduct(item.producto, item.unidad);
           
           if (!product) {
             throw new Error(`Error al crear/obtener producto "${item.producto}"`);
           }
           
           // Verificar si la unidad del pedido necesita conversión
           if (item.unidad && item.unidad !== product.unidadPredeterminada) {
             // Solicitar o usar conversión existente
             await handleUnitConversion(product, item.unidad);
           }
           
           items.push({
             productoId: product.id,
             nombreProducto: product.nombre,
             cantidad: item.cantidad,
             unidad: item.unidad || product.unidadPredeterminada,
             observaciones: item.observaciones || ''
           });
         } catch (error: any) {
           console.error(`Error procesando ítem ${item.producto}:`, error);
           hasErrors = true;
           importResults.failures!.push({
             item: `${clientName} - ${item.producto}`,
             error: error.message
           });
         }
       }
       
       if (hasErrors) {
         continue; // Saltar este pedido si hubo errores en algún ítem
       }
       
       // Crear pedido
       if (items.length > 0) {
         const order = {
           clienteId: client.id!,
           nombreCliente: client.nombre,
           fechaEntrega: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Próximo día
           items,
           observaciones: `Pedido importado el ${new Date().toLocaleDateString()}`
         };
         
         await createOrder(order);
         importResults.success++;
       }
     } catch (error: any) {
       console.error(`Error importando pedido para ${clientName}:`, error);
       importResults.failed++;
       importResults.failures!.push({
         item: clientName,
         error: error.message
       });
     }
   }

   return importResults;
 } catch (error) {
   console.error('Error al importar pedidos:', error);
   throw error;
 }
}

/**
 * Función para obtener o crear un producto dinámicamente
 * 
 * @param productName - Nombre del producto
 * @param unit - Unidad de medida
 * @returns Producto existente o recién creado
 */
async function getOrCreateProduct(productName: string, unit: string = 'unidad'): Promise<Product | null> {
  try {
    // Buscar producto existente
    const existingProducts = await getProductsByName(productName);
    
    if (existingProducts && existingProducts.length > 0) {
      // Encontrar coincidencia exacta
      const exactMatch = existingProducts.find(product => 
        product.nombre.toLowerCase() === productName.toLowerCase()
      );
      
      if (exactMatch) {
        return exactMatch;
      }
      
      // Si no hay coincidencia exacta, tomar el primero
      return existingProducts[0];
    }
    
    // Si no existe, crear nuevo producto
    const newProduct = {
      nombre: productName,
      unidadPredeterminada: unit,
      margenGanancia: 1.1, // 10% de margen por defecto
      conversiones: {},
      precios: {} // Inicializar vacío
      // NO INCLUIR campo precio si no hay valor
    };
    
    return await createProduct(newProduct);
  } catch (error) {
    console.error(`Error al obtener/crear producto ${productName}:`, error);
    return null;
  }
}

/**
 * Función para manejar conversiones de unidades dinámicamente
 * 
 * @param product - Producto existente
 * @param newUnit - Nueva unidad de medida detectada
 */
async function handleUnitConversion(product: Product, newUnit: string): Promise<void> {
  try {
    // Verificar si ya existe una conversión
    if (product.conversiones && 
        product.conversiones[product.unidadPredeterminada] && 
        product.conversiones[product.unidadPredeterminada][newUnit]) {
      // La conversión ya existe, no hacer nada
      return;
    }
    
    // Aquí en una implementación real, habría que mostrar un modal o solicitar la conversión
    // Por ahora, lo dejamos sin conversión para que el sistema pida la conversión cuando sea necesario
    console.log(`Se necesita definir conversión de ${product.unidadPredeterminada} a ${newUnit} para ${product.nombre}`);
  } catch (error) {
    console.error(`Error al manejar conversión de unidad:`, error);
  }
}

/**
 * Función para agrupar ítems de pedido por cliente
 * 
 * @param orderItems - Ítems del pedido
 * @returns Pedidos agrupados por cliente
 */
function groupOrdersByClient(orderItems: any[]) {
  const ordersByClient: {[key: string]: any[]} = {};
  
  for (const item of orderItems) {
    const clientName = item.cliente || 'Sin Cliente';
    
    if (!ordersByClient[clientName]) {
      ordersByClient[clientName] = [];
    }
    
    ordersByClient[clientName].push({
      producto: item.producto,
      cantidad: item.cantidad,
      unidad: item.unidad,
      observaciones: item.observaciones
    });
  }
  
  return ordersByClient;
}

/**
 * Función auxiliar para buscar cliente por nombre exacto
 * 
 * @param name - Nombre del cliente
 * @returns Cliente o null si no existe
 */
async function getClientByNameExact(name: string) {
  try {
    const clients = await getClientsByName(name);
    
    if (!clients || clients.length === 0) {
      return null;
    }
    
    // Buscar coincidencia exacta sin considerar mayúsculas/minúsculas
    const exactMatch = clients.find(client => 
      client.nombre.toLowerCase() === name.toLowerCase()
    );
    
    if (exactMatch) {
      return exactMatch;
    } else {
      // Como opción de respaldo, podemos devolver la primera coincidencia parcial
      return clients[0];
    }
  } catch (error) {
    console.error(`Error al buscar cliente por nombre exacto "${name}":`, error);
    return null;
  }
}

/**
 * Función para importar compras desde CSV con creación dinámica de productos
 * 
 * @param csvFile - Archivo CSV o contenido en string
 * @returns Resultado de la importación
 */
export async function importPurchasesFromCSV(csvFile: File | string): Promise<ImportResult> {
  try {
    const parsePromise = new Promise<Papa.ParseResult<any>>((resolve, reject) => {
      Papa.parse(csvFile, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => resolve(results),
        error: (error) => reject(error)
      });
    });

    const results = await parsePromise;
    const purchaseItems = results.data;
    
    const items: any[] = [];
    const importResults: ImportResult = {
      total: purchaseItems.length,
      success: 0,
      failed: 0,
      failures: []
    };

    for (const item of purchaseItems) {
      try {
        const productName = item.ITEM || item.nombre || '';
        const quantity = item.Q || 0;
        const unit = item.UM || 'unidad';
        const price = item.Precio || 0;
        const kgEquivalent = item['q kg'] || null;
        
        // Obtener o crear producto
        const product = await getOrCreateProduct(productName, unit);
        
        if (!product) {
          throw new Error(`Error al crear/obtener producto "${productName}"`);
        }
        
        // Actualizar precio del producto
        if (price > 0) {
          await updateProduct(product.id!, { precio: price });
        }
        
        // Si hay información de conversión kg, agregarla
        if (kgEquivalent) {
          await updateProductConversions(product.id!, {
            [unit]: { 'kg': kgEquivalent },
            'kg': { [unit]: 1 / kgEquivalent }
          });
        }
        
        // Agregar a la lista de items comprados
        items.push({
          productoId: product.id,
          nombreProducto: product.nombre,
          cantidad: quantity,
          unidad: unit,
          precio: price,
          proveedor: item['Precio Referencia'] || ''
        });
        
        importResults.success++;
      } catch (error: any) {
        console.error(`Error procesando ítem de compra ${item.ITEM || item.nombre}:`, error);
        importResults.failed++;
        importResults.failures!.push({
          item: item.ITEM || item.nombre,
          error: error.message
        });
      }
    }

    // Crear la compra con todos los ítems procesados
    if (items.length > 0) {
      const purchase = {
        fechaCompra: new Date().toISOString(),
        items,
        observaciones: `Compra importada el ${new Date().toLocaleDateString()}`
      };
      
      await createPurchase(purchase);
    }

    return importResults;
  } catch (error) {
    console.error('Error al importar compras:', error);
    throw error;
  }
}

/**
 * Ejecutar importación con conversiones ya definidas
 */
export async function importOrdersWithConversions(
  file: File | string,
  conversions: Map<string, number>
): Promise<ImportResult> {
  try {
    // Primero, guardamos todas las conversiones en los productos correspondientes
    for (const [key, value] of conversions.entries()) {
      // La clave tiene el formato "productId-fromUnit-toUnit"
      const [productId, fromUnit, toUnit] = key.split('-');
      
      // Crear el objeto de conversión para actualizar en el producto
      const conversionMap: Conversiones = {};
      
      // Establecer la conversión directa
      if (!conversionMap[fromUnit]) conversionMap[fromUnit] = {};
      conversionMap[fromUnit][toUnit] = value;
      
      // Establecer la conversión inversa
      if (!conversionMap[toUnit]) conversionMap[toUnit] = {};
      conversionMap[toUnit][fromUnit] = 1 / value;
      
      // Actualizar el producto con estas conversiones
      await updateProductConversions(productId, conversionMap);
      
      // Opcionalmente, completar todas las conversiones posibles
      await buildCompleteConversions(productId);
    }
    
    // Luego, proceder con la importación normal sin solicitar conversiones
    return await importOrdersFromCSV(file, { collectConversions: false });
  } catch (error) {
    console.error('Error al importar con conversiones:', error);
    throw error;
  }
}