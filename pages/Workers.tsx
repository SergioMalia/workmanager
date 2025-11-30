import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Specialty, UserRole, User } from '../types';
import { SPECIALTY_COLORS } from '../constants';
import { Modal } from '../components/ui/Modal';

export const Workers: React.FC = () => {
  const { users, addUser, deleteUser, currentUser } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({ role: UserRole.OPERARIO, specialty: Specialty.MONTADOR });
  
  // Confirmation Modal State
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);

  const handleCreate = async () => {
    if (newUser.name && newUser.username && newUser.password) {
      await addUser({
        id: Date.now().toString(),
        name: newUser.name,
        username: newUser.username,
        password: newUser.password,
        role: newUser.role as UserRole,
        specialty: newUser.role === UserRole.OPERARIO ? newUser.specialty : undefined,
      });
      setIsModalOpen(false);
      setNewUser({ role: UserRole.OPERARIO, specialty: Specialty.MONTADOR, name: '', username: '', password: '' });
    }
  };

  const confirmDelete = async () => {
    if (deleteConfirmation) {
      await deleteUser(deleteConfirmation);
      setDeleteConfirmation(null);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Personal y Operarios</h1>
        {currentUser?.role === UserRole.MASTER && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center transition-colors shadow-sm"
          >
            <span className="text-xl mr-2">+</span> Añadir Operario
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.filter(u => u.role !== UserRole.MASTER).map(user => {
          const colors = user.specialty ? SPECIALTY_COLORS[user.specialty] : SPECIALTY_COLORS[Specialty.MONTADOR];
          return (
            <div key={user.id} className={`bg-white p-6 rounded-lg shadow-md border-t-8 flex flex-col`} style={{ borderColor: colors?.hex || '#ccc' }}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 leading-tight">{user.name}</h3>
                  <p className="text-sm text-gray-400 mt-1">ID: {user.username}</p>
                </div>
                {currentUser?.role === UserRole.MASTER && (
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmation(user.id);
                    }}
                    className="text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 p-2 rounded-full transition-colors ml-2"
                    title="Eliminar Operario"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
              </div>
              
              <div className="mt-2 flex items-center justify-between">
                {user.specialty && (
                  <span className={`px-3 py-1 text-xs rounded-full font-bold uppercase tracking-wide border ${colors?.bg} ${colors?.text} ${colors?.border}`}>
                    {user.specialty}
                  </span>
                )}
              </div>
              
              <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center text-sm text-gray-500">
                <span>Contraseña: ****</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">Rol: {user.role}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create User Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Añadir Nuevo Operario">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
            <input type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej: Juan Pérez" value={newUser.name || ''} onChange={e => setNewUser({...newUser, name: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-sm font-medium text-gray-700">Usuario Acceso</label>
               <input type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="ej: juanp" value={newUser.username || ''} onChange={e => setNewUser({...newUser, username: e.target.value})} />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700">Contraseña</label>
               <input type="password" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" value={newUser.password || ''} onChange={e => setNewUser({...newUser, password: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Especialidad</label>
            <select 
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" 
              value={newUser.specialty} 
              onChange={e => setNewUser({...newUser, specialty: e.target.value as Specialty})}
            >
              {Object.values(Specialty).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end pt-4">
            <button onClick={handleCreate} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors shadow-sm">Guardar</button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteConfirmation} onClose={() => setDeleteConfirmation(null)} title="Confirmar Eliminación">
        <div className="space-y-4">
          <p className="text-gray-600">¿Estás seguro de que deseas eliminar a este operario? Esta acción no se puede deshacer.</p>
          <div className="flex justify-end space-x-3 pt-2">
            <button 
              onClick={() => setDeleteConfirmation(null)}
              className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button 
              onClick={confirmDelete}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Eliminar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
