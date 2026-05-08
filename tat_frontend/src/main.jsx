// main.jsx
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from 'react-router-dom';
import './index.css';

import Template from './components/Layout/Template';
import LoginPage from './pages/LoginPage';
import ProjectsPage from './pages/ProjectsPage';
import TasksPage from './pages/TasksPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import EmployeeTasksPage from './pages/EmployeeTasksPage';

// ตรวจสอบการ login แบบง่าย
const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  console.log('🔍 Checking auth status:', { hasToken: !!token, hasUser: !!user });
  return token && user;
};

// Protected Route Component
const ProtectedLayout = () => {
  if (!isAuthenticated()) {
    console.log('🔄 Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log(' Authenticated, showing protected content');
  return (
    <Template>
      <Outlet />
    </Template>
  );
};

// Public Route Component
const PublicRoute = ({ children }) => {
  if (isAuthenticated()) {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const redirectPath = getRedirectPath(user.role);
      console.log('Already authenticated, redirecting to:', redirectPath);
      return <Navigate to={redirectPath} replace />;
    } catch (error) {
      console.log('Invalid user data, clearing localStorage');
      localStorage.clear();
    }
  }

  console.log('Showing public route');
  return children;
};

// Helper function สำหรับ redirect
const getRedirectPath = (role) => {
  switch (role) {
    case 'ADMIN':
      return '/dashboard';
    case 'MANAGER':
      return '/projects';
    case 'EMPLOYEE':
      return '/tasks';
    default:
      return '/dashboard';
  }
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      {
        path: '/',
        element: <Navigate to="/projects" replace />
      },
      {
        path: '/projects',
        element: <ProjectsPage />
      },
      {
        path: '/tasks',
        element: <TasksPage />
      },
        {
        path: '/employeetasks',
        element: <EmployeeTasksPage />
      },
      {
        path: '/users',
        element: <UsersPage />
      },
      {
        path: '/reports',
        element: <ReportsPage />
      }
    ]
  },
  // Login route - อยู่นอก protected area
  {
    path: '/login',
    element: (
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    )
  },
  // Catch-all route
  {
    path: '*',
    element: <Navigate to="/login" replace />
  }
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);