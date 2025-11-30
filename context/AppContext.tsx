import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Project, MaterialRequest, Task, TimelineEntry } from '../types';
import { api } from '../services/api';

interface AppState {
  users: User[];
  projects: Project[];
  materials: MaterialRequest[];
  averias: Project[];
  obras: Project[];
  tasks: Task[];
  cronograma: TimelineEntry[];
  currentUser: User | null;
}

interface AppContextType extends AppState {
  loading: boolean;
  refreshState: () => Promise<void>;
  login: (username: string, pass: string) => Promise<boolean>;
  logout: () => void;
  addUser: (user: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addProject: (project: Project) => Promise<void>;
  updateProject: (project: Project) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addTask: (projectId: string, task: Task) => Promise<void>;
  updateTask: (projectId: string, task: Task) => Promise<void>;
  deleteTask: (projectId: string, taskId: string) => Promise<void>;
  addMaterialRequest: (req: MaterialRequest) => Promise<void>;
  updateMaterialRequest: (req: MaterialRequest) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper to safely parse JSON from localStorage to avoid application crashes
const getStorageItem = <T,>(key: string, initialValue: T): T => {
  if (typeof window === 'undefined') return initialValue;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
    return initialValue;
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [materials, setMaterials] = useState<MaterialRequest[]>([]);
  const [averias, setAverias] = useState<Project[]>([]);
  const [obras, setObras] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cronograma, setCronograma] = useState<TimelineEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() => getStorageItem('wm_currentUser', null));
  const [loading, setLoading] = useState<boolean>(true);

  const syncState = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const data = await api.fetchState();
      setUsers(data.users);
      setProjects(data.projects);
      setMaterials(data.materials);
      setAverias(data.averias);
      setObras(data.obras);
      setTasks(data.tasks);
      setCronograma(data.cronograma);
    } catch (error) {
      console.error('Error while fetching state from API', error);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    syncState(true);
  }, []);

  const refreshState = async () => {
    await syncState();
  };

  useEffect(() => { 
    try {
      if (currentUser) localStorage.setItem('wm_currentUser', JSON.stringify(currentUser));
      else localStorage.removeItem('wm_currentUser');
    } catch (e) { console.error('Storage error', e); }
  }, [currentUser]);

  const login = async (u: string, p: string) => {
    try {
      const user = await api.login(u, p);
      setCurrentUser(user);
      return true;
    } catch (error) {
      console.error('Login error', error);
      return false;
    }
  };

  const logout = () => setCurrentUser(null);

  const addUser = async (user: User) => {
    await api.createUser(user);
    await syncState();
  };

  const deleteUser = async (id: string) => {
    await api.deleteUser(id);
    await syncState();
  };

  const addProject = async (project: Project) => {
    await api.createProject(project);
    await syncState();
  };

  const updateProject = async (updatedProject: Project) => {
    await api.updateProject(updatedProject);
    await syncState();
  };

  const deleteProject = async (id: string) => {
    await api.deleteProject(id);
    await syncState();
  };

  const addTask = async (projectId: string, task: Task) => {
    await api.addTask(projectId, task);
    await syncState();
  };

  const updateTask = async (projectId: string, updatedTask: Task) => {
    await api.updateTask(projectId, updatedTask);
    await syncState();
  };

  const deleteTask = async (projectId: string, taskId: string) => {
    await api.deleteTask(projectId, taskId);
    await syncState();
  };

  const addMaterialRequest = async (req: MaterialRequest) => {
    await api.createMaterialRequest(req);
    await syncState();
  };

  const updateMaterialRequest = async (updatedReq: MaterialRequest) => {
    await api.updateMaterialRequest(updatedReq);
    await syncState();
  };

  return (
    <AppContext.Provider value={{
      users, projects, materials, averias, obras, tasks, cronograma, currentUser, loading,
      refreshState,
      login, logout, addUser, deleteUser, addProject, updateProject, deleteProject, addTask, updateTask, deleteTask, addMaterialRequest, updateMaterialRequest
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
