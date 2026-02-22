import React from 'react';
import { HashRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ContentPlan } from './pages/ContentPlan';
import { ContentPlanDetail } from './pages/ContentPlanDetail';
import { Approval } from './pages/Approval';
import { ContentDataInsight } from './pages/ContentDataInsight';
import { CarouselMaker } from './pages/CarouselMaker';
import { TeamKPIBoard } from './pages/TeamKPIBoard';
import { Login } from './pages/Login';
import { UserManagement } from './pages/UserManagement';
import { TeamManagement } from './pages/TeamManagement';
import { Profile } from './pages/Profile';
import { Messages } from './pages/Messages';
import { NotificationProvider } from './components/NotificationProvider';

// Auth Guard Component
const RequireAuth = () => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

// Admin Guard: Developer, Admin, Owner
const RequireAdmin = ({ children }: { children: React.ReactElement }) => {
  const role = localStorage.getItem('user_role') || 'Member';
  if (role !== 'Developer' && role !== 'Admin' && role !== 'Owner') {
    return <Navigate to="/" replace />;
  }
  return children;
};

// Developer Guard: Developer only
const RequireDeveloper = ({ children }: { children: React.ReactElement }) => {
  const role = localStorage.getItem('user_role') || 'Member';
  if (role !== 'Developer') {
    return <Navigate to="/" replace />;
  }
  return children;
};

const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50">
    <h2 className="text-2xl font-black text-slate-400 font-heading">{title}</h2>
    <p className="text-slate-500">Halaman ini sedang dalam pengembangan.</p>
  </div>
);

const App: React.FC = () => {
  return (
    <HashRouter>
      <NotificationProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route element={<RequireAuth />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="messages" element={<Messages />} />
            <Route path="plan" element={<ContentPlan />} />
            <Route path="plan/:id" element={<ContentPlanDetail />} />
            <Route path="approval" element={<Approval />} />
            <Route path="insight" element={<ContentDataInsight />} />
            <Route path="carousel" element={<CarouselMaker />} />
            <Route path="script" element={<TeamKPIBoard />} />
            <Route path="profile" element={<Profile />} />

            {/* Admin Routes (Developer + Admin) */}
            <Route path="admin/team" element={<RequireAdmin><TeamManagement /></RequireAdmin>} />
            <Route path="admin/workspace" element={<RequireAdmin><PlaceholderPage title="Workspace Settings" /></RequireAdmin>} />

            {/* Developer Routes (Developer only) */}
            <Route path="admin/users" element={<RequireDeveloper><UserManagement /></RequireDeveloper>} />
          </Route>
        </Routes>
      </NotificationProvider>
    </HashRouter>
  );
};

export default App;