import { NavLink } from 'react-router-dom';
import { FileText, MessageSquare, Settings, UploadCloud } from 'lucide-react';
import { motion } from 'framer-motion';

export const Sidebar = ({ user, documents, onUploadClick }) => {
  const nav = [
    { to: '/chat', label: 'Chat', icon: MessageSquare },
    ...(user?.role === 'admin' ? [{ to: '/documents', label: 'Documents', icon: FileText }] : []),
    { to: '/settings', label: 'Settings', icon: Settings }
  ];

  return (
    <aside className="glass-card m-4 flex w-80 flex-col gap-4 p-4">
      <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-400 p-[1px]">
        <div className="rounded-2xl bg-white/80 px-4 py-3 dark:bg-slate-900/90">
          <p className="text-xs uppercase tracking-[0.28em] text-indigo-500">OpsMind AI</p>
          <h1 className="text-xl font-bold">Corporate Knowledge Brain</h1>
        </div>
      </div>

      <nav className="space-y-2">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl border px-3 py-2 transition ${
                isActive
                  ? 'border-indigo-400 bg-indigo-500/10 text-indigo-500 shadow-glow'
                  : 'border-transparent hover:border-indigo-300/40 hover:bg-indigo-500/5'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            <span className="font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>

      {user?.role === 'admin' && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onUploadClick}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 px-4 py-3 font-semibold text-white"
        >
          <UploadCloud className="h-4 w-4" /> Upload SOP
        </motion.button>
      )}

      <div className="mt-2 space-y-2 overflow-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Knowledge Base</p>
        {documents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300/50 p-4 text-sm text-slate-500 dark:border-slate-700">
            No SOP documents indexed yet.
          </div>
        ) : (
          documents.map((doc) => (
            <div key={doc._id} className="rounded-xl border border-white/20 bg-white/40 p-3 text-sm dark:bg-slate-800/30">
              <p className="font-medium">{doc.title}</p>
              <p className="text-xs text-slate-500">{doc.indexingStatus} • {doc.totalChunks} chunks</p>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

