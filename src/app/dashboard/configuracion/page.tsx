'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserData, updateUserData, resetPassword } from '@/services/authService';

interface UserData {
  id?: string;
  nombre?: string;
  email?: string;
  telefono?: string;
  rol?: string;
}

export default function ConfiguracionPage() {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [passwordResetSent, setPasswordResetSent] = useState<boolean>(false);

  // Cargar datos del usuario
  useEffect(() => {
    if (currentUser) {
      loadUserData();
    }
  }, [currentUser]);

  // Función para cargar datos del usuario
  async function loadUserData() {
    try {
      setLoading(true);
      if (currentUser?.uid) {
        const data = await getUserData(currentUser.uid);
        setUserData(data);
      }
      setError(null);
    } catch (err) {
      console.error('Error al cargar datos del usuario:', err);
      setError('Error al cargar los datos del usuario. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  // Función para manejar cambios en el formulario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserData((prev) => prev ? { ...prev, [name]: value } : null);
  };

  // Función para guardar cambios
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      if (currentUser?.uid && userData) {
        await updateUserData(currentUser.uid, {
          nombre: userData.nombre,
          telefono: userData.telefono
        });
      }
      
      setSuccess('Datos actualizados correctamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error al actualizar datos:', err);
      setError('Error al actualizar los datos. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Función para solicitar cambio de contraseña
  const handlePasswordReset = async () => {
    try {
      setLoading(true);
      if (currentUser?.email) {
        await resetPassword(currentUser.email);
        setPasswordResetSent(true);
        setSuccess('Se ha enviado un correo para restablecer tu contraseña');
        setTimeout(() => setSuccess(null), 5000);
      }
    } catch (err) {
      console.error('Error al solicitar cambio de contraseña:', err);
      setError('Error al solicitar el cambio de contraseña. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !userData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Configuración de Usuario</h1>
        <p className="text-center py-4">Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Configuración de Usuario</h1>
      
      {/* Mensajes de estado */}
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{success}</span>
        </div>
      )}
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Información de la Cuenta</h2>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-1">Correo electrónico:</p>
          <p className="font-medium">{currentUser?.email}</p>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-1">Rol:</p>
          <p className="font-medium">{userData?.rol || 'Usuario'}</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nombre">
              Nombre completo
            </label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={userData?.nombre || ''}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="telefono">
              Teléfono (opcional)
            </label>
            <input
              type="text"
              id="telefono"
              name="telefono"
              value={userData?.telefono || ''}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Seguridad</h2>
        
        <div className="mb-4">
          <p className="text-gray-600 mb-2">Cambiar contraseña:</p>
          {passwordResetSent ? (
            <p className="text-green-600">
              Se ha enviado un correo a {currentUser?.email} con instrucciones para cambiar tu contraseña.
            </p>
          ) : (
            <button
              onClick={handlePasswordReset}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              {loading ? 'Enviando...' : 'Solicitar cambio de contraseña'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}