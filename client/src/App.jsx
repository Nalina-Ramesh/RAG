import { Navigate, Route, Routes, useOutletContext } from 'react-router-dom';

import { ProtectedRoute } from './components/protected-route';
import { DashboardLayout } from './layouts/dashboard-layout';
import { LoginPage } from './pages/login-page';
import { SignupPage } from './pages/signup-page';
import { ChatPage } from './pages/chat-page';
import { DocumentsPage } from './pages/documents-page';
import { SettingsPage } from './pages/settings-page';

const ChatRoute = () => {
  const { citations, setCitations } = useOutletContext();
  return <ChatPage citations={citations} setCitations={setCitations} />;
};

const DocsRoute = () => {
  const { documents, refreshDocuments } = useOutletContext();
  return <DocumentsPage documents={documents} refreshDocuments={refreshDocuments} />;
};

const SettingsRoute = () => {
  const { user, logout } = useOutletContext();
  return <SettingsPage user={user} onLogout={logout} />;
};

export const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/chat" element={<ChatRoute />} />
          <Route path="/settings" element={<SettingsRoute />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/documents" element={<DocsRoute />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  );
};

