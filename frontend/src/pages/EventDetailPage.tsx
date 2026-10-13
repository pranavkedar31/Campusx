import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api';
import { MapPin, Users, ArrowLeft, Download, CheckCircle, Clock, ShieldCheck, UserPlus } from 'lucide-react';

interface EventDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  venue: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  registration_deadline?: string;
  attachment_url?: string;
  status: string;
  organizer?: string;
  max_participants: number;
  registration_count: number;
  is_registered: boolean;
}

interface Participant {
  registration_id: string;
  student_id: string;
  roll_number: string;
  full_name: string;
  department_name?: string;
  registered_at: string;
  status: string;
}

export const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const isStaff = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'FACULTY';

  useEffect(() => {
    fetchEvent();
    if (isStaff) {
      fetchParticipants();
    }
  }, [id, isStaff]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<EventDetail>(`/events/${id}`);
      setEvent(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async () => {
    try {
      const res = await apiClient.get<Participant[]>(`/events/${id}/participants`);
      setParticipants(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegisterToggle = async () => {
    if (!event) return;
    try {
      setActionLoading(true);
      if (event.is_registered) {
        await apiClient.post(`/events/${event.id}/cancel`);
      } else {
        await apiClient.post(`/events/${event.id}/register`);
      }
      await fetchEvent();
      if (isStaff) await fetchParticipants();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = async () => {
    if (!id) return;
    try {
      const response = await apiClient.get(`/events/${id}/export-registrations`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Attendees_${event?.title.replace(/ /g, '_') || 'event'}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to export attendee roster.');
    }
  };

  if (loading) {
    return (
      <PageContainer title="Campus Event Details" subtitle="Loading event schedule...">
        <div className="flex justify-center items-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-500"></div>
        </div>
      </PageContainer>
    );
  }

  if (!event) {
    return (
      <PageContainer title="Event Not Found" subtitle="This event could not be located.">
        <div className="text-center py-12">
          <Button onClick={() => navigate('/notices')} variant="secondary">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Events
          </Button>
        </div>
      </PageContainer>
    );
  }

  const isFull = event.registration_count >= event.max_participants;

  return (
    <PageContainer
      title={event.title}
      subtitle={`Official Event Schedule • ${new Date(event.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
      action={
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate('/notices')} variant="secondary" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Schedule
          </Button>
          {user?.role === 'STUDENT' && (
            <Button
              onClick={handleRegisterToggle}
              variant={event.is_registered ? 'secondary' : 'primary'}
              size="sm"
              disabled={actionLoading || (!event.is_registered && isFull)}
              className={event.is_registered ? 'border-emerald-600 text-emerald-400' : ''}
            >
              {event.is_registered ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-1.5 text-emerald-400" /> Cancel Registration
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-1.5" /> {isFull ? 'Event Full' : 'Register for Event'}
                </>
              )}
            </Button>
          )}
          {isStaff && (
            <Button onClick={handleExportCSV} variant="primary" size="sm">
              <Download className="w-4 h-4 mr-1.5" /> Export Attendees (CSV)
            </Button>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Event Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-8 border-[#1E293B] bg-[#0E1526]/80 backdrop-blur space-y-6">
            <div className="flex flex-wrap items-center gap-2.5 pb-4 border-b border-[#1E293B]">
              <Badge variant="cyan">{event.category}</Badge>
              <Badge variant="purple">Status: {event.status}</Badge>
              {event.is_registered && (
                <span className="inline-flex items-center text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800">
                  <CheckCircle className="w-3 h-3 mr-1" /> You are registered
                </span>
              )}
            </div>

            {/* Event Description */}
            <div className="space-y-4 text-slate-200 leading-relaxed font-sans text-base">
              {event.description.split('\n').map((paragraph, idx) => (
                <p key={idx} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Logistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-[#1E293B]">
              <div className="p-4 rounded-xl bg-[#111C35] border border-[#1E2E4F] flex items-center gap-3.5">
                <div className="p-2.5 bg-cyan-950 text-cyan-400 rounded-lg">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-mono uppercase text-slate-400">Venue</p>
                  <p className="text-sm font-semibold text-slate-200">{event.venue}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#111C35] border border-[#1E2E4F] flex items-center gap-3.5">
                <div className="p-2.5 bg-indigo-950 text-indigo-400 rounded-lg">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-mono uppercase text-slate-400">Timing</p>
                  <p className="text-sm font-semibold text-slate-200">
                    {event.start_time || '10:00 AM'} - {event.end_time || '04:00 PM'}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Attendees List (Admin / Faculty only) */}
          {isStaff && (
            <Card className="p-6 border-[#1E293B] bg-[#0E1526]/80 backdrop-blur space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
                <h3 className="text-sm font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" /> Registered Participants ({participants.length})
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  Capacity: {event.registration_count} / {event.max_participants}
                </span>
              </div>

              {participants.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No students registered yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#1E293B] text-slate-400">
                        <th className="py-2.5 px-3">Roll No</th>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">Department</th>
                        <th className="py-2.5 px-3">Registered At</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E293B]/60">
                      {participants.map((p) => (
                        <tr key={p.registration_id} className="hover:bg-[#111C35]/50 transition">
                          <td className="py-2.5 px-3 font-mono text-cyan-400">{p.roll_number}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-200">{p.full_name}</td>
                          <td className="py-2.5 px-3 text-slate-400">{p.department_name || 'Engineering'}</td>
                          <td className="py-2.5 px-3 text-slate-400 font-mono">
                            {new Date(p.registered_at).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Sidebar Registration & Details */}
        <div className="space-y-6">
          <Card className="p-6 border-[#1E293B] bg-[#0E1526]/80 backdrop-blur space-y-4">
            <h3 className="text-sm font-mono uppercase tracking-wider text-slate-400">Registration Details</h3>
            
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-[#1E293B]">
                <span className="text-slate-400">Organizer</span>
                <span className="font-semibold text-slate-200">{event.organizer || 'University Events Council'}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-[#1E293B]">
                <span className="text-slate-400">Event Date</span>
                <span className="font-semibold text-slate-200">
                  {new Date(event.event_date).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-[#1E293B]">
                <span className="text-slate-400">Capacity</span>
                <span className="font-mono font-semibold text-slate-200">
                  {event.registration_count} / {event.max_participants} seats
                </span>
              </div>

              <div className="py-2">
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div
                    className="bg-cyan-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (event.registration_count / event.max_participants) * 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-[#1E293B]">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Digital Pass
                </span>
                <span className="font-semibold text-emerald-400">Included upon RSVP</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
};
export default EventDetailPage;
