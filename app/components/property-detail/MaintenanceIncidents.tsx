'use client';

import { useState } from 'react';
import { Incident } from '@/app/context/PropertyContext';

interface MaintenanceIncidentsProps {
  logementId: number;
  incidents: Incident[];
  onAddIncident: (incident: Omit<Incident, 'id' | 'created_at' | 'updated_at'>) => void;
  onResolveIncident: (id: number, resolved: boolean) => void;
  onDeleteIncident: (id: number) => void;
}

export default function MaintenanceIncidents({
  logementId,
  incidents,
  onAddIncident,
  onResolveIncident,
  onDeleteIncident
}: MaintenanceIncidentsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newIncident, setNewIncident] = useState({
    title: '',
    description: '',
    category: 'maintenance' as const,
    priority: 'medium' as const
  });

  const handleAddIncident = () => {
    if (newIncident.title.trim()) {
      onAddIncident({
        logement_id: logementId,
        title: newIncident.title,
        description: newIncident.description,
        date: new Date().toISOString(),
        category: newIncident.category,
        priority: newIncident.priority,
        resolved: false,
        resolved_date: null
      });
      setNewIncident({
        title: '',
        description: '',
        category: 'maintenance',
        priority: 'medium'
      });
      setIsAdding(false);
    }
  };

  const unresolvedIncidents = incidents.filter(i => !i.resolved);
  const resolvedIncidents = incidents.filter(i => i.resolved);

  const categoryLabels: Record<string, string> = {
    maintenance: 'Maintenance',
    damage: 'Dommage',
    complaint: 'Réclamation',
    other: 'Autre'
  };

  const categoryIcons: Record<string, string> = {
    maintenance: 'fas fa-wrench',
    damage: 'fas fa-exclamation-triangle',
    complaint: 'fas fa-comment-dots',
    other: 'fas fa-triangle-exclamation'
  };

  const renderIncidentList = (incidentList: Incident[], title: string) => {
    return (
      <div key={title} className="incidents-group">
        <div className="group-header">
          <h3>{title}</h3>
          <span className="count-badge">{incidentList.length}</span>
        </div>
        {incidentList.length === 0 ? (
          <p className="empty-group">Aucun incident</p>
        ) : (
          <div className="incidents-list">
            {incidentList.map(incident => (
              <div 
                key={incident.id} 
                className={`incident-card priority-${incident.priority}`}
              >
                <div className="incident-header">
                  <div className="incident-title-section">
                    <i className={categoryIcons[incident.category]}></i>
                    <div>
                      <h4>{incident.title}</h4>
                      <p className="incident-category">
                        {categoryLabels[incident.category]}
                      </p>
                    </div>
                  </div>
                  <div className="incident-badges">
                    <span className={`priority-badge priority-${incident.priority}`}>
                      {incident.priority === 'low' ? 'Basse' : incident.priority === 'medium' ? 'Moyenne' : 'Haute'}
                    </span>
                    <span className={`status-badge ${incident.resolved ? 'resolved' : 'open'}`}>
                      {incident.resolved ? '✓ Résolu' : '◉ Ouvert'}
                    </span>
                  </div>
                </div>

                {incident.description && (
                  <p className="incident-description">{incident.description}</p>
                )}

                <div className="incident-footer">
                  <span className="incident-date">
                    <i className="fas fa-calendar"></i>
                    {new Date(incident.date).toLocaleDateString('fr-FR')}
                  </span>
                  {incident.resolved && incident.resolved_date && (      
                    <span className="resolved-date">
                      <i className="fas fa-check-circle"></i>
                      Résolu: {new Date(incident.resolved_date).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>

                <div className="incident-actions">
                  {!incident.resolved && (
                    <button
                      className="btn-resolve"
                      onClick={() => onResolveIncident(incident.id, true)}
                      title="Marquer comme résolu"
                    >
                      <i className="fas fa-check"></i> Résoudre
                    </button>
                  )}
                  {incident.resolved && (
                    <button
                      className="btn-reopen"
                      onClick={() => onResolveIncident(incident.id, false)}
                      title="Réouvrir"
                    >
                      <i className="fas fa-redo"></i> Réouvrir
                    </button>
                  )}
                  <button
                    className="btn-delete-incident"
                    onClick={() => onDeleteIncident(incident.id)}
                    title="Supprimer"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="maintenance-incidents">
      <div className="section-header">
        <h2>
          <i className="fas fa-tools"></i> Maintenance & Incidents
        </h2>
      </div>

      {incidents.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-hammer"></i>
          <p>Aucun incident signalé</p>
        </div>
      ) : (
        <div className="incidents-container">
          {renderIncidentList(unresolvedIncidents, 'Incidents ouverts')}
          {renderIncidentList(resolvedIncidents, 'Incidents résolus')}
        </div>
      )}

      {isAdding && (
        <div className="add-incident-form">
          <div className="form-group">
            <label>Titre de l'incident*</label>
            <input
              type="text"
              value={newIncident.title}
              onChange={(e) => setNewIncident({...newIncident, title: e.target.value})}
              placeholder="Ex: Fuite dans la cuisine"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={newIncident.description}
              onChange={(e) => setNewIncident({...newIncident, description: e.target.value})}
              placeholder="Détails sur l'incident..."
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Catégorie</label>
              <select
                value={newIncident.category}
                onChange={(e) => setNewIncident({...newIncident, category: e.target.value as any})}
              >
                <option value="maintenance">Maintenance</option>
                <option value="damage">Dommage</option>
                <option value="complaint">Réclamation</option>
                <option value="other">Autre</option>
              </select>
            </div>

            <div className="form-group">
              <label>Priorité</label>
              <select
                value={newIncident.priority}
                onChange={(e) => setNewIncident({...newIncident, priority: e.target.value as any})}
              >
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleAddIncident}>
              Signaler l'incident
            </button>
            <button className="btn btn-secondary" onClick={() => setIsAdding(false)}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {!isAdding && (
        <button className="btn-add-incident" onClick={() => setIsAdding(true)}>
          <i className="fas fa-plus"></i> Signaler un incident
        </button>
      )}

      <style jsx>{`
        .maintenance-incidents {
          background: white;
          border-radius: 8px;
          padding: 1.25rem;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .section-header {
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid #f0f0f0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .section-header h2 {
          margin: 0;
          font-size: 1.05rem;
          color: #1f2937;
          font-weight: 700;
          letter-spacing: -0.3px;
        }

        .section-header i {
          color: #dc2626;
          font-size: 1.1rem;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          color: #9ca3af;
          text-align: center;
        }

        .empty-state i {
          font-size: 2.5rem;
          margin-bottom: 0.75rem;
          opacity: 0.3;
          color: #d1d5db;
        }

        .empty-state p {
          margin: 0;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .incidents-container {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-bottom: 1rem;
        }

        .incidents-group {
          background: #f9fafb;
          border-radius: 6px;
          padding: 1rem;
          border: 1px solid #e5e7eb;
        }

        .group-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .group-header h3 {
          margin: 0;
          font-size: 0.95rem;
          color: #1f2937;
          font-weight: 600;
          letter-spacing: -0.2px;
        }

        .count-badge {
          background: #fee2e2;
          color: #991b1b;
          padding: 0.3rem 0.65rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.2px;
        }

        .empty-group {
          margin: 0;
          color: #9ca3af;
          font-style: italic;
          text-align: center;
          padding: 1rem;
          font-size: 0.9rem;
        }

        .incidents-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .incident-card {
          background: white;
          border-radius: 5px;
          padding: 1rem;
          border: 1px solid #e5e7eb;
          border-left: 3px solid #fb923c;
          transition: all 0.2s;
        }

        .incident-card.priority-low {
          border-left-color: #4ade80;
        }

        .incident-card.priority-medium {
          border-left-color: #fb923c;
        }

        .incident-card.priority-high {
          border-left-color: #ef4444;
        }

        .incident-card:hover {
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
          transform: translateY(-1px);
        }

        .incident-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 0.75rem;
        }

        .incident-title-section {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
          flex: 1;
        }

        .incident-title-section i {
          font-size: 1.15rem;
          margin-top: 0.05rem;
          color: #ef4444;
          flex-shrink: 0;
        }

        .incident-title-section h4 {
          margin: 0 0 0.25rem 0;
          color: #1f2937;
          font-weight: 700;
          font-size: 0.95rem;
          letter-spacing: -0.2px;
        }

        .incident-category {
          margin: 0;
          font-size: 0.8rem;
          color: #9ca3af;
          font-weight: 500;
        }

        .incident-badges {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          flex-shrink: 0;
        }

        .priority-badge {
          padding: 0.3rem 0.65rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.2px;
        }

        .priority-badge.priority-low {
          background: #dcfce7;
          color: #166534;
        }

        .priority-badge.priority-medium {
          background: #fed7aa;
          color: #92400e;
        }

        .priority-badge.priority-high {
          background: #fee2e2;
          color: #991b1b;
        }

        .status-badge {
          padding: 0.3rem 0.65rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.2px;
        }

        .status-badge.open {
          background: #fee2e2;
          color: #991b1b;
        }

        .status-badge.resolved {
          background: #dcfce7;
          color: #166534;
        }

        .incident-description {
          margin: 0 0 0.75rem 0;
          color: #4b5563;
          font-size: 0.9rem;
          line-height: 1.4;
        }

        .incident-footer {
          display: flex;
          gap: 1rem;
          font-size: 0.8rem;
          color: #9ca3af;
          margin-bottom: 0.75rem;
        }

        .incident-date,
        .resolved-date {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .incident-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .btn-resolve,
        .btn-reopen,
        .btn-delete-incident {
          padding: 0.45rem 0.85rem;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.75rem;
          font-weight: 700;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          text-transform: uppercase;
          letter-spacing: 0.2px;
        }

        .btn-resolve {
          background: #dcfce7;
          color: #166534;
          border-color: #4ade80;
        }

        .btn-resolve:hover {
          background: #c6f6d5;
          transform: translateY(-1px);
        }

        .btn-reopen {
          background: #fed7aa;
          color: #92400e;
          border-color: #fb923c;
        }

        .btn-reopen:hover {
          background: #fdba74;
          transform: translateY(-1px);
        }

        .btn-delete-incident {
          background: #fee2e2;
          color: #991b1b;
          border-color: #ef4444;
        }

        .btn-delete-incident:hover {
          background: #fecaca;
          transform: translateY(-1px);
        }

        .add-incident-form {
          background: #f9fafb;
          padding: 1rem;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          margin-bottom: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          margin-bottom: 1rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .form-group label {
          font-weight: 700;
          color: #6b7280;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 0.6rem;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          font-size: 0.9rem;
          font-family: inherit;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #2c5aa0;
          box-shadow: 0 0 0 2px rgba(44, 90, 160, 0.1);
        }

        .form-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
        }

        .btn {
          padding: 0.6rem 1.2rem;
          border: none;
          border-radius: 4px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.85rem;
        }

        .btn-primary {
          background: #2c5aa0;
          color: white;
        }

        .btn-primary:hover {
          background: #1e3f5a;
          transform: translateY(-1px);
        }

        .btn-secondary {
          background: #e5e7eb;
          color: #374151;
        }

        .btn-secondary:hover {
          background: #d1d5db;
        }

        .btn-add-incident {
          width: 100%;
          padding: 0.75rem;
          background: white;
          border: 2px dashed #e5e7eb;
          border-radius: 4px;
          color: #6b7280;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 0.9rem;
        }

        .btn-add-incident:hover {
          background: #f9fafb;
          border-color: #9ca3af;
          color: #2c5aa0;
        }

        @media (max-width: 768px) {
          .maintenance-incidents {
            padding: 1rem;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .incident-header {
            flex-direction: column;
          }

          .incident-badges {
            order: -1;
          }
        }
      `}</style>
    </div>
  );
}
