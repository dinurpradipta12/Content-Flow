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
import { Welcome } from './pages/Welcome';
import { Terms } from './pages/Terms';
import { Register } from './pages/Register';
import { UserManagement } from './pages/UserManagement';
import { DeveloperInbox } from './pages/DeveloperInbox';
import { TeamManagement } from './pages/TeamManagement';
import { Profile } from './pages/Profile';
import { CalendarPage } from './pages/CalendarPage';
import { Messages } from './pages/Messages';
import { WorkspaceSettings } from './pages/WorkspaceSettings';
import { DeveloperAnalytics } from './pages/DeveloperAnalytics';
import { ActivityLog } from './pages/ActivityLog';
import { NotificationProvider } from './components/NotificationProvider';
import { AppConfigProvider } from './components/AppConfigProvider';
import { supabase } from './services/supabaseClient';

// --- AUTH CONTEXT FOR SECURE SESSION MANAGEMENT ---
interface AuthContextType {
  user: any;
  role: string;
  loading: boolean;
  session: any;
}

const AuthContext = React.createContext<AuthContextType>({ user: null, role: 'Member', loading: true, session: null });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<any>(null);
  const [role, setRole] = React.useState<string>('Member');
  const [loading, setLoading] = React.useState(true);
  const [session, setSession] = React.useState<any>(null);

  React.useEffect(() => {
    // 1. Initial Session Load
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthStateChange(session);
    });

    // 2. Real-time Session Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthStateChange(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthStateChange = async (currentSession: any) => {
    setSession(currentSession);

    if (currentSession?.user) {
      try {
        // Security Check: Verify extra profile data from public.app_users
        const { data, error } = await supabase
          .from('app_users')
          .select('*')
          .eq('id', currentSession.user.id)
          .single();

        if (data && !error && data.is_active !== false) {
          setUser({ ...currentSession.user, ...data });
          setRole(data.role || 'Member');

          // Legacy Sync (Optional: helps older components still using localStorage)
          localStorage.setItem('user_id', data.id);
          localStorage.setItem('user_role', data.role);
          localStorage.setItem('isAuthenticated', 'true');
        } else {
          // Profile issue or inactive account
          console.warn("User profile not found or inactive. Signing out.");
          if (data?.is_active === false) {
            await supabase.auth.signOut();
          }
          setUser(null);
          setRole('Member');
        }
      } catch (err) {
        console.error("Profile sync error:", err);
      }
    } else {
      setUser(null);
      setRole('Member');
      localStorage.removeItem('isAuthenticated');
    }
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, session }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => React.useContext(AuthContext);

// Secure Auth Guard: Verifies Supabase Session
const RequireAuth = () => {
  const { session, loading } = useAuth();

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-background">
      <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!session) {
    return <Navigate to="/welcome" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

// Secure Admin Guard: Verifies Verified DB Role (Owner, Admin, Developer)
const RequireAdmin = ({ children }: { children: React.ReactElement }) => {
  const { role, loading } = useAuth();

  if (loading) return null;

  if (role !== 'Developer' && role !== 'Admin' && role !== 'Owner') {
    return <Navigate to="/" replace />;
  }
  return children;
};

// Secure Developer Guard: Exclusive Access for System Developers
const RequireDeveloper = ({ children }: { children: React.ReactElement }) => {
  const { role, loading } = useAuth();

  if (loading) return null;

  if (role !== 'Developer') {
    return <Navigate to="/" replace />;
  }
  return children;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <AppConfigProvider>
          <NotificationProvider>
            <Routes>
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/login" element={<Login />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Workspace Area */}
              <Route element={<RequireAuth />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="plan" element={<ContentPlan />} />
                <Route path="plan/:id" element={<ContentPlanDetail />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="approval" element={<RequireAdmin><Approval /></RequireAdmin>} />
                <Route path="insight" element={<ContentDataInsight />} />
                <Route path="carousel" element={<CarouselMaker />} />
                <Route path="script" element={<TeamKPIBoard />} />
                <Route path="profile" element={<Profile />} />

                {/* Team & Admin Routes */}
                <Route path="admin/team" element={<RequireAdmin><TeamManagement /></RequireAdmin>} />

                {/* Superuser / Developer Infrastructure */}
                <Route path="messages" element={<RequireDeveloper><Messages /></RequireDeveloper>} />
                <Route path="admin/activity" element={<RequireDeveloper><ActivityLog /></RequireDeveloper>} />
                <Route path="admin/workspace" element={<RequireDeveloper><WorkspaceSettings /></RequireDeveloper>} />
                <Route path="admin/users" element={<RequireDeveloper><UserManagement /></RequireDeveloper>} />
                <Route path="admin/inbox" element={<RequireDeveloper><DeveloperInbox /></RequireDeveloper>} />
                <Route path="admin/analytics" element={<RequireDeveloper><DeveloperAnalytics /></RequireDeveloper>} />
              </Route>
            </Routes>
          </NotificationProvider>
        </AppConfigProvider>
      </AuthProvider>
    </HashRouter>
  );
};

export default App;