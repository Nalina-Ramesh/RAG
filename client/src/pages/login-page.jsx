import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import { useAuth } from '../state/auth-context';
import { ThemeToggle } from '../components/theme-toggle';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', role: 'employee', companyCode: '', departmentCode: '', remember: true });
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        email: form.email,
        password: form.password,
        role: form.role,
        ...(form.role === 'employee' ? { companyCode: form.companyCode, departmentCode: form.departmentCode } : {})
      };
      const user = await login(payload);
      toast.success('Welcome back');
      navigate(user.role === 'admin' ? '/documents' : '/chat', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-500/20 via-cyan-500/10 to-fuchsia-500/20 px-4">
      <div className="absolute right-6 top-6"><ThemeToggle /></div>
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={onSubmit}
        className="glass-card w-full max-w-md space-y-4"
      >
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-indigo-500">OpsMind AI</p>
          <h1 className="text-2xl font-bold">Secure Sign In</h1>
          <p className="mt-1 text-sm text-slate-500">Choose login type before entering credentials.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button type="button" onClick={() => setForm((f) => ({ ...f, role: 'employee' }))} className={`rounded-lg px-3 py-2 text-sm font-semibold ${form.role === 'employee' ? 'bg-white text-indigo-600 dark:bg-slate-900' : 'text-slate-500'}`}>
            Employee Login
          </button>
          <button type="button" onClick={() => setForm((f) => ({ ...f, role: 'admin' }))} className={`rounded-lg px-3 py-2 text-sm font-semibold ${form.role === 'admin' ? 'bg-white text-indigo-600 dark:bg-slate-900' : 'text-slate-500'}`}>
            Admin Login
          </button>
        </div>
        <input className="input-premium" placeholder="Work email" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        <input className="input-premium" placeholder="Password" type="password" required value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
        {form.role === 'employee' && (
          <>
            <input
              className="input-premium uppercase"
              placeholder="Company code"
              required
              value={form.companyCode}
              onChange={(e) => setForm((f) => ({ ...f, companyCode: e.target.value.toUpperCase() }))}
            />
            <input
              className="input-premium uppercase"
              placeholder="Department code"
              required
              value={form.departmentCode}
              onChange={(e) => setForm((f) => ({ ...f, departmentCode: e.target.value.toUpperCase() }))}
            />
          </>
        )}
        <label className="flex items-center gap-2 text-sm text-slate-500">
          <input type="checkbox" checked={form.remember} onChange={(e) => setForm((f) => ({ ...f, remember: e.target.checked }))} />
          Remember me
        </label>
        <button disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 py-3 font-semibold text-white disabled:opacity-50">
          {loading ? 'Signing in...' : 'Login'}
        </button>
        <p className="text-sm text-slate-500">
          No account? <Link className="font-semibold text-indigo-500" to="/signup">Create one</Link>
        </p>
      </motion.form>
    </div>
  );
};

