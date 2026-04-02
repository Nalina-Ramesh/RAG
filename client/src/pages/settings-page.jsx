import { useState } from 'react';
import { toast } from 'sonner';

import { ThemeToggle } from '../components/theme-toggle';
import { api } from '../lib/api';

export const SettingsPage = ({ user, onLogout }) => {
  const [departmentName, setDepartmentName] = useState('');
  const [generating, setGenerating] = useState(false);

  const generateDepartmentCode = async (e) => {
    e.preventDefault();
    if (!departmentName.trim()) return;

    setGenerating(true);
    try {
      const { data } = await api.post('/auth/company-code/department', {
        departmentName: departmentName.trim()
      });
      localStorage.setItem('opsmind_user', JSON.stringify(data.user));
      toast.success(`Code for ${data.department.name}: ${data.department.code}`);
      setDepartmentName('');
      window.location.reload();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate department code');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="m-4 grid max-w-3xl gap-4">
      <div className="glass-card">
        <h2 className="text-xl font-bold">Profile</h2>
        <p className="mt-2 text-sm">{user?.name}</p>
        <p className="text-sm text-slate-500">{user?.email}</p>
        <p className="mt-1 inline-block rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase text-indigo-500">{user?.role}</p>
        {user?.role === 'admin' && (
          <div className="mt-4 space-y-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-800 dark:bg-indigo-950/30">
            <div>
              <p className="text-xs uppercase tracking-widest text-indigo-600">Base Company Code (one-time)</p>
              <p className="mt-1 text-lg font-bold text-indigo-700 dark:text-indigo-300">{user?.companyCode || 'Not generated'}</p>
            </div>

            <form onSubmit={generateDepartmentCode} className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-indigo-600">Generate Department Code (once per department)</p>
              <input
                className="input-premium"
                placeholder="Department name (e.g. HR, Sales)"
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                required
              />
              <button
                disabled={generating}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Generate Department Code'}
              </button>
            </form>

            <div>
              <p className="text-xs uppercase tracking-widest text-indigo-600">Department Codes</p>
              {user?.departmentCodes?.length ? (
                <ul className="mt-2 space-y-1">
                  {user.departmentCodes.map((department) => (
                    <li key={`${department.name}-${department.code}`} className="flex items-center justify-between rounded-lg bg-white/80 px-2 py-1 text-sm dark:bg-slate-900/60">
                      <span className="font-medium">{department.name}</span>
                      <span className="font-semibold uppercase text-indigo-600 dark:text-indigo-300">{department.code}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-slate-500">No department codes generated yet.</p>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="glass-card flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Appearance</h3>
          <p className="text-sm text-slate-500">Switch between light and dark themes.</p>
        </div>
        <ThemeToggle />
      </div>
      <div className="glass-card">
        <button onClick={onLogout} className="rounded-xl bg-rose-500 px-4 py-2 font-semibold text-white">Logout</button>
      </div>
    </div>
  );
};

