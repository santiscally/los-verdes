'use client';

import { useState, useEffect } from 'react';
import { getAllClients, deleteClient } from '@/services/clientService';
import ClientFormModal from '@/components/clientes/ClientFormModal';

interface Client {
  id: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  contacto?: string;
  email?: string;
  observaciones?: string;
}

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);

  // Cargar clientes al montar el componente
  useEffect(() => {
    loadClients();
  }, []);

  // Función para cargar clientes
  async function loadClients() {
    try {
      setLoading(true);
      const clientsData = await getAllClients();
      setClients(clientsData);
      setError(null);
    } catch (err) {
      console.error('Error al cargar clientes:', err);
      setError('Error al cargar los clientes. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  // Función para abrir modal de creación/edición
  function openClientModal(client: Client | null = null) {
    setCurrentClient(client);
    setIsModalOpen(true);
  }

  // Función para eliminar cliente
  async function handleDeleteClient(id: string) {
    if (window.confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
      try {
        await deleteClient(id);
        loadClients(); // Recargar clientes
      } catch (err) {
        console.error('Error al eliminar cliente:', err);
        setError('Error al eliminar el cliente. Por favor, intenta nuevamente.');
      }
    }
  }

  // Filtrar clientes según término de búsqueda
  const filteredClients = searchTerm
    ? clients.filter(client => 
        client.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.direccion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.contacto?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : clients;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <button
          onClick={() => openClientModal()}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center"
        >
          + Nuevo Cliente
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar clientes..."
            className="w-full p-3 pl-10 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
        </div>
      </div>

      {/* Mensajes de estado */}
      {loading && <p className="text-center py-4">Cargando clientes...</p>}
      {error && <p className="text-center text-red-500 py-4">{error}</p>}

      {/* Tabla de clientes */}
      {!loading && !error && (
        <>
          {filteredClients.length === 0 ? (
            <p className="text-center py-4">No se encontraron clientes.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-3 px-4 text-left">Nombre</th>
                    <th className="py-3 px-4 text-left">Dirección</th>
                    <th className="py-3 px-4 text-left">Teléfono</th>
                    <th className="py-3 px-4 text-left">Contacto</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4">{client.nombre}</td>
                      <td className="py-3 px-4">{client.direccion || '-'}</td>
                      <td className="py-3 px-4">{client.telefono || '-'}</td>
                      <td className="py-3 px-4">{client.contacto || '-'}</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => openClientModal(client)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal para crear/editar cliente */}
      {isModalOpen && (
        <ClientFormModal
          client={currentClient}
          onClose={() => setIsModalOpen(false)}
          onSave={() => {
            setIsModalOpen(false);
            loadClients();
          }}
        />
      )}
    </div>
  );
}