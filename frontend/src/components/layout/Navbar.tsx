import React, { useState, useEffect } from 'react';
import { Layers, LogOut, User as UserIcon, Bell, CheckCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import apiClient from '../../services/api';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  const fetchNotifications = async () => {
    try {
      const [countRes, listRes] = await Promise.all([
        apiClient.get('/notifications/unread-count'),
        apiClient.get('/notifications/'),
      ]);
      setUnreadCount(countRes.data.unread_count);
      setNotifications(listRes.data.slice(0, 5));
    } catch (e) {
      // Ignore background notification fetch errors
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      await apiClient.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const roleVariantMap: Record<string, 'cyan' | 'blue' | 'emerald' | 'amber' | 'rose' | 'slate'> = {
    SUPER_ADMIN: 'rose',
    ADMIN: 'cyan',
    FACULTY: 'blue',
    STUDENT: 'emerald',
    PLACEMENT_OFFICER: 'amber',
    MANAGEMENT: 'slate',
  };

  return (
    <header className="h-16 border-b border-[#1E293B] bg-[#0F172A]/90 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Layers className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight text-white">CampusX</span>
          <span className="text-[10px] font-mono text-cyan-400 ml-1.5 px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800">
            OS
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent hover:border-slate-700 transition relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full ring-2 ring-[#0B0F19]"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[#111827] border border-[#1E293B] rounded-2xl shadow-2xl p-4 z-50 space-y-3">
              <div className="flex items-center justify-between border-b border-[#1E293B] pb-2">
                <span className="text-xs font-bold text-white">Notifications ({unreadCount})</span>
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" /> Mark read
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-center py-4 text-xs text-slate-500">No active notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                        n.is_read
                          ? 'bg-[#0F172A]/50 border-slate-800/50 text-slate-400'
                          : 'bg-cyan-950/40 border-cyan-800/60 text-slate-200 font-medium'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{n.title}</span>
                        <span className="text-[10px] text-slate-500">{new Date(n.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {user && (
          <div className="flex items-center space-x-3 pr-2 border-r border-[#1E293B]">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-white leading-tight">{user.full_name}</div>
              <div className="text-[11px] text-slate-400">{user.email}</div>
            </div>
            <Badge variant={roleVariantMap[user.role] || 'cyan'} size="sm">
              {user.role}
            </Badge>
          </div>
        )}

        <button
          onClick={logout}
          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/60 transition"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
