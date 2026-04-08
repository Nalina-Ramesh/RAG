import { useState } from 'react';
import { toast } from 'sonner';

import { api } from '../lib/api';
import { useAuth } from '../state/auth-context';

export const DocumentsPage = ({ documents, refreshDocuments }) => {
  const [uploading, setUploading] = useState(false);
  const [selectedTeamCode, setSelectedTeamCode] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const teams = user?.departmentCodes || [];
  const teamLabelByCode = teams.reduce((acc, team) => {
    acc[team.code] = team.name;
    return acc;
  }, {});

  const onUpload = async (event) => {
    if (!isAdmin) {
      toast.error('Only admin can upload documents');
      event.target.value = '';
      return;
    }

    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFileName('');
      return;
    }

    if (!selectedTeamCode) {
      toast.error('Please select a team before uploading');
      event.target.value = '';
      setSelectedFileName('');
      return;
    }

    setSelectedFileName(file.name);

    const form = new FormData();
    form.append('file', file);
    form.append('title', file.name.replace('.pdf', ''));
    form.append('departmentCode', selectedTeamCode);

    setUploading(true);
    try {
      await api.post('/documents', form);
      const team = teams.find((dept) => dept.code === selectedTeamCode);
      toast.success(`Document uploaded for ${team?.name || selectedTeamCode}. Indexing started`);
      refreshDocuments();
      setSelectedFileName('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const remove = async (id) => {
    if (!isAdmin) {
      toast.error('Only admin can delete documents');
      return;
    }

    await api.delete(`/documents/${id}`);
    toast.success('Document deleted');
    refreshDocuments();
  };

  const reindex = async (id) => {
    if (!isAdmin) {
      toast.error('Only admin can re-index documents');
      return;
    }

    await api.post(`/documents/${id}/reindex`);
    toast.success('Re-indexing completed');
    refreshDocuments();
  };

  return (
    <div className="m-4 glass-card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Document Management</h2>
          <p className="text-sm text-slate-500">Upload, index, and manage SOP files by team.</p>
        </div>
        {isAdmin ? (
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <label htmlFor="teamSelect" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Team
              </label>
              <select
                id="teamSelect"
                value={selectedTeamCode}
                onChange={(event) => setSelectedTeamCode(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              >
                <option value="">Select team</option>
                {teams.map((team) => (
                  <option key={team.code} value={team.code}>
                    {team.name} ({team.code})
                  </option>
                ))}
              </select>
            </div>

            <label
              className={`cursor-pointer rounded-xl px-4 py-2 font-semibold text-white ${
                selectedTeamCode
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-500'
                  : 'bg-slate-400 dark:bg-slate-600'
              }`}
            >
              {uploading ? 'Uploading...' : 'Choose PDF & Upload'}
              <input type="file" accept="application/pdf" hidden onChange={onUpload} disabled={!selectedTeamCode || uploading} />
            </label>

            <div className="w-full rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
              <span className="font-medium">File:</span>{' '}
              {selectedFileName || 'No file selected yet'}
            </div>
          </div>
        ) : (
          <span className="rounded-xl bg-slate-200 px-4 py-2 text-sm text-slate-600 dark:bg-slate-700 dark:text-slate-200">
            Admin only actions
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-white/20">
        <table className="w-full text-sm">
          <thead className="bg-slate-100/70 dark:bg-slate-800/60">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Team</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Chunks</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc._id} className="border-t border-white/20">
                <td className="px-3 py-2">{doc.title}</td>
                <td className="px-3 py-2">
                  <span className="rounded-md bg-slate-200 px-2 py-1 text-xs dark:bg-slate-700">
                    {teamLabelByCode[doc.departmentCode] || doc.departmentCode || 'N/A'}
                  </span>
                </td>
                <td className="px-3 py-2 capitalize">{doc.indexingStatus}</td>
                <td className="px-3 py-2">{doc.totalChunks}</td>
                <td className="px-3 py-2">
                  {isAdmin ? (
                    <div className="flex gap-2">
                      <button onClick={() => reindex(doc._id)} className="rounded-lg bg-indigo-500/10 px-2 py-1 text-indigo-500">Re-index</button>
                      <button onClick={() => remove(doc._id)} className="rounded-lg bg-rose-500/10 px-2 py-1 text-rose-500">Delete</button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">Read only</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

