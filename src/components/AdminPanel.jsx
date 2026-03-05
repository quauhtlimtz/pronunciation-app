import { useState, useEffect } from "react";
import { getAdminStats } from "../services/supabase";
import { LESSON_DEFS } from "../data/lessons";
import { IconBack, IconRefresh } from "./Icons";

export function AdminPanel({ onBack }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const data = await getAdminStats();
    setStats(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="page">
      <div className="page-content pt-10 text-center">
        <p className="text-sm text-gray-500">Loading admin data…</p>
      </div>
    </div>
  );

  const { users, progress, activity } = stats;
  const totalCompleted = progress.filter(p => p.completed).length;
  const todayActivity = activity.filter(a => {
    const d = new Date(a.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  return (
    <div className="page">
      <div className="sticky top-0 z-50 bg-gray-50 dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <button className="btn btn-default !px-3.5 !py-2" onClick={onBack}><IconBack size="md" /></button>
          <p className="text-base font-semibold flex-1">Admin Panel</p>
          <button className="btn btn-default btn-sm gap-1" onClick={load}><IconRefresh size="sm" /> refresh</button>
        </div>
      </div>

      <div className="page-content">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="card p-3 text-center">
            <div className="text-2xl font-semibold">{users.length}</div>
            <p className="font-mono text-sm text-gray-500 mt-1">users</p>
          </div>
          <div className="card p-3 text-center">
            <div className="text-2xl font-semibold">{totalCompleted}</div>
            <p className="font-mono text-sm text-gray-500 mt-1">completions</p>
          </div>
          <div className="card p-3 text-center">
            <div className="text-2xl font-semibold">{todayActivity}</div>
            <p className="font-mono text-sm text-gray-500 mt-1">today</p>
          </div>
        </div>

        {/* Users table */}
        <h2 className="mono-label mb-2">Users</h2>
        <div className="flex flex-col mb-6">
          {users.map(u => {
            const userProgress = progress.filter(p => p.user_id === u.id);
            const completed = userProgress.filter(p => p.completed).length;
            const lastActivity = activity.find(a => a.user_id === u.id);
            return (
              <div key={u.id} className="border-b border-gray-100 dark:border-gray-800 py-3 px-2">
                <div className="flex items-center gap-2.5">
                  {u.avatar_url && <img src={u.avatar_url} className="w-8 h-8 rounded-full" alt="" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{u.name || u.email}</p>
                    <p className="font-mono text-sm text-gray-500 truncate">{u.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-sm">{completed}/{LESSON_DEFS.length}</p>
                    <p className="font-mono text-sm text-gray-500">
                      {u.last_seen ? new Date(u.last_seen).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          {users.length === 0 && <p className="text-sm text-gray-500 py-4">No users yet</p>}
        </div>

        {/* Recent activity */}
        <h2 className="mono-label mb-2">Recent Activity</h2>
        <div className="flex flex-col">
          {activity.slice(0, 50).map(a => {
            const u = users.find(u => u.id === a.user_id);
            const time = new Date(a.created_at);
            return (
              <div key={a.id} className="border-b border-gray-100 dark:border-gray-800 py-2 px-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-mono text-gray-500 shrink-0">
                    {time.toLocaleDateString()} {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="truncate">{u?.name || u?.email || "?"}</span>
                  <span className="font-mono text-gray-500 shrink-0">{a.action}</span>
                </div>
                {a.details && Object.keys(a.details).length > 0 && (
                  <p className="font-mono text-sm text-gray-400 mt-0.5 pl-2">
                    {JSON.stringify(a.details)}
                  </p>
                )}
              </div>
            );
          })}
          {activity.length === 0 && <p className="text-sm text-gray-500 py-4">No activity yet</p>}
        </div>
      </div>
    </div>
  );
}
