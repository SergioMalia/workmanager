import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ProjectType, TaskStatus, UserRole, Project } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const Dashboard: React.FC = () => {
  const { projects, users, materials, currentUser } = useApp();

  if (!currentUser) return null;

  const isOperario = currentUser.role === UserRole.OPERARIO;

  // Use Memo to ensure calculations recalculate exactly when dependencies change
  const stats = useMemo(() => {
    // 1. Tasks Logic
    const allSystemTasks = projects.flatMap(p => p.tasks);
    
    // Filter tasks relevant to the current view
    const relevantTasks = isOperario 
      ? allSystemTasks.filter(t => t.assignedUserIds.includes(currentUser.id))
      : allSystemTasks;

    const pendingTasksCount = relevantTasks.filter(t => t.status === TaskStatus.PENDING).length;
    const inProgressTasksCount = relevantTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
    const completedTasksCount = relevantTasks.filter(t => t.status === TaskStatus.REVIEWED || t.status === TaskStatus.COMPLETED).length;

    // 2. Projects Logic
    // Revised Logic: A project is Active ONLY if it has tasks that are Pending or In Progress.
    // If all tasks are Completed (by worker) or Reviewed (by master), the project is considered closed/inactive.
    const isProjectActive = (p: Project) => {
        if (p.tasks.length === 0) return true; // New project with no tasks is "Open/Active"
        
        // Check if ANY task is still unfinished
        const hasUnfinishedTasks = p.tasks.some(t => 
            t.status === TaskStatus.PENDING || 
            t.status === TaskStatus.IN_PROGRESS
        );

        return hasUnfinishedTasks;
    };

    let relevantProjects = projects;
    
    if (isOperario) {
        // For Operario: Project is relevant if they have EVER been assigned a task in it
        relevantProjects = projects.filter(p => 
            p.tasks.some(t => t.assignedUserIds.includes(currentUser.id))
        );
    }

    const activeAveriasCount = relevantProjects.filter(p => p.type === ProjectType.AVERIA && isProjectActive(p)).length;
    const activeObrasCount = relevantProjects.filter(p => p.type === ProjectType.OBRA && isProjectActive(p)).length;

    // 3. Materials Logic
    let relevantMaterials = materials;

    if (isOperario) {
        // "Material Pendiente" usually refers to "Requests I made that are not ready"
        relevantMaterials = materials.filter(m => m.requestedByUserId === currentUser.id);
    }

    const pendingMaterialsCount = relevantMaterials.filter(m => m.status !== 'Listo').length;

    return {
        pendingTasks: pendingTasksCount,
        inProgressTasks: inProgressTasksCount,
        completedTasks: completedTasksCount,
        activeAverias: activeAveriasCount,
        activeObras: activeObrasCount,
        pendingMaterials: pendingMaterialsCount,
        allTasks: allSystemTasks
    };
  }, [projects, materials, currentUser, isOperario]);

  // Chart Data - DIRECTLY linked to stats object to ensure correlation
  const chartData = [
    { name: 'Pendientes', value: stats.pendingTasks },
    { name: 'En Curso', value: stats.inProgressTasks },
    { name: 'Completadas', value: stats.completedTasks },
  ];

  const COLORS = ['#FBBF24', '#3B82F6', '#10B981'];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard General</h1>
        <div className="mt-2 md:mt-0 px-4 py-2 bg-blue-50 text-blue-800 rounded-full font-medium border border-blue-100 flex items-center shadow-sm">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            Hola, {currentUser.name}
        </div>
      </div>
      
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
          <h3 className="text-gray-500 text-sm font-medium">{isOperario ? 'Mis Averías Activas' : 'Averías Activas'}</h3>
          <p className="text-3xl font-bold text-gray-800">{stats.activeAverias}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <h3 className="text-gray-500 text-sm font-medium">{isOperario ? 'Mis Obras Activas' : 'Obras Activas'}</h3>
          <p className="text-3xl font-bold text-gray-800">{stats.activeObras}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <h3 className="text-gray-500 text-sm font-medium">{isOperario ? 'Mis Tareas Pendientes' : 'Tareas Pendientes'}</h3>
          <p className="text-3xl font-bold text-gray-800">{stats.pendingTasks}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <h3 className="text-gray-500 text-sm font-medium">{isOperario ? 'Mis Solicitudes Material' : 'Material Pendiente'}</h3>
          <p className="text-3xl font-bold text-gray-800">{stats.pendingMaterials}</p>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${isOperario ? '' : 'lg:grid-cols-2'} gap-6`}>
        {/* Task Status Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold text-gray-800 mb-4">{isOperario ? 'Estado de Mis Tareas' : 'Estado Global de Tareas'}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Worker Availability (Only for MASTER) */}
        {!isOperario && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Personal Disponible Hoy</h3>
            <div className="space-y-4 overflow-y-auto h-64 pr-2">
              {users.filter(u => u.role !== 'MASTER').map(user => {
                 // Check if user is assigned to any active task today
                 const isBusy = stats.allTasks.some(t => 
                   t.assignedUserIds.includes(user.id) && 
                   t.status === TaskStatus.IN_PROGRESS
                 );
                 return (
                   <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                     <div className="flex items-center">
                       <div className={`w-3 h-3 rounded-full mr-3 ${isBusy ? 'bg-red-500' : 'bg-green-500'}`}></div>
                       <span className="font-medium text-gray-700">{user.name}</span>
                       <span className="text-xs text-gray-500 ml-2">({user.specialty})</span>
                     </div>
                     <span className={`text-xs px-2 py-1 rounded font-medium ${isBusy ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                       {isBusy ? 'Ocupado' : 'Disponible'}
                     </span>
                   </div>
                 );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
