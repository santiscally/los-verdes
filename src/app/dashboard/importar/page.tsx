'use client';

import { useState, ChangeEvent } from 'react';
import { importProductsFromCSV, importClientsFromCSV, importOrdersFromCSV, importPurchasesFromCSV } from '@/services/importService';
import Papa from 'papaparse';

interface PreviewData {
  data: any[];
  meta: {
    fields: string[];
  };
}

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  failures?: { item: string; error: string }[];
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<string>('productos');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  // Manejar cambio de archivo
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Previsualizar el archivo CSV
      previewCSV(selectedFile);
    }
  };

  // Previsualizar CSV
  const previewCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      preview: 5, // Solo mostrar las primeras 5 filas
      skipEmptyLines: true,
      complete: (results) => {
        setPreviewData(results as PreviewData);
      },
      error: (error) => {
        console.error('Error al previsualizar CSV:', error);
        setError('Error al previsualizar el archivo. Asegúrate de que sea un CSV válido.');
      }
    });
  };

  // Importar datos
  const handleImport = async () => {
    if (!file) {
      setError('Por favor, selecciona un archivo primero.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let result: ImportResult;

      switch (importType) {
        case 'productos':
          result = await importProductsFromCSV(file);
          break;
        case 'clientes':
          result = await importClientsFromCSV(file);
          break;
        case 'pedidos':
          result = await importOrdersFromCSV(file);
          break;
        case 'compras':
          result = await importPurchasesFromCSV(file);
          break;
        default:
          throw new Error('Tipo de importación no válido');
      }

      setSuccess(`
        Importación completada:
        - Total de registros: ${result.total}
        - Exitosos: ${result.success}
        - Fallidos: ${result.failed}
      `);

      // Si hay errores específicos, mostrarlos
      if (result.failures && result.failures.length > 0) {
        setError(`
          Se encontraron algunos errores durante la importación:
          ${result.failures.map(f => `- ${f.item}: ${f.error}`).join('\n')}
        `);
      }

      // Limpiar el archivo seleccionado
      setFile(null);
      if (document.getElementById('fileInput')) {
        (document.getElementById('fileInput') as HTMLInputElement).value = '';
      }
      setPreviewData(null);
    } catch (err: any) {
      console.error('Error durante la importación:', err);
      setError(`Error durante la importación: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Importar Datos</h1>
        <p className="text-gray-600 mt-2">
          Importa productos, clientes, pedidos o compras desde archivos CSV.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="importType">
            Tipo de Importación
          </label>
          <select
            id="importType"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={importType}
            onChange={(e) => setImportType(e.target.value)}
          >
            <option value="productos">Productos</option>
            <option value="clientes">Clientes</option>
            <option value="pedidos">Pedidos</option>
            <option value="compras">Compras</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="fileInput">
            Archivo CSV
          </label>
          <div className="flex items-center">
            <input
              id="fileInput"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="fileInput"
              className="cursor-pointer bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
            >
              📤 Seleccionar Archivo
            </label>
            <span className="ml-3 text-gray-600">
              {file ? file.name : 'Ningún archivo seleccionado'}
            </span>
          </div>
        </div>

        {previewData && (
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Vista previa:</h3>
            <div className="overflow-x-auto border rounded">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {previewData.meta.fields.map((field, i) => (
                      <th
                        key={i}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {field}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {previewData.data.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {previewData.meta.fields.map((field, fieldIndex) => (
                        <td key={fieldIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {row[field] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-gray-500 text-sm mt-1">
              (Mostrando solo las primeras {previewData.data.length} filas)
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline whitespace-pre-line">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
            <span className="block sm:inline whitespace-pre-line">{success}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleImport}
            disabled={!file || loading}
            className={`font-bold py-2 px-4 rounded flex items-center ${
              !file || loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {loading ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                Importando...
              </>
            ) : (
              <>
                ✅ Importar Datos
              </>
            )}
          </button>
        </div>
      </div>

      {/* Instrucciones de formato */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Instrucciones de Formato</h2>
        
        <div className="mb-4">
          <h3 className="font-bold text-gray-700">Productos</h3>
          <p className="text-gray-600 mb-2">
            El archivo CSV debe incluir las siguientes columnas:
          </p>
          <ul className="list-disc list-inside text-gray-600 ml-4">
            <li>nombre - Nombre del producto (obligatorio)</li>
            <li>unidad - Unidad de medida (ej. unidad, kg, cajon)</li>
            <li>precio - Precio del producto</li>
            <li>proveedor - Nombre del proveedor</li>
            <li>stock - Cantidad en stock</li>
            <li>kgPorUnidad - Equivalencia en kg</li>
            <li>categoria - Categoría del producto</li>
          </ul>
        </div>
        
        <div className="mb-4">
          <h3 className="font-bold text-gray-700">Clientes</h3>
          <p className="text-gray-600 mb-2">
            El archivo CSV debe incluir las siguientes columnas:
          </p>
          <ul className="list-disc list-inside text-gray-600 ml-4">
            <li>nombre - Nombre del cliente (obligatorio)</li>
            <li>direccion - Dirección completa</li>
            <li>telefono - Número de teléfono</li>
            <li>email - Correo electrónico</li>
            <li>contacto - Nombre de la persona de contacto</li>
            <li>observaciones - Notas adicionales</li>
          </ul>
        </div>
        
        <div className="mb-4">
          <h3 className="font-bold text-gray-700">Pedidos</h3>
          <p className="text-gray-600 mb-2">
            El archivo CSV debe incluir las siguientes columnas:
          </p>
          <ul className="list-disc list-inside text-gray-600 ml-4">
            <li>cliente - Nombre del cliente (obligatorio)</li>
            <li>producto - Nombre del producto (obligatorio)</li>
            <li>cantidad - Cantidad solicitada (obligatorio)</li>
            <li>unidad - Unidad de medida</li>
            <li>observaciones - Notas adicionales</li>
          </ul>
          <p className="text-gray-600 mt-2">
            Nota: Cada línea representa un ítem del pedido. Múltiples líneas con el mismo cliente se agruparán en un solo pedido.
          </p>
        </div>
        
        <div>
          <h3 className="font-bold text-gray-700">Compras</h3>
          <p className="text-gray-600 mb-2">
            El archivo CSV debe tener el formato de la planilla "COMPRA MERCADO" con las siguientes columnas:
          </p>
          <ul className="list-disc list-inside text-gray-600 ml-4">
            <li>ITEM - Nombre del producto</li>
            <li>Q - Cantidad comprada</li>
            <li>UM - Unidad de medida</li>
            <li>Precio - Precio unitario</li>
            <li>Precio Referencia - Proveedor o referencia</li>
            <li>q kg - Equivalencia en kg (opcional)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}