import { Specialty, SpecialtyColor, User, UserRole, Project, ProjectType, TaskStatus } from './types';

export const SPECIALTY_COLORS: Record<Specialty, SpecialtyColor> = {
  [Specialty.INGENIERO]: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', hex: '#dbeafe' },
  [Specialty.ELECTRICISTA]: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', hex: '#fef9c3' },
  [Specialty.HERRERO]: { bg: 'bg-gray-200', text: 'text-gray-800', border: 'border-gray-300', hex: '#e5e7eb' },
  [Specialty.OFICIAL_MONTADOR]: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', hex: '#ffedd5' },
  [Specialty.MONTADOR]: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', hex: '#fee2e2' },
  [Specialty.CAMIONERO]: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', hex: '#f3e8ff' },
  [Specialty.ALMACEN]: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200', hex: '#d1fae5' },
};

// Seed Data
export const INITIAL_USERS: User[] = [
  { id: 'u1', name: 'Admin Master', username: 'admin', role: UserRole.MASTER },
  { id: 'u2', name: 'Juan Electricista', username: 'juan', role: UserRole.OPERARIO, specialty: Specialty.ELECTRICISTA },
  { id: 'u3', name: 'Pedro Herrero', username: 'pedro', role: UserRole.OPERARIO, specialty: Specialty.HERRERO },
  { id: 'u4', name: 'Luis Almacen', username: 'luis', role: UserRole.OPERARIO, specialty: Specialty.ALMACEN },
  { id: 'u5', name: 'Ana Ingeniera', username: 'ana', role: UserRole.OPERARIO, specialty: Specialty.INGENIERO },
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'Reparación Generador',
    client: 'Hospital Central',
    type: ProjectType.AVERIA,
    tasks: [
      {
        id: 't1',
        projectId: 'p1',
        name: 'Diagnóstico inicial',
        description: 'Revisar voltaje y cableado principal',
        startDate: new Date().toISOString().split('T')[0],
        estimatedHours: 4,
        endDate: new Date().toISOString().split('T')[0],
        assignedUserIds: ['u2'],
        status: TaskStatus.IN_PROGRESS,
      }
    ]
  },
  {
    id: 'p2',
    name: 'Nave Industrial Zona B',
    client: 'Logística Sur',
    type: ProjectType.OBRA,
    tasks: []
  }
];

// Helper to calculate end date skipping weekends (Mon-Fri)
export const calculateEndDate = (startDateStr: string, hours: number, numWorkers: number): string => {
  if (numWorkers === 0) return startDateStr;
  
  const dailyHours = 8;
  const totalManHours = hours / numWorkers;
  let daysNeeded = Math.ceil(totalManHours / dailyHours);
  
  // If it's less than a day, it finishes on the same day (technically)
  // But logic says: 1 day duration implies same day finish if starting early.
  // We will treat daysNeeded as "span of days". 
  // 1 day needed = Start Date == End Date.
  
  const current = new Date(startDateStr);
  // Subtract 1 because if we need 1 day, we finish on startDate
  let daysToAdd = Math.max(0, daysNeeded - 1); 

  while (daysToAdd > 0) {
    current.setDate(current.getDate() + 1);
    // 0 = Sunday, 6 = Saturday
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      daysToAdd--;
    }
  }

  return current.toISOString().split('T')[0];
};

export const checkConflicts = (userId: string, start: string, end: string, allProjects: Project[], taskIdToExclude?: string): boolean => {
  const s1 = new Date(start).getTime();
  const e1 = new Date(end).getTime();

  for (const proj of allProjects) {
    for (const task of proj.tasks) {
      // If we are editing a task, don't check it against itself
      if (taskIdToExclude && task.id === taskIdToExclude) continue;

      if (task.assignedUserIds.includes(userId) && task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.REVIEWED) {
        const s2 = new Date(task.startDate).getTime();
        const e2 = new Date(task.endDate).getTime();
        // Overlap logic
        if (s1 <= e2 && s2 <= e1) {
          return true;
        }
      }
    }
  }
  return false;
};