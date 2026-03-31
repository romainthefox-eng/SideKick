'use client';

import { useState } from 'react';
import { useProperty } from '../context/PropertyContext';

interface Event {
  id: number;
  title: string;
  date: string;
  type: 'location' | 'location-end' | 'tache' | 'incident' | 'maintenance' | 'inspection' | 'autre';
  property: string;
  description: string;
  rentalId?: number;
  priority?: 'low' | 'medium' | 'high';
  completed?: boolean;
  resolved?: boolean;
}

export default function Calendrier() {
  const { logements, rentals, tasks, incidents, getAllRentals } = useProperty();
  
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 28));
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    type: 'maintenance' as const,
    property: '',
    description: ''
  });

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  // Rental events: arrival + departure
  const getRentalEvents = (): Event[] => {
    const evs: Event[] = [];
    rentals.forEach((rental, idx) => {
      const lgName = logements.find(l => l.id === rental.logement_id)?.name ?? 'Inconnu';
      evs.push({
        id: -(idx * 2 + 1),
        title: `Arrivée : ${rental.tenant_name}`,
        date: rental.start_date,
        type: 'location',
        property: lgName,
        description: `${rental.tenant_name}${rental.email ? ' — ' + rental.email : ''}`,
        rentalId: rental.id,
      });
      evs.push({
        id: -(idx * 2 + 2),
        title: `Départ : ${rental.tenant_name}`,
        date: rental.end_date,
        type: 'location-end',
        property: lgName,
        description: `Fin du séjour — ${lgName}`,
        rentalId: rental.id,
      });
    });
    return evs;
  };

  // Task events
  const getTaskEvents = (): Event[] => {
    return tasks
      .filter(t => t.due_date)
      .map(t => ({
        id: t.id + 100_000,
        title: t.title,
        date: t.due_date!,
        type: 'tache' as const,
        property: logements.find(l => l.id === t.logement_id)?.name ?? 'Inconnu',
        description: t.description ?? '',
        priority: t.priority,
        completed: t.completed,
      }));
  };

  // Incident events
  const getIncidentEvents = (): Event[] => {
    return incidents.map(inc => ({
      id: inc.id + 200_000,
      title: inc.title,
      date: inc.date,
      type: 'incident' as const,
      property: logements.find(l => l.id === inc.logement_id)?.name ?? 'Inconnu',
      description: inc.description ?? '',
      priority: inc.priority,
      resolved: inc.resolved,
    }));
  };

  const allEvents = [...getRentalEvents(), ...getTaskEvents(), ...getIncidentEvents(), ...events];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleAddEvent = () => {
    if (newEvent.title && selectedDate && newEvent.property) {
      const event: Event = {
        id: Date.now(),
        title: newEvent.title,
        date: selectedDate,
        type: newEvent.type,
        property: newEvent.property,
        description: newEvent.description
      };
      setEvents([...events, event]);
      setNewEvent({ title: '', type: 'maintenance', property: '', description: '' });
      setShowAddEvent(false);
    }
  };

  const handleDeleteEvent = (id: number) => {
    setEvents(events.filter(e => e.id !== id));
  };

  const getDayEvents = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return allEvents.filter(e => e.date === dateStr);
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'location':     return '#10b981'; // vert — arrivée
      case 'location-end': return '#06b6d4'; // cyan — départ
      case 'tache':        return '#8b5cf6'; // violet — tâche
      case 'incident':     return '#ef4444'; // rouge — incident
      case 'maintenance':  return '#f59e0b'; // orange
      case 'inspection':   return '#667eea'; // bleu
      case 'autre':        return '#6b7280'; // gris
      default:             return '#667eea';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'location':     return 'fa-sign-in-alt';
      case 'location-end': return 'fa-sign-out-alt';
      case 'tache':        return 'fa-tasks';
      case 'incident':     return 'fa-exclamation-triangle';
      case 'maintenance':  return 'fa-wrench';
      case 'inspection':   return 'fa-search';
      default:             return 'fa-calendar';
    }
  };

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'location':     return 'Arrivée';
      case 'location-end': return 'Départ';
      case 'tache':        return 'Tâche';
      case 'incident':     return 'Incident';
      case 'maintenance':  return 'Maintenance';
      case 'inspection':   return 'Inspection';
      default:             return 'Autre';
    }
  };

  const priorityLabel: Record<string, string> = { low: 'Basse', medium: 'Moyenne', high: 'Haute' };
  const priorityColor: Record<string, string> = { low: '#10b981', medium: '#f59e0b', high: '#ef4444' };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days.map((day, idx) => {
      if (!day) {
        return <div key={`empty-${idx}`} className="calendar-day empty"></div>;
      }

      const dayEvents = getDayEvents(day);
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateStr === new Date().toISOString().split('T')[0];

      return (
        <div 
          key={day} 
          className={`calendar-day ${isToday ? 'today' : ''}`}
          onClick={() => {
            setSelectedDate(dateStr);
            setShowAddEvent(true);
          }}
        >
          <div className="day-number">{day}</div>
          <div className="day-events">
            {dayEvents.slice(0, 2).map(event => (
              <div 
                key={event.id}
                className="event-dot"
                style={{ backgroundColor: getEventColor(event.type) }}
                title={event.title}
              ></div>
            ))}
            {dayEvents.length > 2 && (
              <div className="more-events">+{dayEvents.length - 2}</div>
            )}
          </div>
        </div>
      );
    });
  };

  const sortedEvents = allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div>
      <div className="header">
        <h1>Calendrier</h1>
        <p>Gérer les dates de location et les événements</p>
      </div>

      <div className="content-card calendar-container">
        <div className="calendar-wrapper">
          <div className="calendar-header">
            <button className="btn-nav" onClick={handlePreviousMonth}>
              <i className="fas fa-chevron-left"></i>
            </button>
            <h2>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
            <button className="btn-nav" onClick={handleNextMonth}>
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>

          <div className="calendar-grid">
            <div className="calendar-days-header">
              {dayNames.map(day => (
                <div key={day} className="day-header">{day}</div>
              ))}
            </div>
            <div className="calendar-days">
              {renderCalendar()}
            </div>
          </div>

          <div className="event-legend">
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#10b981' }}></div>
              <span>Arrivée</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#06b6d4' }}></div>
              <span>Départ</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#8b5cf6' }}></div>
              <span>Tâche</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#ef4444' }}></div>
              <span>Incident</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#f59e0b' }}></div>
              <span>Maintenance</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#667eea' }}></div>
              <span>Inspection</span>
            </div>
          </div>
        </div>

        <div className="events-sidebar">
          <h3>Événements à venir</h3>
          <button 
            className="btn btn-primary"
            onClick={() => {
              setSelectedDate(new Date().toISOString().split('T')[0]);
              setShowAddEvent(true);
            }}
          >
            <i className="fas fa-plus"></i> Ajouter un événement
          </button>

          <div className="events-list">
            {sortedEvents.length === 0 ? (
              <p className="no-events">Aucun événement programmé</p>
            ) : (
              sortedEvents.map(event => (
                <div key={`${event.id}-${event.date}`} className="event-card">
                  <div
                    className="event-color-bar"
                    style={{ backgroundColor: getEventColor(event.type) }}
                  ></div>
                  <div className="event-details">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <i
                        className={`fas ${getEventIcon(event.type)}`}
                        style={{ color: getEventColor(event.type), fontSize: 11 }}
                      ></i>
                      <span style={{ fontSize: 10, fontWeight: 700, color: getEventColor(event.type), textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {getEventLabel(event.type)}
                      </span>
                      {event.priority && (
                        <span style={{ marginLeft: 'auto', fontSize: 10, padding: '1px 6px', borderRadius: 4, background: priorityColor[event.priority] + '20', color: priorityColor[event.priority], fontWeight: 600 }}>
                          {priorityLabel[event.priority]}
                        </span>
                      )}
                      {event.completed && (
                        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#10b981', fontWeight: 600 }}>✓ Terminée</span>
                      )}
                      {event.resolved && (
                        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#10b981', fontWeight: 600 }}>✓ Résolu</span>
                      )}
                    </div>
                    <h4 style={{ textDecoration: (event.completed || event.resolved) ? 'line-through' : 'none', opacity: (event.completed || event.resolved) ? 0.6 : 1 }}>{event.title}</h4>
                    <p className="event-date">
                      <i className="fas fa-calendar"></i> {new Date(event.date + 'T12:00:00').toLocaleDateString('fr-FR')}
                    </p>
                    <p className="event-property">
                      <i className="fas fa-home"></i> {event.property}
                    </p>
                    {event.description && (
                      <p className="event-description">{event.description}</p>
                    )}
                  </div>
                  {event.id > 0 && event.id < 100_000 && (
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteEvent(event.id)}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showAddEvent && (
        <div className="modal-overlay" onClick={() => setShowAddEvent(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Ajouter un événement</h3>
            <div className="form-group">
              <label>Date</label>
              <input 
                type="text" 
                value={selectedDate}
                disabled
              />
            </div>
            <div className="form-group">
              <label>Titre</label>
              <input 
                type="text"
                value={newEvent.title}
                onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                placeholder="Titre de l'événement"
              />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select 
                value={newEvent.type}
                onChange={(e) => setNewEvent({...newEvent, type: e.target.value as any})}
              >
                <option value="maintenance">Maintenance</option>
                <option value="inspection">Inspection</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div className="form-group">
              <label>Propriété</label>
              <select 
                value={newEvent.property}
                onChange={(e) => setNewEvent({...newEvent, property: e.target.value})}
              >
                <option value="">Sélectionner une propriété</option>
                {logements.map(log => (
                  <option key={log.id} value={log.name}>{log.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea 
                value={newEvent.description}
                onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                placeholder="Description optionnelle"
              ></textarea>
            </div>
            <div className="modal-buttons">
              <button className="btn btn-secondary" onClick={() => setShowAddEvent(false)}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleAddEvent}>
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
