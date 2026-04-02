import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

import { Sidebar } from '../components/sidebar';
import { SourcePanel } from '../components/source-panel';
import { useAuth } from '../state/auth-context';
import { api } from '../lib/api';

export const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [citations, setCitations] = useState([]);

  const refreshDocuments = async () => {
    const { data } = await api.get('/documents');
    setDocuments(data.documents || []);
  };

  useEffect(() => {
    refreshDocuments().catch(() => null);
  }, []);

  const onUploadClick = () => navigate('/documents');

  return (
    <div className="flex h-screen bg-gradient-to-br from-indigo-500/5 via-transparent to-cyan-500/5">
      <Sidebar user={user} documents={documents} onUploadClick={onUploadClick} />
      <main className="min-w-0 flex-1 overflow-hidden">
        <Outlet context={{ citations, setCitations, documents, refreshDocuments, user, logout }} />
      </main>
      <SourcePanel citations={citations} />
    </div>
  );
};

