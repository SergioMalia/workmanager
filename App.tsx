import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Workers } from './pages/Workers';
import { Projects } from './pages/Projects';
import { MyTasks } from './pages/MyTasks';
import { Warehouse } from './pages/Warehouse';
import { Timeline } from './pages/Timeline';
import { ProjectType, UserRole } from './types';

const MainApp: React.FC = () => {
  const { currentUser, loading } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-600">
        Cargando datos...
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  // Redirect Operario if trying to access restricted tabs
  if (currentUser.role === UserRole.OPERARIO && ['operarios', 'averias', 'obras', 'cronograma'].includes(activeTab)) {
      if (activeTab !== 'tasks' && activeTab !== 'dashboard' && activeTab !== 'almacen') {
          setActiveTab('tasks');
      }
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'operarios': return <Workers />;
      case 'averias': return <Projects type={ProjectType.AVERIA} />;
      case 'obras': return <Projects type={ProjectType.OBRA} />;
      case 'tasks': return <MyTasks />;
      case 'almacen': return <Warehouse />;
      case 'cronograma': return <Timeline />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
};

export default App;
