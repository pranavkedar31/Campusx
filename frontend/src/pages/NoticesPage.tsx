import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api';
import { BellRing, Calendar, Pin, MapPin, Users, Plus, Check } from 'lucide-react';

interface Notice {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: string;
  target_role: string;
  is_pinned: boolean;
  publish_date: string;
}

interface EventItem {
  id: string;
  title: string;
  description: string;
  category: string;
  venue: string;
  event_date: string;
  max_participants: number;
  registration_count: number;
  is_registered: boolean;
}

export const NoticesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'notices' | 'events'>('notices');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  // Notice Form State
  const [showNoticeModal, setShowNoticeModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('GENERAL');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newTarget, setNewTarget] = useState('ALL');
  const [newPinned, setNewPinned] = useState(false);

  const isStaff = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'FACULTY';

  const fetchData = async () => {
    try {
      const [noticesRes, eventsRes] = await Promise.all([
        apiClient.get<Notice[]>('/notices/'),
        apiClient.get<EventItem[]>('/events/'),
      ]);
      setNotices(noticesRes.data);
      setEvents(eventsRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePublishNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newContent) return;

    try {
      await apiClient.post('/notices/', {
        title: newTitle,
        content: newContent,
        category: newCategory,
        priority: newPriority,
        target_role: newTarget,
        is_pinned: newPinned,
      });
      setShowNoticeModal(false);
      setNewTitle('');
      setNewContent('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to publish notice.');
    }
  };

  const handleRegisterEvent = async (eventId: string, isRegistered: boolean) => {
    try {
      if (isRegistered) {
        await apiClient.post(`/events/${eventId}/cancel`);
      } else {
        await apiClient.post(`/events/${eventId}/register`);
      }
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Registration action failed.');
    }
  };

  const priorityColorMap: Record<string, 'rose' | 'amber' | 'blue' | 'slate'> = {
    URGENT: 'rose',
    HIGH: 'amber',
    MEDIUM: 'blue',
    LOW: 'slate',
  };

  const filteredNotices = categoryFilter
    ? notices.filter((n) => n.category === categoryFilter)
    : notices;

  return (
    <PageContainer
      title="Campus Notices & Events Bulletin"
      subtitle="Official institutional circulars, academic schedules, and campus events"
      action={
        isStaff && activeTab === 'notices' && (
          <Button size="sm" onClick={() => setShowNoticeModal(true)} className="flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Publish Notice
          </Button>
        )
      }
    >
      {/* Navigation Tabs */}
      <div className="flex border-b border-[#1E293B] space-x-6">
        <button
          onClick={() => setActiveTab('notices')}
          className={`pb-3 text-sm font-medium transition flex items-center gap-2 border-b-2 ${
            activeTab === 'notices'
              ? 'border-cyan-400 text-cyan-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BellRing className="w-4 h-4" /> Campus Bulletins ({notices.length})
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`pb-3 text-sm font-medium transition flex items-center gap-2 border-b-2 ${
            activeTab === 'events'
              ? 'border-cyan-400 text-cyan-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" /> Campus Events ({events.length})
        </button>
      </div>

      {/* Notices Tab */}
      {activeTab === 'notices' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {['', 'ACADEMIC', 'EXAMINATION', 'GENERAL', 'PLACEMENT', 'HOLIDAY'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                  categoryFilter === cat
                    ? 'bg-cyan-950 border-cyan-700 text-cyan-300'
                    : 'bg-[#0F172A] border-[#1E293B] text-slate-400 hover:text-white'
                }`}
              >
                {cat || 'All Categories'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNotices.map((n) => (
              <div
                key={n.id}
                onClick={() => navigate(`/notices/${n.id}`)}
                className="cursor-pointer"
              >
                <Card
                  className={`hover:border-cyan-500/60 hover:bg-[#111C35] transition duration-200 ${
                    n.is_pinned ? 'border-cyan-700/80 shadow-lg shadow-cyan-950/40 bg-[#0F172A]/90' : ''
                  }`}
                >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    {n.is_pinned && (
                      <span className="p-1 rounded bg-cyan-950 border border-cyan-800 text-cyan-400">
                        <Pin className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <Badge variant={priorityColorMap[n.priority] || 'blue'}>{n.priority}</Badge>
                    <span className="text-[11px] font-mono text-slate-400 uppercase">{n.category}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(n.publish_date).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mb-2 hover:text-cyan-300 transition">{n.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line line-clamp-3">{n.content}</p>

                <div className="mt-4 pt-3 border-t border-[#1E293B] flex items-center justify-between text-[11px] text-slate-500">
                  <span>Target Audience: {n.target_role}</span>
                  <span className="text-cyan-400 font-medium hover:underline">View Bulletin →</span>
                </div>
              </Card>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {events.map((ev) => (
            <div
              key={ev.id}
              onClick={() => navigate(`/events/${ev.id}`)}
              className="cursor-pointer"
            >
              <Card
                className="flex flex-col justify-between space-y-4 hover:border-cyan-500/60 hover:bg-[#111C35] transition duration-200"
              >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="cyan">{ev.category}</Badge>
                  <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    {ev.registration_count} / {ev.max_participants}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white hover:text-cyan-300 transition">{ev.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">{ev.description}</p>
              </div>

              <div className="space-y-3 border-t border-[#1E293B] pt-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    {new Date(ev.event_date).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    {ev.venue}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-cyan-400 font-medium hover:underline">View Details →</span>
                  {user?.role === 'STUDENT' && (
                    <Button
                      size="sm"
                      variant={ev.is_registered ? 'secondary' : 'primary'}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRegisterEvent(ev.id, ev.is_registered);
                      }}
                    >
                      {ev.is_registered ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-xs">
                          <Check className="w-3 h-3" /> Registered
                        </span>
                      ) : (
                        'Register'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
            </div>
          ))}
        </div>
      )}

      {/* Notice Publish Modal */}
      {showNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-6 w-full max-w-lg space-y-4">
            <h3 className="text-base font-bold text-white">Publish Campus Circular</h3>
            <form onSubmit={handlePublishNotice} className="space-y-4">
              <Input label="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Content</label>
                <textarea
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full bg-[#0F172A] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-[#0F172A] border border-[#1E293B] rounded-xl px-2 py-2 text-xs text-slate-200"
                  >
                    <option value="GENERAL">GENERAL</option>
                    <option value="ACADEMIC">ACADEMIC</option>
                    <option value="EXAMINATION">EXAMINATION</option>
                    <option value="PLACEMENT">PLACEMENT</option>
                    <option value="HOLIDAY">HOLIDAY</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full bg-[#0F172A] border border-[#1E293B] rounded-xl px-2 py-2 text-xs text-slate-200"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Audience</label>
                  <select
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                    className="w-full bg-[#0F172A] border border-[#1E293B] rounded-xl px-2 py-2 text-xs text-slate-200"
                  >
                    <option value="ALL">ALL</option>
                    <option value="STUDENT">STUDENT</option>
                    <option value="FACULTY">FACULTY</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newPinned}
                  onChange={(e) => setNewPinned(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
                />
                Pin to top of bulletin board
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowNoticeModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Publish Notice
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
