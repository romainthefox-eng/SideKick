'use client';

import { useState } from 'react';
import { AccessInstruction, Rental } from '@/app/context/PropertyContext';

interface AccessInstructionsProps {
  logementId: number;
  instructions: AccessInstruction[];
  activeRental?: Rental;
  onSend: () => void;
  onUpdate: (id: number, instruction: Partial<AccessInstruction>) => void;
  onDelete: (id: number) => void;
  onAdd: (instruction: Omit<AccessInstruction, 'id' | 'created_at' | 'last_updated'>) => void;
}

export default function AccessInstructions({ 
  logementId,
  instructions, 
  activeRental, 
  onSend, 
  onDelete,
  onAdd 
}: AccessInstructionsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newInstruction, setNewInstruction] = useState({
    type: 'code_boite' as const,
    instruction: ''
  });
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleAddInstruction = () => {
    if (newInstruction.instruction.trim()) {
      onAdd({
        logement_id: logementId,
        type: newInstruction.type,
        instruction: newInstruction.instruction
      });
      setNewInstruction({ type: 'code_boite', instruction: '' });
      setIsAdding(false);
    }
  };

  const handleCopy = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const typeConfig: Record<string, { label: string; icon: string; color: string }> = {
    code_boite: { label: 'Code boîte', icon: 'fas fa-mailbox', color: '#3b82f6' },
    digicode: { label: 'Digicode', icon: 'fas fa-keypad', color: '#8b5cf6' },
    parking: { label: 'Parking', icon: 'fas fa-car', color: '#06b6d4' },
    cles: { label: 'Clés', icon: 'fas fa-key', color: '#10b981' },
    autre: { label: 'Autre', icon: 'fas fa-info-circle', color: '#6b7280' }
  };

  return (
    <div className="access-instructions">
      <div className="section-header">
        <h3>🔐 Accès au logement</h3>
        {activeRental && instructions.length > 0 && (
          <button 
            className="btn-send"
            onClick={onSend}
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        )}
      </div>

      {instructions.length === 0 ? (
        <div className="empty-state">
          <p>Aucune instruction d'accès</p>
        </div>
      ) : (
        <div className="instructions-list">
          {instructions.map(instr => (
            <div key={instr.id} className="instruction-item">
              <div className="inst-icon" style={{ background: `${typeConfig[instr.type].color}20`, color: typeConfig[instr.type].color }}>
                <i className={typeConfig[instr.type].icon}></i>
              </div>
              <div className="inst-content">
                <div className="inst-type">{typeConfig[instr.type].label}</div>
                <div className="inst-text">{instr.instruction}</div>
              </div>
              <button
                className={`btn-copy ${copiedId === instr.id ? 'copied' : ''}`}
                onClick={() => handleCopy(instr.instruction, instr.id)}
              >
                <i className={copiedId === instr.id ? 'fas fa-check' : 'fas fa-copy'}></i>
              </button>
              <button
                className="btn-delete-inst"
                onClick={() => onDelete(instr.id)}
              >
                <i className="fas fa-trash-alt"></i>
              </button>
            </div>
          ))}
        </div>
      )}

      {isAdding ? (
        <div className="add-form">
          <div className="form-group">
            <select 
              value={newInstruction.type}
              onChange={(e) => setNewInstruction({...newInstruction, type: e.target.value as any})}
            >
              <option value="code_boite">Code boîte</option>
              <option value="digicode">Digicode</option>
              <option value="parking">Parking</option>
              <option value="cles">Clés</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <textarea 
            value={newInstruction.instruction}
            onChange={(e) => setNewInstruction({...newInstruction, instruction: e.target.value})}
            placeholder="Entrer l'instruction..."
          />
          <div className="form-actions">
            <button className="btn-add" onClick={handleAddInstruction}>Ajouter</button>
            <button className="btn-cancel" onClick={() => setIsAdding(false)}>Annuler</button>
          </div>
        </div>
      ) : (
        <button className="btn-add-inst" onClick={() => setIsAdding(true)}>
          <i className="fas fa-plus"></i> Ajouter
        </button>
      )}

      <style jsx>{`
        .access-instructions {
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

        .btn-send {
          width: 32px;
          height: 32px;
          border: 1px solid #e5e7eb;
          background: white;
          color: #2c5aa0;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .btn-send:hover {
          background: #f3f4f6;
          border-color: #2c5aa0;
        }

        .empty-state {
          text-align: center;
          padding: 1.5rem 0;
          color: #9ca3af;
          font-size: 0.9rem;
        }

        .instructions-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .instruction-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.85rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .instruction-item:hover {
          background: #f3f4f6;
          border-color: #d1d5db;
        }

        .inst-icon {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.95rem;
        }

        .inst-content {
          flex: 1;
          min-width: 0;
        }

        .inst-type {
          font-size: 0.75rem;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.2px;
          margin-bottom: 0.25rem;
        }

        .inst-text {
          font-size: 0.9rem;
          color: #1f2937;
          word-break: break-word;
        }

        .btn-copy,
        .btn-delete-inst {
          flex-shrink: 0;
          width: 32px;
          height: 32px;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          transition: all 0.2s;
        }

        .btn-copy {
          color: #2c5aa0;
        }

        .btn-copy:hover {
          background: #dbeafe;
          border-color: #2c5aa0;
        }

        .btn-copy.copied {
          background: #dcfce7;
          color: #16a34a;
          border-color: #16a34a;
        }

        .btn-delete-inst {
          color: #6b7280;
        }

        .btn-delete-inst:hover {
          background: #fee2e2;
          color: #dc2626;
          border-color: #dc2626;
        }

        .add-form {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 1rem;
          margin-bottom: 0.75rem;
        }

        .form-group {
          margin-bottom: 0.75rem;
        }

        .form-group select {
          width: 100%;
          padding: 0.6rem;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          font-size: 0.9rem;
          font-family: inherit;
        }

        textarea {
          width: 100%;
          padding: 0.6rem;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          font-size: 0.9rem;
          font-family: inherit;
          resize: vertical;
          min-height: 70px;
          margin-bottom: 0.75rem;
        }

        .form-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
        }

        .btn-add,
        .btn-cancel {
          padding: 0.55rem 1.1rem;
          border: none;
          border-radius: 4px;
          font-weight: 600;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-add {
          background: #2c5aa0;
          color: white;
        }

        .btn-add:hover {
          background: #1e3f5a;
        }

        .btn-cancel {
          background: #e5e7eb;
          color: #374151;
        }

        .btn-cancel:hover {
          background: #d1d5db;
        }

        .btn-add-inst {
          width: 100%;
          padding: 0.7rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          color: #2c5aa0;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .btn-add-inst:hover {
          background: #f3f4f6;
          border-color: #2c5aa0;
        }
      `}</style>
    </div>
  );
}
