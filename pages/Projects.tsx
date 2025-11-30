import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ProjectType, Project, Task, TaskStatus, UserRole } from '../types';
import { Modal } from '../components/ui/Modal';
import { calculateEndDate, checkConflicts, SPECIALTY_COLORS } from '../constants';
import { estimateTaskDuration } from '../services/geminiService';

interface ProjectsProps {
  type: ProjectType;
}

export const Projects: React.FC<ProjectsProps> = ({ type }) => {
  const { projects, users, addProject, deleteProject, addTask, updateTask, deleteTask, currentUser } = useApp();
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  
  // Confirmation States
  const [deleteProjectConfirm, setDeleteProjectConfirm] = useState<string | null>(null);
  const [deleteTaskConfirm, setDeleteTaskConfirm] = useState<{pid: string, tid: string} | null>(null);

  // New Data States
  const [newProject, setNewProject] = useState<Partial<Project>>({ type, name: '', client: '' });
  
  const [newTask, setNewTask] = useState<Partial<Task>>({ 
    name: '', description: '', estimatedHours: 8, startDate: new Date().toISOString().split('T')[0], assignedUserIds: [] 
  });
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [isEstimating, setIsEstimating] = useState(false);

  // Filter projects by current tab type
  const filteredProjects = projects.filter(p => p.type === type);

  const handleCreateProject = async () => {
    if (!newProject.name || !newProject.client) return;
    try {
      await addProject({
        id: Date.now().toString(),
        name: newProject.name!,
        client: newProject.client!,
        type,
        tasks: []
      });
      setIsProjectModalOpen(false);
      setNewProject({ type, name: '', client: '' });
    } catch (error) {
      console.error('Error creating project', error);
    }
  };

  const executeDeleteProject = async () => {
    if (!deleteProjectConfirm) return;
    try {
      await deleteProject(deleteProjectConfirm);
      setDeleteProjectConfirm(null);
    } catch (error) {
      console.error('Error deleting project', error);
    }
  };

  const executeDeleteTask = async () => {
    if (!deleteTaskConfirm) return;
    try {
      await deleteTask(deleteTaskConfirm.pid, deleteTaskConfirm.tid);
      setDeleteTaskConfirm(null);
      setSelectedProjectId(null);
      setEditingTaskId(null);
    } catch (error) {
      console.error('Error deleting task', error);
    }
  };

  const handleAIEstimate = async () => {
    if (!newTask.description) return;
    setIsEstimating(true);
    const hours = await estimateTaskDuration(newTask.description, type);
    setNewTask(prev => ({ ...prev, estimatedHours: hours }));
    setIsEstimating(false);
  };

  const handleEditTask = (task: Task) => {
    setSelectedProjectId(task.projectId);
    setEditingTaskId(task.id);
    setNewTask({
      name: task.name,
      description: task.description,
      estimatedHours: task.estimatedHours,
      startDate: task.startDate,
      assignedUserIds: [...task.assignedUserIds],
    });
    // Clear previous conflicts to avoid stale state
    setConflicts([]);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async () => {
    if (!selectedProjectId || !newTask.name) return;

    // Calculate duration
    const numWorkers = newTask.assignedUserIds?.length || 1;
    const endDate = calculateEndDate(newTask.startDate!, newTask.estimatedHours!, numWorkers);

    try {
      if (editingTaskId) {
        const project = projects.find(p => p.id === selectedProjectId);
        const originalTask = project?.tasks.find(t => t.id === editingTaskId);

        if (originalTask) {
          const updatedTask: Task = {
            ...originalTask,
            name: newTask.name!,
            description: newTask.description || '',
            startDate: newTask.startDate!,
            estimatedHours: newTask.estimatedHours!,
            assignedUserIds: newTask.assignedUserIds || [],
            endDate: endDate,
          };
          await updateTask(selectedProjectId, updatedTask);
        }
      } else {
        const task: Task = {
          id: Date.now().toString(),
          projectId: selectedProjectId,
          name: newTask.name!,
          description: newTask.description || '',
          startDate: newTask.startDate!,
          estimatedHours: newTask.estimatedHours!,
          assignedUserIds: newTask.assignedUserIds || [],
          status: TaskStatus.PENDING,
          endDate: endDate
        };
        await addTask(selectedProjectId, task);
      }
      setIsTaskModalOpen(false);
      setSelectedProjectId(null);
      setEditingTaskId(null);
      resetTaskForm();
    } catch (error) {
      console.error('Error saving task', error);
    }
  };

  const resetTaskForm = () => {
    setNewTask({ name: '', description: '', estimatedHours: 8, startDate: new Date().toISOString().split('T')[0], assignedUserIds: [] });
    setConflicts([]);
    setEditingTaskId(null);
  };

  const handleWorkerToggle = (userId: string) => {
    const current = newTask.assignedUserIds || [];
    const updated = current.includes(userId) ? current.filter(id => id !== userId) : [...current, userId];
    
    // Check conflicts immediately
    const endDate = calculateEndDate(newTask.startDate!, newTask.estimatedHours!, updated.length || 1);
    
    // Pass editingTaskId to ignore self-conflicts
    const conflictingUsers = updated.filter(uid => checkConflicts(uid, newTask.startDate!, endDate, projects, editingTaskId || undefined));
    
    const conflictNames = users.filter(u => conflictingUsers.includes(u.id)).map(u => u.name);
    setConflicts(conflictNames);

    setNewTask({ ...newTask, assignedUserIds: updated });
  };

  const handleStatusChange = async (projectId: string, task: Task, newStatus: TaskStatus) => {
      const updatedTask = { ...task, status: newStatus };
      await updateTask(projectId, updatedTask);
  };

  return (
    <div className="p-6">
       <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de {type}s</h1>
        {currentUser?.role === UserRole.MASTER && (
          <button 
            onClick={() => setIsProjectModalOpen(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            + Nueva {type}
          </button>
        )}
      </div>

      <div className="space-y-8">
        {filteredProjects.map(project => (
          <div key={project.id} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{project.name}</h2>
                <p className="text-sm text-gray-500">Cliente: {project.client}</p>
              </div>
              {currentUser?.role === UserRole.MASTER && (
                <div className="flex items-center space-x-2">
                    <button 
                    onClick={() => { setSelectedProjectId(project.id); setIsTaskModalOpen(true); }}
                    className="text-sm bg-white border border-gray-300 px-3 py-1 rounded hover:bg-gray-50 text-indigo-600 font-medium"
                    >
                    + Paquete de Trabajo
                    </button>
                    <button 
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setDeleteProjectConfirm(project.id);
                        }}
                        className="text-red-500 hover:bg-red-50 p-2 rounded border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                        title="Eliminar Proyecto Completo"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
              )}
            </div>
            
            <div className="p-6">
              {project.tasks.length === 0 ? (
                <p className="text-gray-400 italic">No hay tareas asignadas. Crea paquetes de trabajo.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarea</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fechas</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Horas Est.</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operarios</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {project.tasks.map(task => (
                        <tr key={task.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-bold text-gray-900">{task.name}</div>
                            <div className="text-sm text-gray-500">{task.description}</div>
                            {task.observations && <div className="text-xs text-red-600 mt-1 font-medium bg-red-50 p-1 rounded">Obs: {task.observations}</div>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className="block text-xs text-gray-400">Inicio:</span> {task.startDate}
                            <span className="block text-xs text-gray-400 mt-1">Fin:</span> {task.endDate}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                            {task.estimatedHours}h
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              {task.assignedUserIds.length === 0 && <span className="text-xs text-gray-400 italic">Sin asignar</span>}
                              {task.assignedUserIds.map(uid => {
                                const user = users.find(u => u.id === uid);
                                if (!user) return null;
                                const colors = user.specialty ? SPECIALTY_COLORS[user.specialty] : SPECIALTY_COLORS['Montador'];
                                return (
                                  <div key={uid} className="flex items-center space-x-2 bg-gray-50 px-2 py-1 rounded-full w-max border border-gray-100">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${colors?.bg || 'bg-gray-200'} ${colors?.text || 'text-gray-800'} ring-1 ring-black/5`}>
                                      {user.name.charAt(0)}
                                    </div>
                                    <span className="text-sm text-gray-700 font-medium">{user.name}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {currentUser?.role === UserRole.MASTER ? (
                                <div className="flex items-center space-x-3">
                                  <select 
                                    value={task.status}
                                    onChange={(e) => handleStatusChange(project.id, task, e.target.value as TaskStatus)}
                                    className={`text-sm border rounded p-1 max-w-[100px] font-medium ${
                                        task.status === TaskStatus.COMPLETED ? 'text-green-700 border-green-200 bg-green-50' : 
                                        task.status === TaskStatus.PENDING ? 'text-yellow-700 border-yellow-200 bg-yellow-50' : 'text-blue-700 border-blue-200 bg-blue-50'
                                    }`}
                                  >
                                    {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                  <div className="flex items-center border-l pl-3 space-x-1">
                                    <button 
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleEditTask(task); }}
                                        className="text-gray-400 hover:text-indigo-600 p-1.5 rounded hover:bg-indigo-50 transition-colors"
                                        title="Editar Tarea"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteTaskConfirm({ pid: project.id, tid: task.id });
                                        }}
                                        className="text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                        title="Eliminar Tarea"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                  </div>
                                </div>
                            ) : (
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${task.status === TaskStatus.COMPLETED ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                  {task.status}
                                </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Project Modal */}
      <Modal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} title={`Nueva ${type}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre del Proyecto</label>
            <input type="text" className="w-full border p-2 rounded" value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Cliente</label>
            <input type="text" className="w-full border p-2 rounded" value={newProject.client} onChange={e => setNewProject({...newProject, client: e.target.value})} />
          </div>
          <button onClick={handleCreateProject} className="w-full bg-indigo-600 text-white py-2 rounded">Crear</button>
        </div>
      </Modal>

      {/* Task Modal */}
      <Modal isOpen={isTaskModalOpen} onClose={() => { setIsTaskModalOpen(false); resetTaskForm(); }} title={editingTaskId ? "Editar Paquete de Trabajo" : "Nuevo Paquete de Trabajo"}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre Tarea</label>
            <input type="text" className="w-full border p-2 rounded" value={newTask.name} onChange={e => setNewTask({...newTask, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Descripción</label>
            <textarea className="w-full border p-2 rounded h-20" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
            <button 
              type="button"
              onClick={handleAIEstimate}
              disabled={isEstimating || !newTask.description}
              className="mt-2 text-xs text-indigo-600 flex items-center hover:text-indigo-800 disabled:opacity-50"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              {isEstimating ? 'Calculando...' : 'Estimar horas con IA'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-sm font-medium text-gray-700">Horas Estimadas</label>
               <input type="number" className="w-full border p-2 rounded" value={newTask.estimatedHours} onChange={e => setNewTask({...newTask, estimatedHours: parseInt(e.target.value) || 0})} />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700">Fecha Inicio</label>
               <input type="date" className="w-full border p-2 rounded" value={newTask.startDate} onChange={e => setNewTask({...newTask, startDate: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Asignar Operarios</label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto border p-2 rounded bg-gray-50">
              {users.filter(u => u.role !== UserRole.MASTER).map(user => {
                 const isAssigned = newTask.assignedUserIds?.includes(user.id);
                 return (
                    <label key={user.id} className={`flex items-center space-x-3 text-sm p-2 rounded cursor-pointer transition-colors ${isAssigned ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-white border border-transparent'}`}>
                    <input 
                        type="checkbox" 
                        checked={isAssigned}
                        onChange={() => handleWorkerToggle(user.id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                        <span className="font-medium text-gray-900">{user.name}</span>
                        <div className="text-xs text-gray-500">{user.specialty}</div>
                    </div>
                    </label>
                 );
              })}
            </div>
            {conflicts.length > 0 && (
              <div className="mt-2 p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
                <strong>¡Atención! Solape detectado:</strong>
                <p>{conflicts.join(', ')} tienen otras tareas asignadas en este periodo.</p>
              </div>
            )}
          </div>

          <button onClick={handleSaveTask} className="w-full bg-indigo-600 text-white py-2 rounded mt-4 hover:bg-indigo-700 transition-colors">
            {editingTaskId ? 'Guardar Cambios' : 'Crear Tarea'}
          </button>
        </div>
      </Modal>

      {/* Delete Project Modal */}
      <Modal isOpen={!!deleteProjectConfirm} onClose={() => setDeleteProjectConfirm(null)} title="Eliminar Proyecto">
        <div className="space-y-4">
            <p className="text-gray-600">¿Estás seguro de que quieres eliminar este proyecto y todas sus tareas asociadas?</p>
            <div className="flex justify-end space-x-3 pt-2">
                <button onClick={() => setDeleteProjectConfirm(null)} className="px-4 py-2 border rounded text-gray-600">Cancelar</button>
                <button onClick={executeDeleteProject} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Eliminar</button>
            </div>
        </div>
      </Modal>

      {/* Delete Task Modal */}
      <Modal isOpen={!!deleteTaskConfirm} onClose={() => setDeleteTaskConfirm(null)} title="Eliminar Tarea">
        <div className="space-y-4">
            <p className="text-gray-600">¿Estás seguro de que quieres eliminar este paquete de trabajo permanentemente?</p>
            <div className="flex justify-end space-x-3 pt-2">
                <button onClick={() => setDeleteTaskConfirm(null)} className="px-4 py-2 border rounded text-gray-600">Cancelar</button>
                <button onClick={executeDeleteTask} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Eliminar</button>
            </div>
        </div>
      </Modal>
    </div>
  );
};
