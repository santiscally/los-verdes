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
  buildCompleteConversions 
} from './productService';

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

/**
 * Función para importar productos desde CSV
 * 
 * @param csvFile - Archivo CSV o contenido en string
 * @returns Resultado de la importación
 */
export async function importProductsFromCSV(csvFile: File | string): Promise<ImportResult> {
  try {
    // Parsear CSV
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
    const products = results.data;
    const importResults: ImportResult = {
      total: products.length,
      success: 0,
      failed: 0,
      failures: []
    };

    for (const product of products) {
      try {
        // Procesar datos del producto
        const processedProduct = {
          nombre: product.nombre || product.ITEM || '',
          unidadPredeterminada: product.unidad || product.UM || 'unidad',
          precio: product.precio || product.Precio || 0,
          proveedor: product.proveedor || product['Precio Referencia'] || '',
          stock: { [product.unidad || product.UM || 'unidad']: product.stock || 0 },
          margenGanancia: 1.1, // 10% de margen por defecto
          categoria: product.categoria || 'general',
          conversiones: {}
        };

        // Procesar conversiones si existen
        if (product.kgPorUnidad || product['q kg']) {
          if (!processedProduct.conversiones) {
            processedProduct.conversiones = {};
          }
          
          if (!processedProduct.conversiones[processedProduct.unidadPredeterminada]) {
            processedProduct.conversiones[processedProduct.unidadPredeterminada] = {};
          }
          
          processedProduct.conversiones[processedProduct.unidadPredeterminada].kg = 
            product.kgPorUnidad || product['q kg'] || 1;
        }

        // Intentar encontrar el producto por nombre para actualizarlo o crearlo nuevo
        const existingProducts = await getProductsByName(processedProduct.nombre);
        
        if (existingProducts && existingProducts.length > 0) {
          // Actualizar producto existente
          await updateProduct(existingProducts[0].id!, processedProduct);
        } else {
          // Crear nuevo producto
          await createProduct(processedProduct);
        }

        importResults.success++;
      } catch (error: any) {
        console.error(`Error importando producto ${product.nombre || product.ITEM}:`, error);
        importResults.failed++;
        importResults.failures!.push({
          item: product.nombre || product.ITEM,
          error: error.message
        });
      }
    }

    return importResults;
  } catch (error) {
    console.error('Error al importar productos:', error);
    throw error;
  }
}

/**
 * Importa referencias de unidades de productos desde Excel
 * 
 * @param csvFile - Archivo CSV o contenido en string
 * @returns Resultado de la importación
 */
export async function importProductUnitsFromCSV(csvFile: File | string): Promise<ImportResult> {
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
    const unitsData = results.data;
    const importResults: ImportResult = {
      total: unitsData.length,
      success: 0,
      failed: 0,
      failures: []
    };

    for (const row of unitsData) {
      try {
        // Datos básicos de la referencia
        const productName = row.Producto;
        const primaryUnit = row["Viene En"] || "";
        const weightKg = row["Peso KG"] || 0;
        const unitCount = row["Unidad Q"] || 0;
        const secondaryUnit = row["Unidad"] || "";
        
        // Buscar el producto por nombre
        const products = await getProductsByName(productName);
        let product;
        
        if (products && products.length > 0) {
          // Actualizar producto existente
          product = products[0];
        } else {
          // Crear nuevo producto
          product = await createProduct({
            nombre: productName,
            unidadPredeterminada: primaryUnit,
            categoria: getCategoryFromName(productName),
            conversiones: {},
            margenGanancia: 1.3, // Margen por defecto del 30%
          });
        }
        
        // Construir conversiones
        const conversiones: any = {
          [primaryUnit]: {}
        };
        
        // Si tenemos peso en kg, establecer conversión
        if (weightKg) {
          conversiones[primaryUnit]['kg'] = weightKg;
          
          if (!conversiones['kg']) {
            conversiones['kg'] = {};
          }
          conversiones['kg'][primaryUnit] = 1 / weightKg;
        }
        
        // Si tenemos unidades, establecer conversión
        if (unitCount && secondaryUnit) {
          conversiones[primaryUnit][secondaryUnit] = unitCount;
          
          if (!conversiones[secondaryUnit]) {
            conversiones[secondaryUnit] = {};
          }
          conversiones[secondaryUnit][primaryUnit] = 1 / unitCount;
        }
        
        // Actualizar producto con las conversiones
        await updateProductConversions(product.id!, conversiones);
        
        // Completar todas las conversiones posibles
        await buildCompleteConversions(product.id!);
        
        importResults.success++;
      } catch (error: any) {
        console.error(`Error importando referencia para ${row.Producto}:`, error);
        importResults.failed++;
        importResults.failures!.push({
          item: row.Producto,
          error: error.message
        });
      }
    }

    return importResults;
  } catch (error) {
    console.error('Error al importar referencias:', error);
    throw error;
  }
}

/**
 * Función para importar clientes desde CSV
 * 
 * @param csvFile - Archivo CSV o contenido en string
 * @returns Resultado de la importación
 */
export async function importClientsFromCSV(csvFile: File | string): Promise<ImportResult> {
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
    const clients = results.data;
    const importResults: ImportResult = {
      total: clients.length,
      success: 0,
      failed: 0,
      failures: []
    };

    for (const client of clients) {
      try {
        // Procesar datos del cliente
        const processedClient = {
          nombre: client.nombre || '',
          direccion: client.direccion || '',
          telefono: client.telefono || '',
          email: client.email || '',
          contacto: client.contacto || '',
          observaciones: client.observaciones || ''
        };

        // Intentar encontrar el cliente por nombre para actualizarlo o crearlo nuevo
        const existingClients = await getClientsByName(processedClient.nombre);
        
        if (existingClients && existingClients.length > 0) {
          // Actualizar cliente existente
          await updateClient(existingClients[0].id!, processedClient);
        } else {
          // Crear nuevo cliente
          await createClient(processedClient);
        }

        importResults.success++;
      } catch (error: any) {
        console.error(`Error importando cliente ${client.nombre}:`, error);
        importResults.failed++;
        importResults.failures!.push({
          item: client.nombre,
          error: error.message
        });
      }
    }

    return importResults;
  } catch (error) {
    console.error('Error al importar clientes:', error);
    throw error;
  }
}

/**
 * Función para importar pedidos desde CSV
 * 
 * @param csvFile - Archivo CSV o contenido en string
 * @returns Resultado de la importación
 */
export async function importOrdersFromCSV(csvFile: File | string): Promise<ImportResult> {
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
    
    const importResults: ImportResult = {
      total: Object.keys(ordersByClient).length,
      success: 0,
      failed: 0,
      failures: []
    };

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
            // Buscar producto
            const product = await getProductByNameExact(item.producto);
            
            if (!product) {
              throw new Error(`Producto "${item.producto}" no encontrado`);
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
    // Usar la función existente getClientsByName
    const clients = await getClientsByName(name);
    
    if (!clients || clients.length === 0) {
      console.log(`No se encontraron clientes con nombre similar a: ${name}`);
      return null;
    }
    
    // Buscar coincidencia exacta sin considerar mayúsculas/minúsculas
    const exactMatch = clients.find(client => 
      client.nombre.toLowerCase() === name.toLowerCase()
    );
    
    if (exactMatch) {
      console.log(`Cliente encontrado con coincidencia exacta: ${exactMatch.nombre} (ID: ${exactMatch.id})`);
      return exactMatch;
    } else {
      console.log(`No se encontró coincidencia exacta para "${name}". Alternativas: ${clients.map(c => c.nombre).join(', ')}`);
      // Como opción de respaldo, podemos devolver la primera coincidencia parcial
      return clients[0];
    }
  } catch (error) {
    console.error(`Error al buscar cliente por nombre exacto "${name}":`, error);
    return null;
  }
}

/**
 * Función auxiliar para buscar producto por nombre exacto
 * 
 * @param name - Nombre del producto
 * @returns Producto o null si no existe
 */
async function getProductByNameExact(name: string) {
  try {
    // Usar la función existente getProductsByName
    const products = await getProductsByName(name);
    
    if (!products || products.length === 0) {
      console.log(`No se encontraron productos con nombre similar a: ${name}`);
      return null;
    }
    
    // Buscar coincidencia exacta sin considerar mayúsculas/minúsculas
    const exactMatch = products.find(product => 
      product.nombre.toLowerCase() === name.toLowerCase()
    );
    
    if (exactMatch) {
      console.log(`Producto encontrado con coincidencia exacta: ${exactMatch.nombre} (ID: ${exactMatch.id})`);
      return exactMatch;
    } else {
      console.log(`No se encontró coincidencia exacta para "${name}". Alternativas: ${products.map(p => p.nombre).join(', ')}`);
      // Como opción de respaldo, podemos devolver la primera coincidencia parcial
      return products[0];
    }
  } catch (error) {
    console.error(`Error al buscar producto por nombre exacto "${name}":`, error);
    return null;
  }
}

/**
 * Función para importar compras desde CSV
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
        // Buscar producto
        const productName = item.ITEM || item.nombre || '';
        const product = await getProductByNameExact(productName);
        
        if (!product) {
          // Si el producto no existe, crearlo
          const newProduct = {
            nombre: productName,
            unidadPredeterminada: item.UM || 'unidad',
            precio: item.Precio || 0,
            proveedor: item['Precio Referencia'] || 'DESCONOCIDO',
            stock: { [item.UM || 'unidad']: item.Q || 0 },
            margenGanancia: 1.1, // 10% de margen por defecto
            categoria: getCategoryFromName(productName),
            conversiones: {}
          };
          
          // Si hay información de conversión kg, agregarla
          if (item['q kg']) {
            newProduct.conversiones = {
              [newProduct.unidadPredeterminada]: { 'kg': item['q kg'] || 1 },
              'kg': { [newProduct.unidadPredeterminada]: 1 / (item['q kg'] || 1) }
            };
          }
          
          const createdProduct = await createProduct(newProduct);
          
          items.push({
            productoId: createdProduct.id,
            nombreProducto: createdProduct.nombre,
            cantidad: item.Q || 0,
            unidad: item.UM || 'unidad',
            precio: item.Precio || 0,
            proveedor: item['Precio Referencia'] || 'DESCONOCIDO'
          });
        } else {
          // Actualizar información del producto existente
          if (item.Precio) {
            await updateProduct(product.id!, {
              precio: item.Precio,
              proveedor: item['Precio Referencia'] || product.proveedor
            });
          }
          
          if (item['q kg'] && product.unidadPredeterminada) {
            // Actualizar o agregar conversión a kg
            await updateProductConversions(product.id!, {
              [product.unidadPredeterminada]: { 'kg': item['q kg'] },
              'kg': { [product.unidadPredeterminada]: 1 / item['q kg'] }
            });
          }
          
          items.push({
            productoId: product.id,
            nombreProducto: product.nombre,
            cantidad: item.Q || 0,
            unidad: item.UM || product.unidadPredeterminada,
            precio: item.Precio || product.precio,
            proveedor: item['Precio Referencia'] || product.proveedor
          });
        }
        
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

    // Crear la compra si hay ítems válidos
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
 * Importar compras de mercado desde Excel 
 */
export async function importMarketPurchaseFromCSV(csvFile: File | string): Promise<ImportResult> {
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
        // Modelo de compra de mercado esperado
        const productName = item.ITEM || item.nombre || '';
        const quantity = item.Q || 0;
        const unit = item.UM || 'unidad';
        const price = item.Precio || 0;
        const supplier = item['Precio Referencia'] || '';
        const kgEquivalent = item['q kg'] || 0;
        
        // Buscar el producto
        let product = await getProductByNameExact(productName);
        
        if (!product) {
          // Si no existe, crear nuevo producto con información básica
          const newProduct = {
            nombre: productName,
            unidadPredeterminada: unit,
            precio: price,
            proveedor: supplier,
            categoria: getCategoryFromName(productName),
            conversiones: {}
          };
          
          // Si hay información de conversión kg, agregarla
          if (kgEquivalent) {
            newProduct.conversiones = {
              [unit]: { 'kg': kgEquivalent },
              'kg': { [unit]: 1 / kgEquivalent }
            };
          }
          
          product = await createProduct(newProduct);
        } else {
          // Actualizar información del producto existente
          const updates: any = {
            precio: price,
            proveedor: supplier
          };
          
          if (kgEquivalent) {
            // Actualizar o agregar conversión a kg
            await updateProductConversions(product.id!, {
              [unit]: { 'kg': kgEquivalent },
              'kg': { [unit]: 1 / kgEquivalent }
            });
          }
          
          await updateProduct(product.id!, updates);
        }
        
        // Agregar a la lista de items comprados
        items.push({
          productoId: product.id,
          nombreProducto: product.nombre,
          cantidad: quantity,
          unidad: unit,
          precio: price,
          proveedor: supplier
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
        observaciones: `Compra de mercado importada el ${new Date().toLocaleDateString()}`
      };
      
      await createPurchase(purchase);
    }

    return importResults;
  } catch (error) {
    console.error('Error al importar compra de mercado:', error);
    throw error;
  }
}

/**
 * Función para transformar Excel formato de compra a formato de producto
 * 
 * @param purchaseData - Datos de compra
 * @returns Datos transformados a formato de producto
 */
export function transformPurchaseToProductFormat(purchaseData: any[]) {
  return purchaseData.map(item => ({
    nombre: item.ITEM || '',
    unidadPredeterminada: item.UM || 'unidad',
    precio: item.Precio || 0,
    proveedor: item['Precio Referencia'] || '',
    kgPorUnidad: item['q kg'] || null,
    stock: item.Q || 0,
    categoria: getCategoryFromName(item.ITEM || '')
  }));
}

/**
 * Determina la categoría del producto basado en su nombre
 */
function getCategoryFromName(name: string): string {
  name = name.toLowerCase();
  
  if (name.includes('tomate') || name.includes('cebolla') || name.includes('papa') || 
      name.includes('zanahoria') || name.includes('morron') || name.includes('lechuga') ||
      name.includes('repollo') || name.includes('calabaza')) {
    return 'verduras';
  } else if (name.includes('naranja') || name.includes('manzana') || name.includes('banana') || 
             name.includes('limon') || name.includes('pomelo') || name.includes('pera') ||
             name.includes('durazno') || name.includes('uva')) {
    return 'frutas';
  } else if (name.includes('perejil') || name.includes('cilantro') || name.includes('albahaca') || 
             name.includes('oregano') || name.includes('romero') || name.includes('menta') ||
             name.includes('tomillo') || name.includes('salvia')) {
    return 'hierbas';
  } else if (name.includes('champignon') || name.includes('portobello') || 
             name.includes('girgola') || name.includes('hongo')) {
    return 'hongos';
  } else {
    return 'general';
  }
}