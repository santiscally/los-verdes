import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import 'jspdf-autotable';
import { Product } from '@/services/productService';

interface OrderItem {
  nombreProducto?: string;
  cantidad?: number;
  unidad?: string;
  precioUnitario?: number;
  precioTotal?: number;
  observaciones?: string;
}

interface Receipt {
  id: string;
  nombreCliente?: string;
  direccionCliente?: string;
  fechaEmision: string;
  fechaEntrega: string;
  items: OrderItem[];
  total?: number;
}

interface PurchaseItem extends OrderItem {
  proveedor?: string;
  precio?: number;
}

interface Purchase {
  id: string;
  fechaCompra: string;
  items: PurchaseItem[];
  total?: number;
  observaciones?: string;
}

interface Order {
  id: string;
  nombreCliente?: string;
  fechaCreacion?: string;
  fechaEntrega: string;
  estado?: string;
  observaciones?: string;
  items: OrderItem[];
  total?: number;
}


/**
 * Genera un PDF de un remito
 * 
 * @param {Receipt} receipt - Datos del remito
 * @returns {jsPDF} - Documento PDF generado
 */
export function generateReceiptPDF(receipt: Receipt): jsPDF {
  const doc = new jsPDF();
  
  // Título y encabezado
  doc.setFontSize(20);
  doc.text('Los Verdes', 105, 20, { align: 'center' });
  
  doc.setFontSize(16);
  doc.text('Remito de Entrega', 105, 30, { align: 'center' });
  
  // Línea separadora
  doc.setLineWidth(0.5);
  doc.line(20, 35, 190, 35);
  
  // Información del cliente y remito
  doc.setFontSize(11);
  doc.text(`Cliente: ${receipt.nombreCliente || ''}`, 20, 45);
  doc.text(`Dirección: ${receipt.direccionCliente || ''}`, 20, 52);
  
  const fechaEmision = receipt.fechaEmision 
    ? format(new Date(receipt.fechaEmision), 'dd/MM/yyyy', { locale: es })
    : '';
  
  const fechaEntrega = receipt.fechaEntrega 
    ? format(new Date(receipt.fechaEntrega), 'dd/MM/yyyy', { locale: es })
    : '';
  
  doc.text(`Fecha de Emisión: ${fechaEmision}`, 130, 45);
  doc.text(`Fecha de Entrega: ${fechaEntrega}`, 130, 52);
  doc.text(`Nº de Remito: ${receipt.id}`, 130, 59);
  
  // Tabla de productos
  const tableColumn = ['Producto', 'Cantidad', 'Unidad', 'Precio Unit.', 'Total'];
  const tableRows: any[] = [];
  
  receipt.items.forEach(item => {
    const formattedRow = [
      item.nombreProducto || '',
      item.cantidad?.toString() || '',
      item.unidad || '',
      `$${item.precioUnitario?.toLocaleString() || '0'}`,
      `$${item.precioTotal?.toLocaleString() || '0'}`
    ];
    tableRows.push(formattedRow);
  });
  
  (doc as any).autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 65,
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [76, 175, 80] },
    margin: { top: 65 }
  });
  
  // Total
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.text(`Total: $${receipt.total?.toLocaleString() || '0'}`, 170, finalY, { align: 'right' });
  
  // Firmas
  const firmasY = finalY + 30;
  doc.line(40, firmasY, 80, firmasY);
  doc.line(130, firmasY, 170, firmasY);
  
  doc.setFontSize(10);
  doc.text('Entregado por', 60, firmasY + 5, { align: 'center' });
  doc.text('Recibido por', 150, firmasY + 5, { align: 'center' });
  
  // Pie de página
  doc.setFontSize(9);
  doc.text('Los Verdes - Sistema de Gestión', 105, 285, { align: 'center' });
  
  return doc;
}

/**
 * Genera un PDF de una orden de compra
 * 
 * @param {Purchase} purchase - Datos de la compra
 * @returns {jsPDF} - Documento PDF generado
 */
export function generatePurchasePDF(purchase: Purchase): jsPDF {
  const doc = new jsPDF();
  
  // Título y encabezado
  doc.setFontSize(20);
  doc.text('Los Verdes', 105, 20, { align: 'center' });
  
  doc.setFontSize(16);
  doc.text('Orden de Compra', 105, 30, { align: 'center' });
  
  // Línea separadora
  doc.setLineWidth(0.5);
  doc.line(20, 35, 190, 35);
  
  // Información de la compra
  doc.setFontSize(11);
  
  const fechaCompra = purchase.fechaCompra 
    ? format(new Date(purchase.fechaCompra), 'dd/MM/yyyy', { locale: es })
    : '';
  
  doc.text(`Fecha: ${fechaCompra}`, 20, 45);
  doc.text(`Nº de Orden: ${purchase.id}`, 20, 52);
  
  if (purchase.observaciones) {
    doc.text(`Observaciones: ${purchase.observaciones}`, 20, 59);
  }
  
  // Tabla de productos
  const tableColumn = ['Producto', 'Cantidad', 'Unidad', 'Proveedor', 'Precio Unit.', 'Total'];
  const tableRows: any[] = [];
  
  purchase.items.forEach(item => {
    const formattedRow = [
      item.nombreProducto || '',
      item.cantidad?.toString() || '',
      item.unidad || '',
      item.proveedor || '',
      `$${item.precio?.toLocaleString() || '0'}`,
      `$${item.precioTotal?.toLocaleString() || '0'}`
    ];
    tableRows.push(formattedRow);
  });
  
  (doc as any).autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 65,
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [76, 175, 80] },
    margin: { top: 65 }
  });
  
  // Total
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.text(`Total: $${purchase.total?.toLocaleString() || '0'}`, 170, finalY, { align: 'right' });
  
  // Pie de página
  doc.setFontSize(9);
  doc.text('Los Verdes - Sistema de Gestión', 105, 285, { align: 'center' });
  
  return doc;
}

/**
 * Genera un PDF de un pedido
 * 
 * @param {Order} order - Datos del pedido
 * @returns {jsPDF} - Documento PDF generado
 */
export function generateOrderPDF(order: Order): jsPDF {
  const doc = new jsPDF();
  
  // Título y encabezado
  doc.setFontSize(20);
  doc.text('Los Verdes', 105, 20, { align: 'center' });
  
  doc.setFontSize(16);
  doc.text('Pedido', 105, 30, { align: 'center' });
  
  // Línea separadora
  doc.setLineWidth(0.5);
  doc.line(20, 35, 190, 35);
  
  // Información del pedido
  doc.setFontSize(11);
  doc.text(`Cliente: ${order.nombreCliente || ''}`, 20, 45);
  
  const fechaCreacion = order.fechaCreacion 
    ? format(new Date(order.fechaCreacion), 'dd/MM/yyyy', { locale: es })
    : '';
  
  const fechaEntrega = order.fechaEntrega 
    ? format(new Date(order.fechaEntrega), 'dd/MM/yyyy', { locale: es })
    : '';
  
  doc.text(`Fecha de Pedido: ${fechaCreacion}`, 130, 45);
  doc.text(`Fecha de Entrega: ${fechaEntrega}`, 130, 52);
  doc.text(`Nº de Pedido: ${order.id}`, 130, 59);
  
  // Estado del pedido
  doc.text(`Estado: ${order.estado || 'pendiente'}`, 20, 52);
  
  if (order.observaciones) {
    doc.text(`Observaciones: ${order.observaciones}`, 20, 59);
  }
  
  // Tabla de productos
  const tableColumn = ['Producto', 'Cantidad', 'Unidad', 'Precio Est.', 'Total Est.'];
  const tableRows: any[] = [];
  
  order.items.forEach(item => {
    const formattedRow = [
      item.nombreProducto || '',
      item.cantidad?.toString() || '',
      item.unidad || '',
      `$${item.precioUnitario?.toLocaleString() || '0'}`,
      `$${item.precioTotal?.toLocaleString() || '0'}`
    ];
    tableRows.push(formattedRow);
  });
  
  (doc as any).autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 65,
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [76, 175, 80] },
    margin: { top: 65 }
  });
  
  // Total
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.text(`Total Estimado: $${order.total?.toLocaleString() || '0'}`, 170, finalY, { align: 'right' });
  
  // Pie de página
  doc.setFontSize(9);
  doc.text('Los Verdes - Sistema de Gestión', 105, 285, { align: 'center' });
  
  return doc;
}

/**
 * Genera un PDF con el listado de productos
 * 
 * @param {Product[]} products - Lista de productos
 * @returns {jsPDF} - Documento PDF generado
 */
export function generateProductListPDF(products: Product[]): jsPDF {
  const doc = new jsPDF();
  
  // Título y encabezado
  doc.setFontSize(20);
  doc.text('Los Verdes', 105, 20, { align: 'center' });
  
  doc.setFontSize(16);
  doc.text('Listado de Productos', 105, 30, { align: 'center' });
  
  // Línea separadora
  doc.setLineWidth(0.5);
  doc.line(20, 35, 190, 35);
  
  // Fecha actual
  const fechaActual = format(new Date(), 'dd/MM/yyyy', { locale: es });
  doc.setFontSize(11);
  doc.text(`Fecha: ${fechaActual}`, 20, 45);
  
  // Tabla de productos
  const tableColumn = ['Nombre', 'Unidad', 'Proveedor', 'Precio', 'Stock'];
  const tableRows: any[] = [];
  
  products.forEach(product => {
    // Formatear el stock como string
    let stockStr = '';
    if (product.stock) {
      stockStr = Object.entries(product.stock)
        .map(([unit, qty]) => `${qty} ${unit}`)
        .join(', ');
    } else {
      stockStr = 'Sin stock';
    }
    
    const formattedRow = [
      product.nombre || '',
      product.unidadPredeterminada || '',
      `$${product.precio?.toLocaleString() || '0'}`,
      stockStr
    ];
    tableRows.push(formattedRow);
  });
  
  (doc as any).autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 50,
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [76, 175, 80] },
    margin: { top: 50 }
  });
  
  // Pie de página
  doc.setFontSize(9);
  doc.text('Los Verdes - Sistema de Gestión', 105, 285, { align: 'center' });
  
  return doc;
}