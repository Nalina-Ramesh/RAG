import { ThemeToggle } from '../components/theme-toggle';

export const SettingsPage = ({ user, onLogout }) => {
  return (
    <div className="m-4 grid max-w-3xl gap-4">
      <div className="glass-card">
        <h2 className="text-xl font-bold">Profile</h2>
        <p className="mt-2 text-sm">{user?.name}</p>
        <p className="text-sm text-slate-500">{user?.email}</p>
        <p className="mt-1 inline-block rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase text-indigo-500">{user?.role}</p>
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

