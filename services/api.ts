import { MaterialRequest, Project, Task, TimelineEntry, User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

interface StateResponse {
  users: User[];
  projects: Project[];
  materials: MaterialRequest[];
  averias: Project[];
  obras: Project[];
  tasks: Task[];
  cronograma: TimelineEntry[];
}

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let message = 'Error al comunicar con el servidor.';
    try {
      const errorBody = await response.json();
      if (errorBody?.message) {
        message = errorBody.message;
      }
    } catch (err) {
      console.error('Error parsing API error response', err);
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const api = {
  fetchState: () => request<StateResponse>('/state'),
  login: (username: string, password: string) =>
    request<User>('/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  createUser: (user: User) =>
    request<User>('/users', { method: 'POST', body: JSON.stringify(user) }),
  deleteUser: (userId: string) => request<void>(`/users/${userId}`, { method: 'DELETE' }),
  createProject: (project: Project) =>
    request<Project>('/projects', { method: 'POST', body: JSON.stringify(project) }),
  updateProject: (project: Project) =>
    request<Project>(`/projects/${project.id}`, { method: 'PUT', body: JSON.stringify(project) }),
  deleteProject: (projectId: string) => request<void>(`/projects/${projectId}`, { method: 'DELETE' }),
  addTask: (projectId: string, task: Task) =>
    request<Project>(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(task) }),
  updateTask: (projectId: string, task: Task) =>
    request<Project>(`/projects/${projectId}/tasks/${task.id}`, {
      method: 'PUT',
      body: JSON.stringify(task),
    }),
  deleteTask: (projectId: string, taskId: string) =>
    request<Project>(`/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' }),
  createMaterialRequest: (requestBody: MaterialRequest) =>
    request<MaterialRequest>('/materials', { method: 'POST', body: JSON.stringify(requestBody) }),
  updateMaterialRequest: (requestBody: MaterialRequest) =>
    request<MaterialRequest>(`/materials/${requestBody.id}`, {
      method: 'PUT',
      body: JSON.stringify(requestBody),
    }),
};
