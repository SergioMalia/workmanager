import React from 'react';
import { useApp } from '../context/AppContext';
import { MaterialStatus, UserRole, Specialty } from '../types';

export const Warehouse: React.FC = () => {
  const { materials, projects, users, updateMaterialRequest, currentUser } = useApp();

  // Combine data for display
  const enrichedRequests = materials.map(req => {
    const project = projects.find(p => p.id === req.projectId);
    const task = project?.tasks.find(t => t.id === req.taskId);
    const user = users.find(u => u.id === req.requestedByUserId);
    const handler = users.find(u => u.id === req.handledByUserId);
    return { 
        ...req, 
        projectName: project?.name, 
        client: project?.client, 
        taskName: task?.name, 
        userName: user?.name,
        handlerName: handler?.name 
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // FILTER LOGIC:
  // 1. Show requests that are NOT handled by anyone yet.
  // 2. OR show requests that are Pending (just in case).
  // 3. HIDE requests that are already assigned (handledByUserId is present).
  const visibleRequests = enrichedRequests.filter(req => !req.handledByUserId);

  const handleStatusChange = async (req: any, newStatus: MaterialStatus) => {
    await updateMaterialRequest({ ...req, status: newStatus });
  };

  const handleAcceptRequest = async (req: any) => {
    if (!currentUser) return;
    await updateMaterialRequest({
        ...req,
        status: MaterialStatus.PREPARING,
        handledByUserId: currentUser.id
    });
  };

  const getStatusColor = (status: MaterialStatus) => {
    switch (status) {
        case MaterialStatus.PENDING: return 'bg-red-100 text-red-800 border-red-200';
        case MaterialStatus.PREPARING: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case MaterialStatus.READY: return 'bg-green-100 text-green-800 border-green-200';
        default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Check if current user can edit warehouse status (Master or Warehouse Operator)
  const canEdit = currentUser?.role === UserRole.MASTER || currentUser?.specialty === Specialty.ALMACEN;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Gestión de Almacén - Solicitudes Pendientes</h1>

      <div className="grid grid-cols-1 gap-6">
        {visibleRequests.map(req => (
          <div key={req.id} className="bg-white rounded-lg shadow border-l-4 border-emerald-500 overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div>
                   <h2 className="text-lg font-bold text-gray-800">{req.client} - {req.projectName}</h2>
                   <p className="text-gray-600 text-sm">Tarea: {req.taskName}</p>
                   <p className="text-gray-500 text-xs mt-1">Solicitado por: {req.userName} - {new Date(req.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-col items-end space-y-2">
                    {/* "Accept" Button for Pending Requests */}
                    {canEdit && (
                        <button 
                            onClick={() => handleAcceptRequest(req)}
                            className="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded shadow hover:bg-indigo-700 transition-colors flex items-center mb-1"
                        >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Aceptar Pedido
                        </button>
                    )}

                    <div className="flex flex-col items-end">
                        <label className="text-xs text-gray-400 mb-1">Estado</label>
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full border text-center min-w-[120px] ${getStatusColor(req.status)}`}>
                            {req.status}
                        </span>
                    </div>
                </div>
              </div>

              <div className="mt-4 bg-gray-50 p-4 rounded border border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 mb-2">Materiales Solicitados:</h3>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    {req.items.map((item: string, idx: number) => (
                        <li key={idx}>{item}</li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        ))}

        {visibleRequests.length === 0 && (
            <div className="text-center py-10 bg-white rounded shadow">
                <p className="text-gray-500">No hay nuevas solicitudes de material en la cola.</p>
                {canEdit && <p className="text-sm text-gray-400 mt-2">Revisa "Mis Tareas" para ver tus pedidos en curso.</p>}
            </div>
        )}
      </div>
    </div>
  );
};
