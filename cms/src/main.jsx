import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './Landingpage.jsx';
import './index.css';
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import SignUp from './pages/AccountManagement/signup/signup.jsx';
import Login from './pages/AccountManagement/login/login.jsx';
import Dashboard from './pages/Student/dashboard.jsx';
import AdminDashboard from './pages/Admin/Admindashboard.jsx';
import AdminNavbar from './pages/ui/adminnavbar.jsx';
import Reports from './pages/Admin/reports.jsx';
import SubmittedFormsManagement from './pages/Admin/SubmittedFormsManagement.jsx';
import Request from './pages/Student/request.jsx';
import Faculty from './pages/faculty/facultydash.jsx';
import ProfilePage from './pages/ui/Profile.jsx';
import Forms from './pages/faculty/forms.jsx';
import History from './pages/Admin/history.jsx';

import { ProfileProvider } from './pages/ui/ProfileContext.jsx';
import Schedule from './pages/Admin/schedule.jsx';
import FacultyNavbar from './pages/ui/facultynavbar.jsx';
import studentdetailsModal from './pages/ui/studentdetailsModal.jsx'


const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/signup", element: <SignUp /> },
  { path: "/login", element: <Login /> },
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/Admindashboard", element: <AdminDashboard /> },
  { path: "/SubmittedFormsManagement", element: <SubmittedFormsManagement /> },
  { path: "/adminnavbar", element: <AdminNavbar /> },
  { path: "/request", element: <Request /> },
  { path: "/facultydash", element: <Faculty /> },
  { path: "/Profile", element: <ProfilePage /> },
  { path: "/forms", element: <Forms /> },
  { path: "/schedule", element: <Schedule /> },
  { path: "/reports", element: <Reports /> },
  { path: "/history", element: <History /> },
  { path: "/facultynavbar", element: <FacultyNavbar /> },
  
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ProfileProvider>
      <RouterProvider router={router} />
    </ProfileProvider>
  </React.StrictMode>
);