import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import {
  Clock,
  MapPin,
  User,
  Building,
  CalendarCheck,
} from 'lucide-react';
import apiClient from '../services/api';
import { DailySchedule, WeeklyTimetable, TimetableSlot, Room } from '../types';

export const TimetablePage: React.FC = () => {
  const { user } = useAuth();
  const isStudent = user?.role === 'STUDENT';

  const [todaySchedule, setTodaySchedule] = useState<DailySchedule | null>(null);
  const [weeklyTimetable, setWeeklyTimetable] = useState<WeeklyTimetable | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('MONDAY');
  const [loading, setLoading] = useState<boolean>(true);

  const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

  useEffect(() => {
    loadTimetable();
  }, [isStudent]);

  const loadTimetable = async () => {
    try {
      setLoading(true);
      if (isStudent) {
        const [todayRes, weekRes, roomsRes] = await Promise.all([
          apiClient.get<DailySchedule>('/timetable/student/today').catch(() => ({ data: null })),
          apiClient.get<WeeklyTimetable>('/timetable/student/weekly').catch(() => ({ data: null })),
          apiClient.get<Room[]>('/timetable/rooms').catch(() => ({ data: [] })),
        ]);
        if (todayRes.data) {
          setTodaySchedule(todayRes.data);
          setSelectedDay(todayRes.data.day);
        }
        if (weekRes.data) setWeeklyTimetable(weekRes.data);
        setRooms(roomsRes.data);
      } else {
        const [todayRes, weekRes, roomsRes] = await Promise.all([
          apiClient.get<DailySchedule>('/timetable/faculty/today').catch(() => ({ data: null })),
          apiClient.get<WeeklyTimetable>('/timetable/faculty/weekly').catch(() => ({ data: null })),
          apiClient.get<Room[]>('/timetable/rooms').catch(() => ({ data: [] })),
        ]);
        if (todayRes.data) {
          setTodaySchedule(todayRes.data);
          setSelectedDay(todayRes.data.day);
        }
        if (weekRes.data) setWeeklyTimetable(weekRes.data);
        setRooms(roomsRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load timetable', err);
    } finally {
      setLoading(false);
    }
  };

  const currentDaySlots: TimetableSlot[] =
    weeklyTimetable?.schedule_by_day?.[selectedDay] ||
    (todaySchedule?.day === selectedDay ? todaySchedule.slots : []);

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">Academic Timetable & Scheduling</h1>
              <Badge variant="cyan">{isStudent ? 'Student Schedule' : 'Faculty Teaching Schedule'}</Badge>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              {weeklyTimetable?.class_section_name
                ? `${weeklyTimetable.class_section_name} • Academic Session ${weeklyTimetable.academic_year || '2025-2026'}`
                : 'View daily lecture schedules, room allocations, and weekly timetables.'}
            </p>
          </div>
        </div>

        {/* Next / Upcoming Class Hero Banner */}
        {todaySchedule?.upcoming_class && (
          <Card className="p-5 bg-gradient-to-r from-cyan-950/40 via-[#111827] to-[#111827] border-cyan-800/60 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-3 rounded-2xl bg-cyan-950 border border-cyan-700 text-cyan-300 shrink-0">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                      Next Lecture Today ({todaySchedule.day})
                    </span>
                    <Badge variant="cyan">{todaySchedule.upcoming_class.subject_code}</Badge>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">
                    {todaySchedule.upcoming_class.subject_name}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-slate-300 mt-2 flex-wrap">
                    <span className="flex items-center gap-1 font-mono text-cyan-300">
                      <Clock className="w-3.5 h-3.5" />
                      {todaySchedule.upcoming_class.start_time} - {todaySchedule.upcoming_class.end_time}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-400" />
                      {todaySchedule.upcoming_class.room_number} ({todaySchedule.upcoming_class.building})
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {todaySchedule.upcoming_class.faculty_name}
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <Badge variant="emerald">Live Academic Session</Badge>
              </div>
            </div>
          </Card>
        )}

        {/* Days of Week Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#1E293B]">
          {daysOfWeek.map((day) => {
            const isToday = todaySchedule?.day === day;
            const isSelected = selectedDay === day;
            const slotCount = weeklyTimetable?.schedule_by_day?.[day]?.length ?? 0;

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition flex items-center gap-2 shrink-0 ${
                  isSelected
                    ? 'bg-cyan-950 border border-cyan-800 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-[#111827] border border-transparent'
                }`}
              >
                <span>{day}</span>
                {isToday && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                )}
                <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-[#0B0F19] text-slate-400">
                  {slotCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Day's Class Slots Timeline */}
        {loading ? (
          <div className="flex justify-center items-center py-20 text-cyan-400">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : currentDaySlots.length === 0 ? (
          <Card className="p-12 text-center bg-[#111827]/60 border-[#1E293B]">
            <CalendarCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-base font-medium text-slate-300">No lectures scheduled for {selectedDay}</p>
            <p className="text-xs text-slate-500 mt-1">Enjoy your study break or prepare for upcoming coursework.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {currentDaySlots.map((slot, index) => (
              <Card
                key={slot.id || index}
                className="p-5 bg-[#111827]/80 border-[#1E293B] hover:border-cyan-800/60 transition"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start md:items-center gap-4">
                    {/* Time Pillar */}
                    <div className="p-3 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-center min-w-[110px] shrink-0">
                      <p className="text-xs font-mono font-bold text-cyan-300">{slot.start_time}</p>
                      <p className="text-[10px] font-mono text-slate-500">to</p>
                      <p className="text-xs font-mono font-bold text-slate-300">{slot.end_time}</p>
                    </div>

                    {/* Class Details */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/80 border border-cyan-800/80 text-cyan-300">
                          {slot.subject_code || 'CS301'}
                        </span>
                        <h3 className="text-sm font-bold text-white">{slot.subject_name}</h3>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{slot.faculty_name}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-400" />
                          <span>
                            {slot.room_number} • {slot.building}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto">
                    <Badge variant="cyan">Scheduled Lecture</Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Campus Facilities / Lecture Rooms Directory */}
        <div className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Building className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Campus Lecture Rooms & Labs</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {rooms.slice(0, 4).map((room) => (
              <Card key={room.id} className="p-3.5 bg-[#0B0F19] border-[#1E293B]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">{room.room_number}</p>
                    <p className="text-xs text-slate-400">{room.building}</p>
                  </div>
                  <Badge variant={room.room_type === 'LAB' ? 'purple' : 'cyan'}>{room.room_type}</Badge>
                </div>
                <div className="mt-2 pt-2 border-t border-[#1E293B] text-[11px] text-slate-500">
                  Capacity: {room.capacity} seats
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
};
