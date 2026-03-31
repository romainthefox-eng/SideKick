'use client';

import { useState, useEffect } from 'react';
import { DailyEvent } from '@/app/context/PropertyContext';

interface DailyAgendaProps {
  events: DailyEvent[];
  onAddEvent: (event: Omit<DailyEvent, 'id' | 'created_at'>) => void;
}

export default function DailyAgenda({ events }: DailyAgendaProps) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const todayEvents = isClient ? events.filter(e => {
    const eventDate = new Date(e.date).toDateString();
    const today = new Date().toDateString();
    return eventDate === today;
  }) : [];

  const sortedEvents = [...todayEvents].sort((a, b) => {
    if (!a.time || !b.time) return 0;
    return a.time.localeCompare(b.time);
  });

  const typeConfig: Record<string, { label: string; icon: string; color: string }> = {
    visite: { label: 'Visite', icon: 'fas fa-door-open', color: '#10b981' },
    entretien: { label: 'Entretien', icon: 'fas fa-wrench', color: '#f59e0b' },
    autre: { label: 'Événement', icon: 'fas fa-calendar', color: '#3b82f6' }
  };

  return (
    <div className="daily-agenda">
      <div className="section-header">
        <h3>📅 Aujourd'hui</h3>
        <span className="count">{sortedEvents.length}</span>
      </div>

      {sortedEvents.length === 0 ? (
        <div className="empty-state">
          <p>Aucun événement</p>
        </div>
      ) : (
        <div className="events-list">
          {sortedEvents.map(event => (
            <div key={event.id} className="event-item">
              <div className="event-time">
                {event.time ? event.time : '↔'}
              </div>
              <div className="event-bubble" style={{ background: `${typeConfig[event.type].color}20`, color: typeConfig[event.type].color }}>
                <i className={typeConfig[event.type].icon}></i>
              </div>
              <div className="event-info">
                <div className="event-type">{typeConfig[event.type].label}</div>
                <div className="event-title">{event.title}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .daily-agenda {
          background: white;
          border-radius: 8px;
          padding: 1.25rem;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid #f0f0f0;
        }

        .section-header h3 {
          margin: 0;
          font-size: 1rem;
          color: #1f2937;
          font-weight: 700;
        }

        .count {
          background: #dbeafe;
          color: #1e40af;
          padding: 0.25rem 0.6rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
          text-align: center;
          min-width: 24px;
        }

        .empty-state {
          text-align: center;
          padding: 1.5rem 0;
          color: #9ca3af;
          font-size: 0.9rem;
        }

        .events-list {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .event-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: #f9fafb;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }

        .event-time {
          flex-shrink: 0;
          width: 40px;
          text-align: center;
          font-weight: 700;
          font-size: 0.85rem;
          color: #6b7280;
        }

        .event-bubble {
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
        }

        .event-info {
          flex: 1;
          min-width: 0;
        }

        .event-type {
          font-size: 0.7rem;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.2px;
          margin-bottom: 0.2rem;
        }

        .event-title {
          font-size: 0.9rem;
          color: #1f2937;
          font-weight: 600;
          word-break: break-word;
        }
      `}</style>
    </div>
  );
}
