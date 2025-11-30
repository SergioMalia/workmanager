import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TaskStatus, MaterialStatus, Specialty } from '../types';
import { Modal } from '../components/ui/Modal';

export const MyTasks: React.FC = () => {
  const { projects, users, currentUser, updateTask, addMaterialRequest, materials, updateMaterialRequest } = useApp();
  const [selectedTaskForMaterial, setSelectedTaskForMaterial] = useState<{pid: string, tid: string} | null>(null);
  const [materialItems, setMaterialItems] = useState('');
  const [observation, setObservation] = useState('');
  const [obsTask, setObsTask] = useState<{pid: string, tid: string} | null>(null);

  if (!currentUser) return null;

  // 1. PROJECT TASKS
  const myTasks = projects.flatMap(p => 
    p.tasks
      .filter(t => t.assignedUserIds.includes(currentUser.id))
      .map(t => ({ ...t, projectName: p.name, projectId: p.id, client: p.client }))
  );
  const activeTasks = myTasks.filter(t => t.status !== TaskStatus.REVIEWED);

  // 2. WAREHOUSE TASKS (If user is ALMACEN specialty)
  const isWarehouseUser = currentUser.specialty === Specialty.ALMACEN;
  const myMaterialRequests = materials.filter(m => m.handledByUserId === currentUser.id);

  // Helper for Warehouse Reassignment
  const availableWarehouseWorkers = users.filter(u => u.specialty === Specialty.ALMACEN && u.id !== currentUser.id);

  const handleStatusUpdate = async (pid: string, task: any, status: TaskStatus) => {
    await updateTask(pid, { ...task, status });
  };

  const handleRequestMaterial = async () => {
    if (selectedTaskForMaterial && materialItems) {
      await addMaterialRequest({
        id: Date.now().toString(),
        taskId: selectedTaskForMaterial.tid,
        projectId: selectedTaskForMaterial.pid,
        requestedByUserId: currentUser.id,
        items: materialItems.split('\n').filter(i => i.trim() !== ''),
        status: MaterialStatus.PENDING,
        createdAt: new Date().toISOString()
      });
      setSelectedTaskForMaterial(null);
      setMaterialItems('');
    }
  };

  const handleAddObservation = async () => {
    if (obsTask) {
        const p = projects.find(proj => proj.id === obsTask.pid);
        const t = p?.tasks.find(tk => tk.id === obsTask.tid);
        if (t) {
            await updateTask(obsTask.pid, { ...t, observations: observation });
        }
        setObsTask(null);
        setObservation('');
    }
  };

  const handleMaterialStatusChange = async (req: any, status: MaterialStatus) => {
    await updateMaterialRequest({ ...req, status });
  };

  const handleReassignMaterial = async (req: any, newUserId: string) => {
    if (!newUserId) return;
    await updateMaterialRequest({ ...req, handledByUserId: newUserId });
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
        <h1 className="text-3xl font-bold text-gray-800">Mis Tareas Asignadas</h1>
        <div className="mt-2 md:mt-0 px-4 py-2 bg-blue-50 text-blue-800 rounded-full font-medium border border-blue-100 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            Hola, {currentUser.name}
        </div>
      </div>
      
      {/* WAREHOUSE SECTION */}
      {isWarehouseUser && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-emerald-900 mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                Mis Pedidos de Material en Curso
            </h2>
            {myMaterialRequests.length === 0 ? (
                <p className="text-emerald-700 italic">No tienes pedidos asignados actualmente. Ve a "Almacén" para aceptar nuevos pedidos.</p>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {myMaterialRequests.map(req => {
                        const project = projects.find(p => p.id === req.projectId);
                        const user = users.find(u => u.id === req.requestedByUserId);
                        return (
                            <div key={req.id} className="bg-white p-4 rounded shadow-sm border border-emerald-100">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-gray-800">{project?.name} - {project?.client}</h3>
                                        <p className="text-sm text-gray-500">Solicitante: {user?.name}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <select 
                                            value={req.status}
                                            onChange={(e) => handleMaterialStatusChange(req, e.target.value as MaterialStatus)}
                                            className={`text-sm px-2 py-1 rounded border ${
                                                req.status === MaterialStatus.READY ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                            }`}
                                        >
                                            <option value={MaterialStatus.PREPARING}>En Preparación</option>
                                            <option value={MaterialStatus.READY}>Listo</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-2 rounded text-sm mb-3">
                                    <ul className="list-disc list-inside">
                                        {req.items.map((item: string, idx: number) => <li key={idx}>{item}</li>)}
                                    </ul>
                                </div>
                                <div className="flex justify-end pt-2 border-t">
                                     <div className="flex items-center space-x-2">
                                         <label className="text-xs text-gray-400">Reasignar a:</label>
                                         <select 
                                            className="text-xs border rounded p-1 bg-gray-50 hover:bg-white transition-colors"
                                            onChange={(e) => handleReassignMaterial(req, e.target.value)}
                                            value=""
                                         >
                                             <option value="" disabled>Seleccionar compañero...</option>
                                             {availableWarehouseWorkers.map(w => (
                                                 <option key={w.id} value={w.id}>{w.name}</option>
                                             ))}
                                         </select>
                                     </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
      )}

      {/* REGULAR TASKS SECTION */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Paquetes de Trabajo</h2>
        {activeTasks.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-lg shadow">
                <p className="text-gray-500 text-lg">No tienes tareas pendientes. ¡Buen trabajo!</p>
            </div>
        ) : (
            <div className="space-y-6">
            {activeTasks.map(task => (
                <div key={task.id} className="bg-white rounded-lg shadow-md border-l-4 border-blue-500 overflow-hidden">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">{task.name}</h2>
                            <p className="text-sm text-gray-500">{task.projectName} - {task.client}</p>
                        </div>
                        
                        <div className="flex flex-col items-end">
                            <label className="text-xs text-gray-400 mb-1">Estado Tarea</label>
                            <select 
                                value={task.status}
                                onChange={(e) => handleStatusUpdate(task.projectId, task, e.target.value as TaskStatus)}
                                className={`px-3 py-1 text-sm font-semibold rounded cursor-pointer outline-none border transition-colors ${
                                    task.status === TaskStatus.PENDING ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                    task.status === TaskStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-800 border-blue-200' : 
                                    'bg-green-100 text-green-800 border-green-200'
                                }`}
                            >
                                <option value={TaskStatus.PENDING}>Pendiente</option>
                                <option value={TaskStatus.IN_PROGRESS}>En Curso</option>
                                <option value={TaskStatus.COMPLETED}>Completado</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="mb-4 bg-gray-50 p-3 rounded text-gray-700">
                        {task.description}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-6">
                        <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            Inicio: {task.startDate}
                        </div>
                        <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Est: {task.estimatedHours}h
                        </div>
                        <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            Compañeros: {task.assignedUserIds.length - 1}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 border-t pt-4">
                        <button 
                            onClick={() => setSelectedTaskForMaterial({ pid: task.projectId, tid: task.id })}
                            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 flex items-center"
                        >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            Pedir Material
                        </button>

                        <button 
                            onClick={() => { setObsTask({ pid: task.projectId, tid: task.id }); setObservation(task.observations || ''); }}
                            className="text-gray-500 hover:text-gray-700 px-4 py-2"
                        >
                            {task.observations ? 'Editar Observaciones' : 'Añadir Observación / Retraso'}
                        </button>
                    </div>
                </div>
                </div>
            ))}
            </div>
        )}
      </div>

      {/* Material Modal */}
      <Modal isOpen={!!selectedTaskForMaterial} onClose={() => setSelectedTaskForMaterial(null)} title="Solicitud de Material">
        <div className="space-y-4">
            <p className="text-sm text-gray-500">Lista los materiales necesarios (uno por línea).</p>
            <textarea 
                className="w-full border p-2 rounded h-32" 
                value={materialItems}
                onChange={e => setMaterialItems(e.target.value)}
                placeholder="- 50m Cable 2.5mm&#10;- 10 Cajas registro"
            ></textarea>
            <button onClick={handleRequestMaterial} className="w-full bg-blue-600 text-white py-2 rounded">Enviar Solicitud al Almacén</button>
        </div>
      </Modal>

      {/* Observation Modal */}
      <Modal isOpen={!!obsTask} onClose={() => setObsTask(null)} title="Observaciones / Incidencias">
         <div className="space-y-4">
            <textarea 
                className="w-full border p-2 rounded h-32"
                value={observation}
                onChange={e => setObservation(e.target.value)}
                placeholder="Explica la incidencia o motivo del retraso..."
            ></textarea>
            <button onClick={handleAddObservation} className="w-full bg-red-600 text-white py-2 rounded">Guardar Incidencia</button>
         </div>
      </Modal>
    </div>
  );
};
