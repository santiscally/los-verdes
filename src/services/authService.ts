// src/services/authService.ts
import { auth, db } from '@/app/firebase/config';
import { 
  User, 
  UserCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, query, getDocs, serverTimestamp, DocumentData } from 'firebase/firestore';


// Tipos
interface UserData {
  email: string;
  nombre: string;
  rol?: string;
  telefono?: string;
  fechaCreacion?: any;
  fechaActualizacion?: any;
  [key: string]: any;
}

// Constantes
const USERS_COLLECTION = 'usuarios';

/**
 * Inicia sesión con correo y contraseña
 * 
 * @param email - Correo electrónico
 * @param password - Contraseña
 * @returns Objeto del usuario autenticado
 */
export async function login(email: string, password: string): Promise<UserCredential> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    throw error;
  }
}

/**
 * Registra un nuevo usuario
 * 
 * @param email - Correo electrónico
 * @param password - Contraseña
 * @param nombre - Nombre del usuario
 * @param rol - Rol del usuario (admin, operador)
 * @returns Objeto del usuario creado
 */
export async function register(
  email: string, 
  password: string, 
  nombre: string, 
  rol: string = 'operador'
): Promise<User> {
  try {
    // Crear usuario en autenticación
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Actualizar el perfil con el nombre
    await updateProfile(userCredential.user, {
      displayName: nombre
    });
    
    // Crear documento en Firestore con información adicional
    await setDoc(doc(db, USERS_COLLECTION, userCredential.user.uid), {
      email,
      nombre,
      rol,
      fechaCreacion: serverTimestamp(),
      fechaActualizacion: serverTimestamp()
    });
    
    return userCredential.user;
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    throw error;
  }
}

/**
 * Cierra la sesión del usuario actual
 */
export async function logout(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    throw error;
  }
}

/**
 * Obtiene los datos completos del usuario desde Firestore
 * 
 * @param uid - ID del usuario
 * @returns Datos completos del usuario o null si no existe
 */
export async function getUserData(uid: string): Promise<UserData | null> {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as UserData;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error al obtener datos del usuario:', error);
    throw error;
  }
}

/**
 * Actualiza los datos de un usuario
 * 
 * @param uid - ID del usuario
 * @param userData - Datos a actualizar
 * @returns Datos actualizados
 */
export async function updateUserData(uid: string, userData: Partial<UserData>): Promise<UserData> {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    
    // Añadir timestamp de actualización
    const updates = {
      ...userData,
      fechaActualizacion: serverTimestamp()
    };
    
    await updateDoc(docRef, updates);
    return { id: uid, ...updates } as UserData;
  } catch (error) {
    console.error('Error al actualizar datos del usuario:', error);
    throw error;
  }
}

/**
 * Envía un correo de restablecimiento de contraseña
 * 
 * @param email - Correo electrónico
 */
export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Error al enviar correo de restablecimiento:', error);
    throw error;
  }
}

/**
 * Obtiene todos los usuarios
 * 
 * @returns Lista de usuarios
 */
export async function getAllUsers(): Promise<UserData[]> {
  try {
    const q = query(collection(db, USERS_COLLECTION));
    const querySnapshot = await getDocs(q);
    const users: UserData[] = [];
    
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() } as UserData);
    });
    
    return users;
  } catch (error) {
    console.error('Error al obtener todos los usuarios:', error);
    throw error;
  }
}