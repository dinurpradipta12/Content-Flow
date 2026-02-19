import React from 'react';
import { HashRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ContentPlan } from './pages/ContentPlan';
import { ContentPlanDetail } from './pages/ContentPlanDetail';
import { Analysis } from './pages/Analysis';
import { CarouselMaker } from './pages/CarouselMaker';
import { ScriptCreator } from './pages/ScriptCreator';
import { Login } from './pages/Login';

const ProtectedLayout = () => {
    return (
        <Layout>
            <Outlet />
        </Layout>
    );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<ProtectedLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="plan" element={<ContentPlan />} />
            <Route path="plan/:id" element={<ContentPlanDetail />} />
            <Route path="analysis" element={<Analysis />} />
            <Route path="carousel" element={<CarouselMaker />} />
            <Route path="script" element={<ScriptCreator />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;