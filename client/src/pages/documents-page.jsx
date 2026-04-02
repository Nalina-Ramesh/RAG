import { useState } from 'react';
import { toast } from 'sonner';

import { api } from '../lib/api';

export const DocumentsPage = ({ documents, refreshDocuments }) => {
  const [uploading, setUploading] = useState(false);

  const onUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append('file', file);
    form.append('title', file.name.replace('.pdf', ''));

    setUploading(true);
    try {
      await api.post('/documents', form);
      toast.success('Document uploaded and indexing started');
      refreshDocuments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const remove = async (id) => {
    await api.delete(`/documents/${id}`);
    toast.success('Document deleted');
    refreshDocuments();
  };

  const reindex = async (id) => {
    await api.post(`/documents/${id}/reindex`);
    toast.success('Re-indexing completed');
    refreshDocuments();
  };

  return (
    <div className="m-4 glass-card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Document Management</h2>
          <p className="text-sm text-slate-500">Upload, index, and manage SOP files.</p>
        </div>
        <label className="cursor-pointer rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 px-4 py-2 font-semibold text-white">
          {uploading ? 'Uploading...' : 'Upload PDF'}
          <input type="file" accept="application/pdf" hidden onChange={onUpload} />
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/20">
        <table className="w-full text-sm">
          <thead className="bg-slate-100/70 dark:bg-slate-800/60">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Chunks</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc._id} className="border-t border-white/20">
                <td className="px-3 py-2">{doc.title}</td>
                <td className="px-3 py-2 capitalize">{doc.indexingStatus}</td>
                <td className="px-3 py-2">{doc.totalChunks}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button onClick={() => reindex(doc._id)} className="rounded-lg bg-indigo-500/10 px-2 py-1 text-indigo-500">Re-index</button>
                    <button onClick={() => remove(doc._id)} className="rounded-lg bg-rose-500/10 px-2 py-1 text-rose-500">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

