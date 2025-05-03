// src/services/clientService.ts
import { db } from '@/app/firebase/config';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  serverTimestamp,
  DocumentData,
  QueryDocumentSnapshot,
  DocumentReference
} from 'firebase/firestore';


// Interfaces
export interface Client {
  id?: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  contacto?: string;
  observaciones?: string;
  historialPedidos?: {
    pedidoId: string;
    fecha: string;
  }[];
  createdAt?: any;
  updatedAt?: any;
}

// Constantes
const CLIENTS_COLLECTION = 'clientes';

/**
 * Crear un nuevo cliente
 * 
 * @param clientData - Datos del cliente
 * @returns Cliente creado con ID
 */
export async function createClient(clientData: Omit<Client, 'id'>): Promise<Client> {
  try {
    const clientWithMeta = {
      ...clientData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(db, CLIENTS_COLLECTION), clientWithMeta);
    return { id: docRef.id, ...clientWithMeta };
  } catch (error) {
    console.error("Error al crear cliente:", error);
    throw error;
  }
}

/**
 * Obtener un cliente por ID
 * 
 * @param clientId - ID del cliente
 * @returns Cliente o null si no existe
 */
export async function getClientById(clientId: string): Promise<Client | null> {
  try {
    const docRef = doc(db, CLIENTS_COLLECTION, clientId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Client;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error al obtener cliente:", error);
    throw error;
  }
}

/**
 * Obtener todos los clientes
 * 
 * @returns Lista de clientes
 */
export async function getAllClients(): Promise<Client[]> {
  try {
    const q = query(collection(db, CLIENTS_COLLECTION), orderBy("nombre"));
    const querySnapshot = await getDocs(q);
    const clients: Client[] = [];
    
    querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      clients.push({ id: doc.id, ...doc.data() } as Client);
    });
    
    return clients;
  } catch (error) {
    console.error("Error al obtener todos los clientes:", error);
    throw error;
  }
}

/**
 * Actualizar un cliente
 * 
 * @param clientId - ID del cliente
 * @param clientData - Datos a actualizar
 * @returns Cliente actualizado
 */
export async function updateClient(clientId: string, clientData: Partial<Client>): Promise<Client> {
  try {
    const docRef = doc(db, CLIENTS_COLLECTION, clientId);
    
    const updates = {
      ...clientData,
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(docRef, updates);
    return { id: clientId, ...updates } as Client;
  } catch (error) {
    console.error("Error al actualizar cliente:", error);
    throw error;
  }
}

/**
 * Eliminar un cliente
 * 
 * @param clientId - ID del cliente
 * @returns true si se elimina correctamente
 */
export async function deleteClient(clientId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, CLIENTS_COLLECTION, clientId));
    return true;
  } catch (error) {
    console.error("Error al eliminar cliente:", error);
    throw error;
  }
}

/**
 * Agregar pedido al historial del cliente
 * 
 * @param clientId - ID del cliente
 * @param orderId - ID del pedido
 * @returns Resultado de la operación
 */
export async function addOrderToClientHistory(
  clientId: string, 
  orderId: string
): Promise<{clientId: string; orderId: string; orderHistory: {pedidoId: string; fecha: string}[]}> {
  try {
    const docRef = doc(db, CLIENTS_COLLECTION, clientId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error(`Cliente con ID ${clientId} no encontrado`);
    }
    
    const client = docSnap.data();
    const orderHistory = client.historialPedidos || [];
    
    // Agregar el nuevo pedido al historial
    orderHistory.push({
      pedidoId: orderId,
      fecha: new Date().toISOString()
    });
    
    // Actualizar el documento
    await updateDoc(docRef, {
      historialPedidos: orderHistory,
      updatedAt: serverTimestamp()
    });
    
    return {
      clientId,
      orderId,
      orderHistory
    };
  } catch (error) {
    console.error("Error al agregar pedido al historial del cliente:", error);
    throw error;
  }
}

/**
 * Buscar clientes por nombre
 * 
 * @param name - Nombre o parte del nombre a buscar
 * @returns Lista de clientes que coinciden
 */
export async function getClientsByName(name: string): Promise<Client[]> {
  try {
    // En Firestore no se pueden hacer consultas de "contiene" directamente.
    // Esta es una implementación simple que obtiene todos los clientes y filtra en memoria.
    // Para una aplicación a gran escala, considera usar algún servicio de búsqueda.
    
    const clients = await getAllClients();
    
    return clients.filter(client => 
      client.nombre.toLowerCase().includes(name.toLowerCase())
    );
  } catch (error) {
    console.error("Error al buscar clientes por nombre:", error);
    throw error;
  }
}