'use client';
import { useState, useEffect } from 'react';
import { appointmentsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { Calendar, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await appointmentsAPI.getAll({
        month: currentMonth.getMonth() + 1,
        year: currentMonth.getFullYear()
      });
      setAppointments(data);
    } catch { toast.error('Failed to load appointments'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [currentMonth]);

  const updateStatus = async (id: number, status: string) => {
    setUpdating(id);
    try {
      await appointmentsAPI.update(id, { status });
      toast.success(`Appointment ${status}`);
      load();
    } catch { toast.error('Failed to update'); }
    finally { setUpdating(null); }
  };

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDay = startOfMonth(currentMonth).getDay();
  const aptDates = appointments.map(a => new Date(a.appointment_date));
  const selectedApts = selected ? appointments.filter(a => isSameDay(new Date(a.appointment_date), selected)) : appointments;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="font-syne font-bold text-2xl text-construction-dark">Appointments</h1>
        <p className="text-construction-mid text-sm">{appointments.length} appointments this month</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Calendar */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-syne font-bold text-sm text-construction-dark">{format(currentMonth, 'MMMM yyyy')}</h3>
            <div className="flex gap-1">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-construction-mid py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array(startDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
            {days.map(day => {
              const hasApt = aptDates.some(d => isSameDay(d, day));
              const isSelected = selected && isSameDay(day, selected);
              const today = isToday(day);
              return (
                <button key={day.toString()} onClick={() => setSelected(isSelected ? null : day)}
                  className={`aspect-square rounded-lg text-xs font-medium flex flex-col items-center justify-center relative transition-all ${
                    isSelected ? 'bg-yellow-DEFAULT text-white' :
                    today ? 'bg-construction-dark text-white' :
                    hasApt ? 'bg-yellow-light text-yellow-dark' :
                    'hover:bg-gray-100 text-construction-dark'
                  }`}>
                  {format(day, 'd')}
                  {hasApt && !isSelected && !today && <div className="w-1 h-1 rounded-full bg-yellow-dark absolute bottom-0.5" />}
                </button>
              );
            })}
          </div>

          {selected && (
            <button onClick={() => setSelected(null)} className="mt-3 text-xs text-yellow-dark hover:underline">
              Clear selection — show all
            </button>
          )}
        </div>

        {/* Appointments list */}
        <div className="lg:col-span-3 space-y-3">
          {selected && (
            <div className="flex items-center gap-2 text-sm font-medium text-construction-dark">
              <Calendar size={15} className="text-yellow-dark" />
              {format(selected, 'EEEE, MMMM d, yyyy')}
            </div>
          )}

          {loading ? (
            <div className="card p-6 text-center text-construction-mid text-sm">Loading...</div>
          ) : selectedApts.length === 0 ? (
            <div className="card p-8 text-center">
              <Calendar size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-construction-mid text-sm">No appointments {selected ? 'on this date' : 'this month'}</p>
            </div>
          ) : selectedApts.map(apt => (
            <div key={apt.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-syne font-bold text-sm text-construction-dark">{apt.customer_name}</p>
                    <span className={`badge-${apt.status}`}>{apt.status}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-construction-mid">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {format(new Date(apt.appointment_date), 'MMM d')} at {apt.appointment_time}
                    </span>
                    <span>{apt.purpose}</span>
                  </div>
                  <div className="text-xs text-construction-mid mt-1">{apt.customer_email} · {apt.customer_phone}</div>
                </div>
                {apt.status === 'pending' && (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => updateStatus(apt.id, 'approved')} disabled={updating === apt.id}
                      className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors" title="Approve">
                      <CheckCircle size={15} />
                    </button>
                    <button onClick={() => updateStatus(apt.id, 'rejected')} disabled={updating === apt.id}
                      className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors" title="Reject">
                      <XCircle size={15} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
