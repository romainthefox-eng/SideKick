'use client';

import { useProperty, Task, Incident } from '../context/PropertyContext';
import Link from 'next/link';

export default function NotificationCenter() {
  const { getNotifications, pendingDrafts, dismissPendingDraft, logements } = useProperty();
  
  const notifications = getNotifications();
  const taskNotifications = notifications.filter(n => n.type === 'task');
  const incidentNotifications = notifications.filter(n => n.type === 'incident');
  const totalBadge = notifications.length + pendingDrafts.length;

  if (totalBadge === 0) {
    return (
      <div className="notification-center">
        <div className="notification-header">
          <h2><i className="fas fa-bell"></i> Centre de Notifications</h2>
        </div>
        <div className="empty-notifications">
          <i className="fas fa-check-circle"></i>
          <p>Toutes les tâches et incidents sont résolus! 🎉</p>
        </div>
        <style jsx>{`
          .notification-center {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            border: 1px solid #e5e7eb;
            grid-column: 1 / -1;
          }

          .notification-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid #f3f4f6;
          }

          .notification-header h2 {
            margin: 0;
            font-size: 1.2rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            color: #1f2937;
          }

          .empty-notifications {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            color: #10b981;
            text-align: center;
            background: #f0fdf4;
            border-radius: 8px;
          }

          .empty-notifications i {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
          }

          .empty-notifications p {
            margin: 0;
            font-weight: 500;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="notification-center">
      <div className="notification-header">
        <h2>
          <i className="fas fa-bell"></i> Centre de Notifications
        </h2>
        <span className="notification-badge">{totalBadge}</span>
      </div>

      <div className="notifications-grid">
        {taskNotifications.length > 0 && (
          <div className="notification-section tasks-section">
            <h3>
              <i className="fas fa-tasks"></i> Tâches à accomplir ({taskNotifications.length})
            </h3>
            <div className="notifications-list">
              {taskNotifications.map(notif => {
                const task = notif.item as Task;
                return (
                  <div key={task.id} className="notification-item task-item">
                    <div className="notification-icon">
                      <i className="fas fa-square-check"></i>
                    </div>
                    <div className="notification-content">
                      <p className="notification-title">{task.title}</p>
                      <p className="notification-property">
                        <i className="fas fa-building"></i> {notif.logement.name}
                      </p>
                      {task.description && (
                        <p className="notification-description">{task.description}</p>
                      )}
                      <div className="notification-meta">
                        <span className={`task-priority priority-${task.priority}`}>
                          {task.priority === 'low' ? 'Basse' : task.priority === 'medium' ? 'Moyenne' : 'Haute'} priorité
                        </span>
                        <span className="due-date">
                          <i className="fas fa-calendar"></i>
                          {task.due_date ? new Date(task.due_date).toLocaleDateString('fr-FR') : 'Sans date'}
                        </span>
                        {task.assigned_to && (
                          <span className="assigned">
                            <i className="fas fa-user"></i> {task.assigned_to}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link href={`/properties/${notif.logement.id}`}>
                      <button className="btn-view">Voir</button>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {incidentNotifications.length > 0 && (
          <div className="notification-section incidents-section">
            <h3>
              <i className="fas fa-exclamation-circle"></i> Incidents à gérer ({incidentNotifications.length})
            </h3>
            <div className="notifications-list">
              {incidentNotifications.map(notif => {
                const incident = notif.item as Incident;
                return (
                  <div key={incident.id} className={`notification-item incident-item priority-${incident.priority}`}>
                    <div className="notification-icon">
                      <i className="fas fa-alert"></i>
                    </div>
                    <div className="notification-content">
                      <p className="notification-title">{incident.title}</p>
                      <p className="notification-property">
                        <i className="fas fa-building"></i> {notif.logement.name}
                      </p>
                      {incident.description && (
                        <p className="notification-description">{incident.description}</p>
                      )}
                      <div className="notification-meta">
                        <span className="incident-category">
                          {incident.category === 'maintenance' && 'Maintenance'}
                          {incident.category === 'damage' && 'Dommage'}
                          {incident.category === 'complaint' && 'Réclamation'}
                          {incident.category === 'other' && 'Autre'}
                        </span>
                        <span className={`incident-priority priority-${incident.priority}`}>
                          {incident.priority === 'low' ? 'Basse' : incident.priority === 'medium' ? 'Moyenne' : 'Haute'} priorité
                        </span>
                        <span className="incident-date">
                          <i className="fas fa-calendar"></i>
                          {new Date(incident.date).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                    <Link href={`/properties/${notif.logement.id}`}>
                      <button className="btn-view">Voir</button>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {pendingDrafts.length > 0 && (
          <div className="notification-section drafts-section">
            <h3>
              <i className="fas fa-clock"></i> Réservations en attente ({pendingDrafts.length})
            </h3>
            <div className="notifications-list">
              {pendingDrafts.map(draft => {
                const logement = logements.find(l => l.id === draft.logement_id);
                return (
                  <div key={draft.id} className="notification-item draft-item">
                    <div className="notification-icon">
                      <i className="fas fa-calendar-plus"></i>
                    </div>
                    <div className="notification-content">
                      <p className="notification-title">
                        {draft.tenant_name ?? 'Voyageur non renseigné'}
                        {logement ? ` — ${logement.name}` : ''}
                      </p>
                      {(draft.start_date || draft.end_date) && (
                        <p className="notification-property">
                          <i className="fas fa-calendar"></i>{' '}
                          {draft.start_date ? new Date(draft.start_date).toLocaleDateString('fr-FR') : '?'}
                          {' → '}
                          {draft.end_date ? new Date(draft.end_date).toLocaleDateString('fr-FR') : '?'}
                        </p>
                      )}
                      {draft.note && (
                        <p className="notification-description">Infos manquantes : {draft.note}</p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link href="/?tab=reservations">
                        <button className="btn-view">Compléter</button>
                      </Link>
                      <button
                        className="btn-view"
                        style={{ background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' }}
                        onClick={() => dismissPendingDraft(draft.id)}
                      >
                        Ignorer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .notification-center {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid #e5e7eb;
          grid-column: 1 / -1;
        }

        .notification-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #f3f4f6;
        }

        .notification-header h2 {
          margin: 0;
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #1f2937;
        }

        .notification-badge {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
          padding: 0.4rem 0.8rem;
          border-radius: 20px;
          font-weight: 700;
          font-size: 0.85rem;
        }

        .notifications-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 1.5rem;
        }

        .notification-section {
          background: #f9fafb;
          border-radius: 8px;
          padding: 1rem;
          border: 1px solid #e5e7eb;
        }

        .notification-section h3 {
          margin: 0 0 1rem 0;
          font-size: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #1f2937;
          font-weight: 600;
        }

        .tasks-section h3 {
          color: #2563eb;
        }

        .incidents-section h3 {
          color: #dc2626;
        }

        .notifications-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .notification-item {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          padding: 1rem;
          background: white;
          border-radius: 6px;
          border-left: 4px solid #3b82f6;
          transition: all 0.2s;
        }

        .task-item {
          border-left-color: #2563eb;
        }

        .incident-item {
          border-left-color: #ef4444;
        }

        .incident-item.priority-high {
          border-left-color: #dc2626;
          background: #fef2f2;
        }

        .draft-item {
          border-left-color: #f59e0b;
          background: #fffbeb;
        }

        .draft-item .notification-icon {
          background: #fef3c7;
          color: #d97706;
        }

        .notification-item:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .notification-icon {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          font-size: 1.2rem;
        }

        .task-item .notification-icon {
          background: #dbeafe;
          color: #2563eb;
        }

        .incident-item .notification-icon {
          background: #fee2e2;
          color: #dc2626;
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-title {
          margin: 0 0 0.25rem 0;
          font-weight: 600;
          color: #1f2937;
        }

        .notification-property {
          margin: 0 0 0.5rem 0;
          font-size: 0.85rem;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .notification-description {
          margin: 0.5rem 0;
          font-size: 0.85rem;
          color: #6b7280;
          line-height: 1.4;
        }

        .notification-meta {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          font-size: 0.75rem;
          margin-top: 0.5rem;
        }

        .task-priority {
          padding: 0.2rem 0.5rem;
          border-radius: 3px;
          font-weight: 600;
        }

        .task-priority.priority-low {
          background: #d1fae5;
          color: #065f46;
        }

        .task-priority.priority-medium {
          background: #fef3c7;
          color: #92400e;
        }

        .task-priority.priority-high {
          background: #fee2e2;
          color: #991b1b;
        }

        .due-date,
        .assigned,
        .incident-category,
        .incident-priority,
        .incident-date {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.3rem 0.6rem;
          background: #f3f4f6;
          border-radius: 3px;
          color: #6b7280;
        }

        .incident-priority {
          background: none;
          padding: 0;
        }

        .incident-priority.priority-low {
          color: #10b981;
        }

        .incident-priority.priority-medium {
          color: #f59e0b;
        }

        .incident-priority.priority-high {
          color: #dc2626;
          font-weight: 600;
        }

        .btn-view {
          flex-shrink: 0;
          padding: 0.5rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 600;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-view:hover {
          background: #2563eb;
        }

        @media (max-width: 1200px) {
          .notifications-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
