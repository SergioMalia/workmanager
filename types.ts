export enum UserRole {
  MASTER = 'MASTER',
  OPERARIO = 'OPERARIO',
}

export enum Specialty {
  INGENIERO = 'Ingeniero',
  ELECTRICISTA = 'Electricista',
  HERRERO = 'Herrero',
  OFICIAL_MONTADOR = 'Oficial Montador',
  MONTADOR = 'Montador',
  CAMIONERO = 'Camionero',
  ALMACEN = 'Operario Almacén',
}

export enum ProjectType {
  AVERIA = 'Avería',
  OBRA = 'Obra',
}

export enum TaskStatus {
  PENDING = 'Pendiente',
  IN_PROGRESS = 'En Curso',
  COMPLETED = 'Completado', // Waiting for review
  REVIEWED = 'Revisado', // Final state
}

export enum MaterialStatus {
  PENDING = 'Pendiente',
  PREPARING = 'En Preparación',
  READY = 'Listo',
}

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string; // In a real app, this would be hashed
  role: UserRole;
  specialty?: Specialty; // Only for Operarios
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  description: string;
  startDate: string; // ISO Date string
  estimatedHours: number;
  endDate: string; // Calculated
  assignedUserIds: string[];
  status: TaskStatus;
  observations?: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  type: ProjectType;
  tasks: Task[];
}

export interface MaterialRequest {
  id: string;
  taskId: string;
  projectId: string; // Denormalized for easier query
  requestedByUserId: string;
  items: string[];
  status: MaterialStatus;
  createdAt: string;
  handledByUserId?: string; // ID of the warehouse worker preparing it
}

export interface SpecialtyColor {
  bg: string;
  text: string;
  border: string;
  hex: string;
}

export interface TimelineEntry {
  id: string;
  taskId: string;
  projectId: string;
  title: string;
  startDate: string;
  endDate: string;
}
