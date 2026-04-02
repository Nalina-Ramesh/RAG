import { motion } from 'framer-motion';

export const SourcePanel = ({ citations }) => {
  return (
    <aside className="glass-card m-4 hidden w-96 flex-col gap-3 xl:flex">
      <h3 className="text-lg font-semibold">Source Citations</h3>
      <div className="space-y-3 overflow-auto">
        {citations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300/50 p-4 text-sm text-slate-500 dark:border-slate-700">
            Ask a question to view SOP citations.
          </div>
        ) : (
          citations.map((c, idx) => (
            <motion.div
              key={`${c.documentName}-${idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="cursor-pointer rounded-xl border border-white/20 bg-white/50 p-3 hover:border-indigo-400/50 dark:bg-slate-800/40"
            >
              <p className="text-sm font-semibold">{c.documentName}</p>
              <p className="text-xs text-indigo-500">Page {c.page} • {c.section}</p>
              <p className="mt-2 line-clamp-3 text-xs text-slate-600 dark:text-slate-300">{c.snippet}</p>
            </motion.div>
          ))
        )}
      </div>
    </aside>
  );
};

