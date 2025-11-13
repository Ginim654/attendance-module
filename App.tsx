import React from 'react';
import { UserRole } from './types';
import { AttendanceProvider } from './hooks/useAttendanceData';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Header from './components/Header';
import TeacherView from './components/TeacherView';
import AdminView from './components/AdminView';
import StudentView from './components/StudentView';
import LoginView from './components/LoginView';

const AppContent: React.FC = () => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    // A simple loading state while checking for a persisted session
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900"><p className="text-gray-500">Loading...</p></div>;
  }
  
  if (!currentUser) {
    return <LoginView />;
  }

  const renderView = () => {
    switch (currentUser.role) {
      case UserRole.Teacher:
        return <TeacherView />;
      case UserRole.Admin:
        return <AdminView />;
      case UserRole.Student:
        return <StudentView />;
      default:
        // This case should ideally not be reached if roles are handled correctly
        return <LoginView />;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 font-sans">
      <Header />
      <main className="p-4 sm:p-6 lg:p-8">
        {renderView()}
      </main>
    </div>
  );
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AttendanceProvider>
          <AppContent />
      </AttendanceProvider>
    </AuthProvider>
  );
};

export default App;