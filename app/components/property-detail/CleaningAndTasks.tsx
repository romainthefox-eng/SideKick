'use client';

import { useState } from 'react';
import { Task } from '@/app/context/PropertyContext';

interface CleaningAndTasksProps {
  logementId: number;
  tasks: Task[];
  onAddTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => void;
  onToggleTask: (id: number, completed: boolean) => void;
  onDeleteTask: (id: number) => void;
}

export default function CleaningAndTasks({ 
  logementId,
  tasks, 
  onAddTask, 
  onToggleTask, 
  onDeleteTask 
}: CleaningAndTasksProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    category: 'menage' as const,
    due_date: new Date().toISOString().split('T')[0],
    priority: 'medium' as const,
    assigned_to: ''
  });

  const handleAddTask = () => {
    if (newTask.title.trim()) {
      onAddTask({
        logement_id: logementId,
        title: newTask.title,
        description: newTask.description,
        category: newTask.category,
        due_date: newTask.due_date,
        priority: newTask.priority,
        assigned_to: newTask.assigned_to,
        completed: false,
        completed_date: null
      });
      setNewTask({
        title: '',
        description: '',
        category: 'menage',
        due_date: new Date().toISOString().split('T')[0],
        priority: 'medium',
        assigned_to: ''
      });
      setIsAdding(false);
    }
  };

  const cleaningTasks = tasks.filter(t => t.category === 'menage');
  const maintenanceTasks = tasks.filter(t => t.category === 'maintenance');
  const otherTasks = tasks.filter(t => t.category === 'autre');

  const renderTaskList = (taskList: Task[], title: string) => {
    const completedCount = taskList.filter(t => t.completed).length;
    const isOverdue = taskList.some(t => !t.completed && new Date(t.due_date || '') < new Date());

    return (
      <div key={title} className="task-category">
        <div className="category-header">
          <h3>{title}</h3>
          <div className="category-stats">
            <span className={`progress ${completedCount === taskList.length ? 'complete' : ''}`}>
              {completedCount}/{taskList.length}
            </span>
            {isOverdue && <span className="alert-badge">⚠️ En retard</span>}
          </div>
        </div>
        {taskList.length === 0 ? (
          <p className="empty-category">Aucune tâche</p>
        ) : (
          <div className="tasks-list">
            {taskList.map(task => (
              <div 
                key={task.id} 
                className={`task-item ${task.completed ? 'completed' : ''} priority-${task.priority}`}
              >
                <div className="task-checkbox">
                  <input 
                    type="checkbox"
                    checked={task.completed}
                    onChange={(e) => onToggleTask(task.id, e.target.checked)}
                    id={`task-${task.id}`}
                  />
                  <label htmlFor={`task-${task.id}`}></label>
                </div>
                <div className="task-content">
                  <p className="task-title">{task.title}</p>
                  {task.description && (
                    <p className="task-description">{task.description}</p>
                  )}
                  <div className="task-meta">
                    <span className="due-date">
                      <i className="fas fa-calendar"></i>
                      {task.due_date ? new Date(task.due_date).toLocaleDateString('fr-FR') : 'Sans date'}
                    </span>
                    {task.assigned_to && (
                      <span className="assigned">
                        <i className="fas fa-user"></i>
                        {task.assigned_to}
                      </span>
                    )}
                    <span className={`priority priority-${task.priority}`}>
                      {task.priority === 'low' ? 'Basse' : task.priority === 'medium' ? 'Moyenne' : 'Haute'}
                    </span>
                  </div>
                </div>
                <button 
                  className="btn-delete-task"
                  onClick={() => onDeleteTask(task.id)}
                  title="Supprimer"
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="cleaning-tasks">
      <div className="section-header">
        <h2>
          <i className="fas fa-checklist"></i> Ménage & Tâches
        </h2>
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-broom"></i>
          <p>Aucune tâche configurée</p>
        </div>
      ) : (
        <div className="tasks-by-category">
          {renderTaskList(cleaningTasks, 'Ménage')}
          {renderTaskList(maintenanceTasks, 'Maintenance')}
          {renderTaskList(otherTasks, 'Autres tâches')}
        </div>
      )}

      {isAdding && (
        <div className="add-task-form">
          <div className="form-row">
            <div className="form-group">
              <label>Titre*</label>
              <input 
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                placeholder="Ex: Nettoyage salle de bain"
              />
            </div>
            <div className="form-group">
              <label>Catégorie</label>
              <select 
                value={newTask.category}
                onChange={(e) => setNewTask({...newTask, category: e.target.value as any})}
              >
                <option value="menage">Ménage</option>
                <option value="maintenance">Maintenance</option>
                <option value="autre">Autre</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea 
              value={newTask.description}
              onChange={(e) => setNewTask({...newTask, description: e.target.value})}
              placeholder="Détails supplémentaires..."
              rows={2}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Date limite</label>
              <input
                type="date"
                value={newTask.due_date}
                onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Priorité</label>
              <select 
                value={newTask.priority}
                onChange={(e) => setNewTask({...newTask, priority: e.target.value as any})}
              >
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
              </select>
            </div>
            <div className="form-group">
              <label>Assigné à</label>
              <input 
                type="text"
                value={newTask.assigned_to}
                onChange={(e) => setNewTask({...newTask, assigned_to: e.target.value})}
                placeholder="Nom de la personne"
              />
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleAddTask}>
              Ajouter
            </button>
            <button className="btn btn-secondary" onClick={() => setIsAdding(false)}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {!isAdding && (
        <button className="btn-add-task" onClick={() => setIsAdding(true)}>
          <i className="fas fa-plus"></i> Ajouter une tâche
        </button>
      )}

      <style jsx>{`
        .cleaning-tasks {
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
          color: #2c5aa0;
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

        .tasks-by-category {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-bottom: 1rem;
        }

        .task-category {
          background: #f9fafb;
          border-radius: 6px;
          padding: 1rem;
          border: 1px solid #e5e7eb;
        }

        .category-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .category-header h3 {
          margin: 0;
          font-size: 0.95rem;
          color: #1f2937;
          font-weight: 600;
          letter-spacing: -0.2px;
        }

        .category-stats {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .progress {
          background: #dbeafe;
          color: #1e40af;
          padding: 0.3rem 0.65rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.2px;
        }

        .progress.complete {
          background: #dcfce7;
          color: #166534;
        }

        .alert-badge {
          background: #fee2e2;
          color: #991b1b;
          padding: 0.3rem 0.65rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.2px;
        }

        .empty-category {
          margin: 0;
          color: #9ca3af;
          font-style: italic;
          text-align: center;
          padding: 1rem;
          font-size: 0.9rem;
        }

        .tasks-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .task-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.85rem;
          background: white;
          border-radius: 5px;
          transition: all 0.2s;
          border-left: 3px solid #60a5fa;
          border: 1px solid #e5e7eb;
          border-left-width: 3px;
        }

        .task-item.priority-low {
          border-left-color: #4ade80;
        }

        .task-item.priority-medium {
          border-left-color: #fb923c;
        }

        .task-item.priority-high {
          border-left-color: #ef4444;
        }

        .task-item.completed {
          opacity: 0.65;
          background: #f3f4f6;
        }

        .task-checkbox {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          margin-top: 2px;
        }

        .task-checkbox input {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #2c5aa0;
        }

        .task-content {
          flex: 1;
          min-width: 0;
        }

        .task-title {
          margin: 0;
          font-weight: 600;
          color: #1f2937;
          text-decoration: none;
          font-size: 0.9rem;
          letter-spacing: -0.2px;
        }

        .task-item.completed .task-title {
          text-decoration: line-through;
          color: #9ca3af;
        }

        .task-description {
          margin: 0.3rem 0 0 0;
          font-size: 0.8rem;
          color: #6b7280;
        }

        .task-meta {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.5rem;
          flex-wrap: wrap;
          font-size: 0.75rem;
        }

        .due-date,
        .assigned-to {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          color: #6b7280;
        }

        .priority {
          padding: 0.25rem 0.6rem;
          border-radius: 3px;
          font-weight: 700;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.2px;
        }

        .priority-low {
          background: #dcfce7;
          color: #166534;
        }

        .priority-medium {
          background: #fed7aa;
          color: #92400e;
        }

        .priority-high {
          background: #fee2e2;
          color: #991b1b;
        }

        .btn-delete-task {
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          border: 1px solid #e5e7eb;
          background: white;
          color: #9ca3af;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
        }

        .btn-delete-task:hover {
          background: #fee2e2;
          color: #dc2626;
          border-color: #dc2626;
        }

        .add-task-form {
          background: #f9fafb;
          padding: 1rem;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          margin-bottom: 1rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .form-group label {
          font-weight: 600;
          color: #999;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 0.6rem;
          border: 1px solid #ddd;
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
          font-weight: 600;
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
        }

        .btn-secondary {
          background: #e0e0e0;
          color: #333;
        }

        .btn-secondary:hover {
          background: #d0d0d0;
        }

        .btn-add-task {
          width: 100%;
          padding: 0.75rem;
          background: white;
          border: 1px dashed #ddd;
          border-radius: 4px;
          color: #666;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 0.9rem;
        }

        .btn-add-task:hover {
          background: #f9f9f9;
          border-color: #999;
          color: #2c5aa0;
        }

        @media (max-width: 768px) {
          .cleaning-tasks {
            padding: 1rem;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .task-item {
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}
