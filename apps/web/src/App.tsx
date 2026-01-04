import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "./state/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { AppShell } from "./pages/AppShell";

function AuthedRoute(props: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center text-slate-300">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{props.children}</>;
}

export default function App() {
  const { bootstrap } = useAuth();
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <AuthedRoute>
            <AppShell />
          </AuthedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
