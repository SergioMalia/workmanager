import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SPECIALTY_COLORS } from '../constants';
import { Project } from '../types';

export const Timeline: React.FC = () => {
  const { projects, users } = useApp();
  // All projects expanded by default for better visibility, but state allows toggle
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(projects.map(p => p.id)));

  // Generate date range for the next 30 days
  const today = new Date();
  const dates = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  const toggleProject = (projectId: string) => {
    const newSet = new Set(expandedProjects);
    if (newSet.has(projectId)) {
        newSet.delete(projectId);
    } else {
        newSet.add(projectId);
    }
    setExpandedProjects(newSet);
  };

  const getGridColumn = (startDateStr: string, endDateStr: string) => {
    if (!startDateStr || !endDateStr) return null;
    
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    
    // Normalize
    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);
    const base = new Date(today);
    base.setHours(0,0,0,0);

    const diffStart = Math.ceil((start.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
    const diffDur = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (diffStart + diffDur < 0 || diffStart > 30) return null;

    const gridStart = Math.max(1, diffStart + 1);
    const gridSpan = Math.min(30 - diffStart, diffDur);

    if (gridSpan <= 0) return null;

    return { gridColumn: `${gridStart} / span ${gridSpan}` };
  };

  // Helper to get total duration of a project for the summary bar
  const getProjectSummaryStyle = (project: Project) => {
    if (project.tasks.length === 0) return null;
    
    // Find earliest start and latest end
    const startDates = project.tasks.map(t => new Date(t.startDate).getTime()).filter(t => !isNaN(t));
    const endDates = project.tasks.map(t => new Date(t.endDate).getTime()).filter(t => !isNaN(t));

    if (startDates.length === 0 || endDates.length === 0) return null;

    const minStart = new Date(Math.min(...startDates)).toISOString().split('T')[0];
    const maxEnd = new Date(Math.max(...endDates)).toISOString().split('T')[0];

    return getGridColumn(minStart, maxEnd);
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Cronograma de Trabajo</h1>
      
      <div className="flex-1 bg-white border rounded-lg shadow overflow-auto relative">
        <div className="min-w-[1200px]">
          {/* Header Dates */}
          <div className="grid grid-cols-[250px_1fr] border-b sticky top-0 bg-white z-10 shadow-sm">
            <div className="p-4 font-bold text-gray-700 bg-gray-50 border-r flex items-center">
              Proyecto / Tarea
            </div>
            <div className="grid grid-cols-30 divide-x bg-gray-50">
              {dates.map((d, i) => (
                <div key={i} className="text-center text-xs py-2">
                  <span className={`block font-bold ${d.getDay() === 0 || d.getDay() === 6 ? 'text-red-400' : 'text-gray-700'}`}>{d.getDate()}</span>
                  <span className="text-gray-400 uppercase text-[10px]">{d.toLocaleDateString('es-ES', { weekday: 'narrow' })}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="divide-y">
            {projects.map(proj => {
              const isExpanded = expandedProjects.has(proj.id);
              const summaryStyle = getProjectSummaryStyle(proj);
              
              return (
              <React.Fragment key={proj.id}>
                {/* Project Row */}
                <div 
                    className="grid grid-cols-[250px_1fr] bg-gray-100/50 hover:bg-gray-200/50 cursor-pointer transition-colors"
                    onClick={() => toggleProject(proj.id)}
                >
                  <div className="p-3 font-bold text-sm text-gray-800 truncate border-r flex items-center select-none">
                    <span className={`mr-2 transform transition-transform text-gray-500 ${isExpanded ? 'rotate-90' : ''}`}>
                         ▶
                    </span>
                    {proj.name}
                  </div>
                  <div className="grid grid-cols-30 divide-x h-10 relative items-center">
                      {dates.map((_, i) => <div key={i} className="border-r border-gray-300/30 h-full"></div>)}
                      
                      {/* Render Summary Bar ONLY if Collapsed */}
                      {!isExpanded && summaryStyle && (
                          <div 
                            className="absolute h-6 bg-indigo-500 rounded-md opacity-80 shadow-sm mx-1 flex items-center justify-center text-xs text-white font-medium truncate px-2"
                            style={summaryStyle}
                            title="Duración total del proyecto"
                          >
                             {proj.tasks.length} Tareas
                          </div>
                      )}
                  </div>
                </div>

                {/* Tasks Rows (Only if Expanded) */}
                {isExpanded && proj.tasks.map(task => {
                    const style = getGridColumn(task.startDate, task.endDate);
                    
                    return (
                        <div key={task.id} className="grid grid-cols-[250px_1fr] hover:bg-gray-50 group border-b border-gray-100/50 last:border-0 bg-white">
                        <div className="p-3 pl-8 text-sm text-gray-600 border-r truncate flex flex-col justify-center border-l-4 border-l-transparent hover:border-l-indigo-500 transition-colors">
                            <span>{task.name}</span>
                        </div>
                        <div className="grid grid-cols-30 divide-x relative h-14 items-center">
                             {/* Background grid lines */}
                             {dates.map((_, i) => <div key={i} className={`h-full ${dates[i].getDay() === 0 || dates[i].getDay() === 6 ? 'bg-gray-50/50' : ''}`}></div>)}
                             
                             {/* Task Bar */}
                             {style && (
                                <div 
                                    className="absolute h-10 rounded-md mx-0.5 shadow-sm overflow-hidden flex flex-col justify-center px-2 bg-blue-100 border border-blue-300 transition-all hover:bg-blue-200 cursor-help" 
                                    style={{...style, zIndex: 1}}
                                    title={`${task.name} (${task.startDate} - ${task.endDate})`}
                                >
                                    <div className="flex -space-x-1.5 overflow-hidden">
                                        {task.assignedUserIds.map(uid => {
                                            const u = users.find(user => user.id === uid);
                                            const color = u?.specialty ? SPECIALTY_COLORS[u.specialty] : SPECIALTY_COLORS['Montador'];
                                            return (
                                                <div 
                                                    key={uid} 
                                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ring-2 ring-white ${color?.bg} ${color?.text}`}
                                                    title={`${u?.name} (${u?.specialty})`}
                                                >
                                                    {u?.name.charAt(0)}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                             )}
                        </div>
                        </div>
                    );
                })}
              </React.Fragment>
            )})}
          </div>
        </div>
      </div>
      <style>{`
        .grid-cols-30 { grid-template-columns: repeat(30, minmax(0, 1fr)); }
      `}</style>
    </div>
  );
};
