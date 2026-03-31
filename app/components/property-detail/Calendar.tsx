'use client';

import { useState } from 'react';
import { DailyEvent } from '@/app/context/PropertyContext';
import ReservationModal from '@/app/components/ReservationModal';

interface CalendarProps {
  logementId: number;
  events: DailyEvent[];
  onAddEvent: (event: Omit<DailyEvent, 'id' | 'created_at'>) => void;
}

export default function Calendar({ logementId, events, onAddEvent }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [modalStartDate, setModalStartDate] = useState<string | undefined>();
  const [showEventForm, setShowEventForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    type: 'autre' as 'visite' | 'entretien' | 'autre',
    date: new Date().toISOString().split('T')[0],
    time: '10:00'
  });

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatMonthYear = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date);
  };

  const getEventsForDate = (dateStr: string) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      const eventDateStr = eventDate.toISOString().split('T')[0];
      return eventDateStr === dateStr;
    });
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleSubmitEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    onAddEvent({
      logement_id: logementId,
      title: formData.title,
      type: formData.type,
      date: new Date(formData.date).toISOString(),
      time: formData.time
    });

    setFormData({
      title: '',
      type: 'autre',
      date: new Date().toISOString().split('T')[0],
      time: '10:00'
    });
    setShowEventForm(false);
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  
  // Build calendar grid: 42 cells (6 weeks x 7 days)
  const calendarCells = [];
  
  // Empty cells before month starts
  for (let i = 0; i < firstDay; i++) {
    calendarCells.push(null);
  }
  
  // Days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push(i);
  }
  
  // Empty cells after month ends (fill to 42)
  while (calendarCells.length < 42) {
    calendarCells.push(null);
  }

  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button onClick={handlePrevMonth} className="nav-btn">
          <i className="fas fa-chevron-left"></i>
        </button>
        <h2>{formatMonthYear(currentDate).charAt(0).toUpperCase() + formatMonthYear(currentDate).slice(1)}</h2>
        <button onClick={handleNextMonth} className="nav-btn">
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>

      <div className="calendar-grid">
        {dayNames.map((day) => (
          <div key={day} className="day-header">
            {day}
          </div>
        ))}
        {calendarCells.map((day, idx) => {
          const dateStr = day ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
          const dayEvents = day ? getEventsForDate(dateStr) : [];
          const isToday = day && new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

          return (
            <div key={idx} className={`calendar-day ${day ? 'active' : 'inactive'} ${isToday ? 'today' : ''}`}>
              {day && (
                <>
                  <div className="day-number">{day}</div>
                  <div className="day-events">
                    {dayEvents.slice(0, 2).map(event => (
                      <div key={event.id} className={`event-dot type-${event.type}`} title={event.title}>
                        <i className={`fas fa-${event.type === 'visite' ? 'door-open' : event.type === 'entretien' ? 'tools' : 'circle'}`}></i>
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="event-more">+{dayEvents.length - 2}</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Action buttons ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => { setModalStartDate(undefined); setShowReservationModal(true); }}
          className="add-event-btn"
          style={{ background: '#2c5aa0', color: 'white', borderColor: '#2c5aa0' }}
        >
          <i className="fas fa-calendar-plus"></i> Nouvelle réservation
        </button>
        <button onClick={() => setShowEventForm(!showEventForm)} className="add-event-btn">
          <i className="fas fa-plus"></i> Ajouter un rappel
        </button>
      </div>

      {/* ── Reminder form (unchanged) ──────────────────────────────────────── */}
      {showEventForm && (
        <div className="event-form">
          <h3>Nouveau rappel</h3>
          <form onSubmit={handleSubmitEvent}>
            <div className="form-group">
              <label>Titre *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Titre du rappel"
                required
              />
            </div>

            <div className="form-group">
              <label>Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              >
                <option value="visite">Visite</option>
                <option value="entretien">Entretien</option>
                <option value="autre">Autre</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Heure</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">Ajouter</button>
              <button type="button" onClick={() => setShowEventForm(false)} className="btn-secondary">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Reservation modal (shared with Reservations tab) ──────────────── */}
      {showReservationModal && (
        <ReservationModal
          defaultLogementId={logementId}
          defaultStartDate={modalStartDate}
          onClose={() => setShowReservationModal(false)}
        />
      )}

    </div>
  );
}
