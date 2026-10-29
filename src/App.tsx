import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PanelLayout } from './components/layout';
import {
  LoginPage,
  StudentsPage,
  StudentDetailPage,
  ClosingPage,
  TimeSheetPage,
  SettingsPage,
  NotFoundPage,
} from './pages';
import TestHooks from './TestHooks';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota Pública de Autenticação */}
        <Route path="/login" element={<LoginPage />} />

        {/* Rotas Privadas (Protegidas por Sessão e com Shell de Navegação) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<PanelLayout />}>
            <Route path="/" element={<Navigate to="/alunos" replace />} />
            <Route path="/alunos" element={<StudentsPage />} />
            <Route path="/alunos/:id" element={<StudentDetailPage />} />
            <Route path="/fechamento" element={<ClosingPage />} />
            <Route path="/timesheet" element={<TimeSheetPage />} />
            <Route path="/configuracoes" element={<SettingsPage />} />
            <Route path="/dev/test-hooks" element={<TestHooks />} />
          </Route>
        </Route>

        {/* Rota Fallback 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
