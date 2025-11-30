const TaskStatus = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En Curso',
  COMPLETED: 'Completado',
  REVIEWED: 'Revisado',
};

export const initialUsers = [
  { id: 'u1', name: 'Admin Master', username: 'admin', role: 'MASTER' },
  { id: 'u2', name: 'Juan Electricista', username: 'juan', role: 'OPERARIO', specialty: 'Electricista' },
  { id: 'u3', name: 'Pedro Herrero', username: 'pedro', role: 'OPERARIO', specialty: 'Herrero' },
  { id: 'u4', name: 'Luis Almacen', username: 'luis', role: 'OPERARIO', specialty: 'Operario Almacén' },
  { id: 'u5', name: 'Ana Ingeniera', username: 'ana', role: 'OPERARIO', specialty: 'Ingeniero' },
];

export const createInitialProjects = () => {
  const today = new Date().toISOString().split('T')[0];
  return [
    {
      id: 'p1',
      name: 'Reparación Generador',
      client: 'Hospital Central',
      type: 'Avería',
      tasks: [
        {
          id: 't1',
          projectId: 'p1',
          name: 'Diagnóstico inicial',
          description: 'Revisar voltaje y cableado principal',
          startDate: today,
          endDate: today,
          estimatedHours: 4,
          assignedUserIds: ['u2'],
          status: TaskStatus.IN_PROGRESS,
        },
      ],
    },
    {
      id: 'p2',
      name: 'Nave Industrial Zona B',
      client: 'Logística Sur',
      type: 'Obra',
      tasks: [],
    },
  ];
};

export const getInitialSections = () => {
  const projects = createInitialProjects();
  const averias = projects.filter(p => p.type === 'Avería').map(p => ({ ...p, tasks: [] }));
  const obras = projects.filter(p => p.type === 'Obra').map(p => ({ ...p, tasks: [] }));
  const tasks = projects.flatMap(project =>
    project.tasks.map(task => ({
      ...task,
      projectId: project.id,
    }))
  );
  const timelineEntries = tasks.map(task => ({
    id: `timeline-${task.id}`,
    taskId: task.id,
    projectId: task.projectId,
    title: task.name,
    startDate: task.startDate,
    endDate: task.endDate,
  }));

  return {
    projects,
    averias,
    obras,
    tasks,
    timelineEntries,
  };
};

export const initialMaterials = [];
