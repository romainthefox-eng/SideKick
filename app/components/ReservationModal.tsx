'use client';

import { useState } from 'react';
import { useProperty } from '../context/PropertyContext';
import type { Rental } from '../context/PropertyContext';

// ─── Types ────────────────────────────────────────────────────────────────────
export type ReservationSource = 'airbnb' | 'booking' | 'direct' | 'autre';
export type BookingStatus     = 'confirmed' | 'pending' | 'paid';

interface FormData {
  logement_id      : number | '';
  tenant_name      : string;
  email            : string;
  phone            : string;
  start_date       : string;
  end_date         : string;
  adults           : number;
  children         : number;
  source           : ReservationSource;
  booking_status   : BookingStatus;
  pets             : boolean;
  special_requests : string;
  monthly_price    : string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
export const SOURCE_LABELS: Record<ReservationSource, string> = {
  airbnb  : 'Airbnb',
  booking : 'Booking.com',
  direct  : 'Direct',
  autre   : 'Autre',
};

export const SOURCE_COLORS: Record<ReservationSource, string> = {
  airbnb  : '#ff5a5f',
  booking : '#003580',
  direct  : '#10b981',
  autre   : '#8b5cf6',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const nightsBetween = (start: string, end: string) => {
  if (!start || !end) return 0;
  const diff = new Date(end + 'T12:00:00').getTime() - new Date(start + 'T12:00:00').getTime();
  return Math.max(0, Math.round(diff / 86_400_000));
};

const getRentalSource = (r: Rental): ReservationSource =>
  (r.source as ReservationSource) ?? 'direct';

const getRentalStatus = (r: Rental): BookingStatus =>
  (r.booking_status as BookingStatus) ?? 'pending';

// ─── Props ────────────────────────────────────────────────────────────────────
interface ReservationModalProps {
  /** Pre-fill the logement (e.g. when opened from a property's calendar) */
  defaultLogementId ?: number;
  /** Pre-fill the check-in date (e.g. when clicking a day cell) */
  defaultStartDate  ?: string;
  /** Pass an existing rental to switch to edit mode */
  editing           ?: Rental | null;
  onClose            : () => void;
  /** Called after a successful save or delete */
  onDone            ?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ReservationModal({
  defaultLogementId,
  defaultStartDate,
  editing = null,
  onClose,
  onDone,
}: ReservationModalProps) {
  const { logements, addRental, updateRental, deleteRental } = useProperty();

  const buildForm = (): FormData => {
    if (editing) {
      return {
        logement_id      : editing.logement_id,
        tenant_name      : editing.tenant_name,
        email            : editing.email            ?? '',
        phone            : editing.phone            ?? '',
        start_date       : editing.start_date,
        end_date         : editing.end_date,
        adults           : editing.adults           ?? 1,
        children         : editing.children         ?? 0,
        source           : getRentalSource(editing),
        booking_status   : getRentalStatus(editing),
        pets             : editing.pets             ?? false,
        special_requests : editing.special_requests ?? '',
        monthly_price    : editing.monthly_price != null ? String(editing.monthly_price) : '',
      };
    }
    return {
      logement_id      : defaultLogementId ?? '',
      tenant_name      : '',
      email            : '',
      phone            : '',
      start_date       : defaultStartDate ?? '',
      end_date         : '',
      adults           : 1,
      children         : 0,
      source           : 'direct',
      booking_status   : 'pending',
      pets             : false,
      special_requests : '',
      monthly_price    : '',
    };
  };

  const [form, setForm]       = useState<FormData>(buildForm);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const nights = nightsBetween(form.start_date, form.end_date);

  const handleSave = async () => {
    setSaveError(null);
    if (!form.logement_id)          { setSaveError('Veuillez sélectionner un logement.'); return; }
    if (!form.tenant_name.trim())   { setSaveError('Le nom du voyageur est obligatoire.'); return; }
    if (!form.start_date)           { setSaveError('Veuillez saisir une date d\'arrivée.'); return; }
    if (!form.end_date)             { setSaveError('Veuillez saisir une date de départ.'); return; }
    if (nights <= 0)                { setSaveError('La date de départ doit être après la date d\'arrivée.'); return; }
    setSaving(true);
    try {
      const payload = {
        logement_id      : form.logement_id as number,
        tenant_name      : form.tenant_name.trim(),
        email            : form.email    || null,
        phone            : form.phone    || null,
        start_date       : form.start_date,
        end_date         : form.end_date,
        monthly_price    : form.monthly_price ? Number(form.monthly_price) : null,
        status           : 'active' as const,
        adults           : form.adults,
        children         : form.children,
        source           : form.source,
        booking_status   : form.booking_status,
        pets             : form.pets,
        special_requests : form.special_requests || null,
      };
      if (editing) {
        await updateRental(editing.id, payload);
      } else {
        await addRental(payload);
      }
      onDone?.();
      onClose();
    } catch (err: unknown) {
      console.error('Erreur sauvegarde réservation:', err);
      const msg = err instanceof Error ? err.message
        : typeof err === 'object' && err !== null && 'message' in err ? String((err as {message: unknown}).message)
        : 'Erreur inconnue';
      // Detect missing column → migration not applied
      if (msg.includes('column') || msg.includes('does not exist') || msg.includes('42703')) {
        setSaveError('La migration SQL n\'a pas encore été appliquée dans Supabase. Exécute le fichier database/migration_reservation_fields.sql dans l\'éditeur SQL de Supabase.');
      } else {
        setSaveError(`Erreur : ${msg}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing || !confirm('Supprimer cette réservation ?')) return;
    setDeleting(true);
    setSaveError(null);
    try {
      await deleteRental(editing.id);
      onDone?.();
      onClose();
    } catch (err: unknown) {
      console.error('Erreur suppression:', err);
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      setSaveError(`Erreur suppression : ${msg}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ zIndex: 1000 }}
    >
      <div
        className="modal"
        style={{ maxWidth: '580px', maxHeight: '92vh', overflowY: 'auto', width: '95vw' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>
            <i className="fas fa-calendar-check" style={{ marginRight: '8px', color: '#2c5aa0' }} />
            {editing ? 'Modifier la réservation' : 'Nouvelle réservation'}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#9ca3af', padding: '4px' }}
          >
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Section: Logement */}
        <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '14px', marginBottom: '16px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
            <i className="fas fa-home" style={{ marginRight: '5px' }} /> Logement
          </div>
          <select
            value={form.logement_id}
            onChange={e => setForm({ ...form, logement_id: Number(e.target.value) || '' })}
            style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', background: 'white' }}
          >
            <option value="">Sélectionner un logement *</option>
            {logements.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        {/* Section: Voyageur */}
        <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '14px', marginBottom: '16px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
            <i className="fas fa-user" style={{ marginRight: '5px' }} /> Voyageur
          </div>
          <div className="form-group" style={{ marginBottom: '10px' }}>
            <label>Nom complet *</label>
            <input
              type="text"
              value={form.tenant_name}
              onChange={e => setForm({ ...form, tenant_name: e.target.value })}
              placeholder="Prénom Nom"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@exemple.com" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Téléphone</label>
              <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+33 6…" />
            </div>
          </div>
        </div>

        {/* Section: Séjour */}
        <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '14px', marginBottom: '16px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
            <i className="fas fa-bed" style={{ marginRight: '5px' }} /> Séjour
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Arrivée (check-in) *</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Départ (check-out) *</label>
              <input
                type="date"
                value={form.end_date}
                min={form.start_date || undefined}
                onChange={e => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
          </div>
          {nights > 0 ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 12px', background: '#eff6ff', borderRadius: '6px',
              fontSize: '13px', color: '#2563eb', fontWeight: 700,
            }}>
              <i className="fas fa-moon" />
              {nights} nuit{nights > 1 ? 's' : ''}
              {form.monthly_price && Number(form.monthly_price) > 0 &&
                <span style={{ marginLeft: 'auto', color: '#6b7280', fontWeight: 500 }}>
                  ≈ {(Number(form.monthly_price) / nights).toFixed(0)} €/nuit
                </span>
              }
            </div>
          ) : form.start_date && form.end_date ? (
            <div style={{ padding: '7px 12px', background: '#fef2f2', borderRadius: '6px', fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>
              <i className="fas fa-exclamation-triangle" style={{ marginRight: '5px' }} />
              La date de départ doit être après l&apos;arrivée
            </div>
          ) : null}

          {/* Voyageurs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Adultes</label>
              <input type="number" min="1" max="20" value={form.adults} onChange={e => setForm({ ...form, adults: Number(e.target.value) })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Enfants</label>
              <input type="number" min="0" max="20" value={form.children} onChange={e => setForm({ ...form, children: Number(e.target.value) })} />
            </div>
          </div>
        </div>

        {/* Section: Réservation */}
        <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '14px', marginBottom: '16px', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
            <i className="fas fa-tag" style={{ marginRight: '5px' }} /> Réservation
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Provenance</label>
              <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value as ReservationSource })}>
                <option value="airbnb">Airbnb</option>
                <option value="booking">Booking.com</option>
                <option value="direct">Direct</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Statut</label>
              <select value={form.booking_status} onChange={e => setForm({ ...form, booking_status: e.target.value as BookingStatus })}>
                <option value="confirmed">Confirmé</option>
                <option value="pending">En attente</option>
                <option value="paid">Payé</option>
              </select>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Prix total séjour (€)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.monthly_price}
              onChange={e => setForm({ ...form, monthly_price: e.target.value })}
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Section: Animaux */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          marginBottom: '16px', padding: '12px 16px',
          background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb',
        }}>
          <i className="fas fa-paw" style={{ fontSize: '18px', color: form.pets ? '#f59e0b' : '#9ca3af' }} />
          <span style={{ flex: 1, fontWeight: 600, fontSize: '14px', color: '#374151' }}>
            Animaux de compagnie
          </span>
          <div
            role="switch"
            aria-checked={form.pets}
            onClick={() => setForm({ ...form, pets: !form.pets })}
            style={{
              width: '46px', height: '26px', borderRadius: '13px',
              background: form.pets ? '#10b981' : '#d1d5db',
              position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
              flexShrink: 0,
            }}
          >
            <div style={{
              position: 'absolute', top: '3px',
              left: form.pets ? '23px' : '3px',
              width: '20px', height: '20px', borderRadius: '50%',
              background: 'white', transition: 'left 0.2s',
              boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
            }} />
          </div>
          <span style={{ fontSize: '13px', color: form.pets ? '#10b981' : '#9ca3af', fontWeight: 700, minWidth: '28px' }}>
            {form.pets ? 'Oui' : 'Non'}
          </span>
        </div>

        {/* Section: Demandes particulières */}
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label>
            <i className="fas fa-list-ul" style={{ marginRight: '6px', color: '#9ca3af' }} />
            Demandes particulières
          </label>
          <textarea
            value={form.special_requests}
            onChange={e => setForm({ ...form, special_requests: e.target.value })}
            placeholder="Ex : lit parapluie, séchoir à linge, lit bébé, allergie aux acariens, accès PMR…"
            rows={3}
            style={{ resize: 'vertical', width: '100%' }}
          />
        </div>

        {/* Error banner */}
        {saveError && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px',
            padding: '10px 14px', marginBottom: '16px', color: '#b91c1c',
            fontSize: '13px', lineHeight: '1.5',
          }}>
            <i className="fas fa-exclamation-circle" style={{ marginRight: '6px' }} />
            {saveError}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
          {editing && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              {deleting
                ? <><i className="fas fa-spinner fa-spin" /> Suppression…</>
                : <><i className="fas fa-trash" /> Supprimer</>}
            </button>
          )}
          <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving
                ? <><i className="fas fa-spinner fa-spin" /> Enregistrement…</>
                : <><i className="fas fa-check" /> {editing ? 'Modifier' : 'Enregistrer'}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
