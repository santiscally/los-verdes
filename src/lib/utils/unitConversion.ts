/**
 * Utilidades para la conversión de unidades de productos
 */

interface Conversiones {
  [key: string]: {
    [key: string]: number;
  };
}

interface Product {
  id?: string;
  nombre: string;
  unidadPredeterminada?: string;
  conversiones?: Conversiones;
}

/**
 * Convierte una cantidad de una unidad a otra utilizando las conversiones definidas en el producto
 * 
 * @param {Product} product - Objeto del producto con sus conversiones
 * @param {string} fromUnit - Unidad de origen
 * @param {string} toUnit - Unidad de destino
 * @param {number} quantity - Cantidad a convertir
 * @returns {number} - Cantidad convertida
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
  
    // Intentar convertir a través de kg como unidad común
    if (product.conversiones[fromUnit]?.kg && product.conversiones[toUnit]?.kg) {
      // Convertir a kg primero
      const kgValue = quantity * product.conversiones[fromUnit].kg;
      
      // Luego convertir de kg a la unidad destino
      return kgValue / product.conversiones[toUnit].kg;
    }
  
    // Si no hay conversión a través de kg, intentar conversión directa
    if (product.conversiones[fromUnit]?.[toUnit]) {
      return quantity * product.conversiones[fromUnit][toUnit];
    }
  
    // Si no hay conversión a través de kg ni directa, intentar conversión inversa
    if (product.conversiones[toUnit]?.[fromUnit]) {
      return quantity / product.conversiones[toUnit][fromUnit];
    }
  
    throw new Error(`No se encontró una conversión de ${fromUnit} a ${toUnit} para el producto ${product.nombre}`);
  }
  
  /**
   * Normaliza una cantidad a la unidad predeterminada del producto
   * 
   * @param {Product} product - Objeto del producto con sus conversiones
   * @param {string} unit - Unidad actual
   * @param {number} quantity - Cantidad a normalizar
   * @returns {number} - Cantidad normalizada en la unidad predeterminada
   */
  export function normalizeToDefaultUnit(product: Product, unit: string, quantity: number): number {
    if (!product.unidadPredeterminada || unit === product.unidadPredeterminada) {
      return quantity;
    }
  
    return convertUnits(product, unit, product.unidadPredeterminada, quantity);
  }
  
  /**
   * Construye una tabla de conversiones completa para un producto
   * Útil para mostrar todas las posibles conversiones entre unidades
   * 
   * @param {Product} product - Objeto del producto con sus conversiones
   * @returns {Object} - Tabla de conversiones completa
   */
  export function buildConversionTable(product: Product): Record<string, Record<string, number | undefined>> {
    if (!product.conversiones) {
      return {};
    }
  
    const units = new Set<string>();
    const conversionTable: Record<string, Record<string, number | undefined>> = {};
  
    // Recopilar todas las unidades disponibles
    Object.keys(product.conversiones).forEach(fromUnit => {
      units.add(fromUnit);
      Object.keys(product.conversiones![fromUnit]).forEach(toUnit => {
        units.add(toUnit);
      });
    });
  
    // Construir tabla completa
    Array.from(units).forEach(fromUnit => {
      conversionTable[fromUnit] = {};
      
      Array.from(units).forEach(toUnit => {
        try {
          // Usar 1 como cantidad para obtener el factor de conversión
          conversionTable[fromUnit][toUnit] = convertUnits(product, fromUnit, toUnit, 1);
        } catch (error) {
          // Si no hay conversión disponible, dejar como undefined
          conversionTable[fromUnit][toUnit] = undefined;
        }
      });
    });
  
    return conversionTable;
  }
  
  /**
   * Calcula la equivalencia en kg para una cantidad dada
   * 
   * @param {Product} product - Objeto del producto
   * @param {string} unit - Unidad actual
   * @param {number} quantity - Cantidad
   * @returns {number|null} - Equivalencia en kg o null si no es posible
   */
  export function getKgEquivalent(product: Product, unit: string, quantity: number): number | null {
    try {
      if (unit === 'kg') {
        return quantity;
      }
  
      if (!product.conversiones?.[unit]?.kg) {
        return null;
      }
  
      return quantity * product.conversiones[unit].kg;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Devuelve un texto descriptivo de la conversión
   * 
   * @param {Product} product - Objeto del producto
   * @param {string} unit - Unidad
   * @returns {string} - Texto descriptivo (ej: "1 cajón = 10 kg")
   */
  export function getConversionDescription(product: Product, unit: string): string {
    if (!product.conversiones?.[unit]?.kg) {
      return '';
    }
  
    const kgValue = product.conversiones[unit].kg;
    return `1 ${unit} = ${kgValue} kg`;
  }