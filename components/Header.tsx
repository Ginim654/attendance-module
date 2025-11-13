import React from 'react';
import { useAuth } from '../hooks/useAuth';

const Header: React.FC = () => {
  const { currentUser, logout } = useAuth();

  return (
    <header className="bg-white dark:bg-slate-800 shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
             </svg>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Attendance System</h1>
          </div>
          {currentUser && (
            <div className="flex items-center space-x-4">
                <div className="text-right">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">Welcome, {currentUser.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{currentUser.role} Dashboard</p>
                </div>
                <button
                    onClick={logout}
                    className="px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                >
                    Logout
                </button>
            </div>
           )}
        </div>
      </div>
    </header>
  );
};

export default Header;
