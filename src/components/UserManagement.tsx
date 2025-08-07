'use client';

import React, { useState, useEffect } from 'react';
import type { User, NewUser } from '@/db/types';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newUser, setNewUser] = useState<Partial<NewUser>>({
    name: '',
    email: '',
    password: '',
    role: 'user',
  });

  // Cargar usuarios
  const loadUsers = async (query?: string) => {
    try {
      setLoading(true);
      const url = query ? `/api/users?q=${encodeURIComponent(query)}` : '/api/users';
      const response = await fetch(url);
      const result: ApiResponse<User[]> = await response.json();

      if (result.success && result.data) {
        setUsers(result.data);
      } else {
        setError(result.error || 'Error al cargar usuarios');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // Crear usuario
  const createUser = async (userData: NewUser) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const result: ApiResponse<User> = await response.json();

      if (result.success && result.data) {
        setUsers(prev => [result.data!, ...prev]);
        setNewUser({ name: '', email: '', password: '', role: 'user' });
        return true;
      } else {
        setError(result.error || 'Error al crear usuario');
        return false;
      }
    } catch (err) {
      setError('Error de conexión');
      return false;
    }
  };

  // Actualizar usuario
  const updateUser = async (id: number, userData: Partial<NewUser>) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const result: ApiResponse<User> = await response.json();

      if (result.success && result.data) {
        setUsers(prev => prev.map(user => user.id === id ? result.data! : user));
        return true;
      } else {
        setError(result.error || 'Error al actualizar usuario');
        return false;
      }
    } catch (err) {
      setError('Error de conexión');
      return false;
    }
  };

  // Eliminar usuario
  const deleteUser = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });

      const result: ApiResponse<null> = await response.json();

      if (result.success) {
        setUsers(prev => prev.filter(user => user.id !== id));
      } else {
        setError(result.error || 'Error al eliminar usuario');
      }
    } catch (err) {
      setError('Error de conexión');
    }
  };

  // Manejar búsqueda
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers(searchQuery);
  };

  // Manejar creación de usuario
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUser.name || !newUser.email || !newUser.password) {
      setError('Todos los campos son requeridos');
      return;
    }

    const success = await createUser(newUser as NewUser);
    if (success) {
      setError(null);
    }
  };

  // Cargar usuarios al montar el componente
  useEffect(() => {
    loadUsers();
  }, []);

  if (loading) {
    return <div className="text-center p-4">Cargando usuarios...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Gestión de Usuarios</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Formulario de búsqueda */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Buscar usuarios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Buscar
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              loadUsers();
            }}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Limpiar
          </button>
        </form>
      </div>

      {/* Formulario de creación */}
      <div className="mb-6 p-4 border border-gray-300 rounded">
        <h2 className="text-lg font-semibold mb-4">Crear Nuevo Usuario</h2>
        <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Nombre"
            value={newUser.name || ''}
            onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={newUser.email || ''}
            onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded"
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={newUser.password || ''}
            onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded"
            required
          />
          <select
            value={newUser.role || 'user'}
            onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded"
          >
            <option value="user">Usuario</option>
            <option value="admin">Administrador</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Crear Usuario
          </button>
        </form>
      </div>

      {/* Lista de usuarios */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 border">ID</th>
              <th className="px-4 py-2 border">Nombre</th>
              <th className="px-4 py-2 border">Email</th>
              <th className="px-4 py-2 border">Rol</th>
              <th className="px-4 py-2 border">Estado</th>
              <th className="px-4 py-2 border">Creado</th>
              <th className="px-4 py-2 border">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 border text-center">{user.id}</td>
                <td className="px-4 py-2 border">{user.name}</td>
                <td className="px-4 py-2 border">{user.email}</td>
                <td className="px-4 py-2 border text-center">
                  <span className={`px-2 py-1 rounded text-xs ${
                    user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-2 border text-center">
                  <span className={`px-2 py-1 rounded text-xs ${
                    user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-2 border text-center">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-4 py-2 border text-center">
                  <button
                    onClick={() => deleteUser(user.id)}
                    className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No se encontraron usuarios
        </div>
      )}
    </div>
  );
};

export default UserManagement; 