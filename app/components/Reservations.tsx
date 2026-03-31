'use client';

import { useState } from 'react';
import { useProperty } from '../context/PropertyContext';
import type { Rental } from '../context/PropertyContext';

// ─── Types ────────────────────────────────────────────────────────────────────
type ReservationSource = 'airbnb' | 'booking' | 'direct' | 'autre';
type BookingStatus     = 'confirmed' | 'pending' | 'paid';

interface FormData {
  logement_id : number | '';
  tenant_name : string;
  email       : string;
  phone       : string;
  start_date  : string;
  end_date    : string;
  adults      : number;
  children    : number;
  source      : ReservationSource;
  booking_status : BookingStatus;
  pets           : boolean;
  special_requests : string;
  monthly_price    : string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SOURCE_LABELS: Record<ReservationSource, string> = {
  airbnb  : 'Airbnb',
  booking : 'Booking.com',
  direct  : 'Direct',
  autre   : 'Autre',
};

const SOURCE_COLORS: Record<ReservationSource, string> = {
  airbnb  : '#ff5a5f',
  booking : '#003580',
  direct  : '#10b981',
  autre   : '#8b5cf6',
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  confirmed : 'Confirmé',
  pending   : 'En attente',
  paid      : 'Payé',
};

const MONTH_NAMES = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
];

const DAY_INITIALS = ['Di','Lu','Ma','Me','Je','Ve','Sa'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const padDate = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const nightsBetween = (start: string, end: string) => {
  const diff = new Date(end + 'T12:00:00').getTime() - new Date(start + 'T12:00:00').getTime();
  return Math.round(diff / 86_400_000);
};

const getRentalSource = (r: Rental): ReservationSource =>
  (r.source as ReservationSource) ?? 'direct';

const getRentalStatus = (r: Rental): BookingStatus =>
  (r.booking_status as BookingStatus) ?? 'pending';

// ─── Component ────────────────────────────────────────────────────────────────
export default function Reservations() {
  const { logements, rentals, addRental, updateRental, deleteRental } = useProperty();

  const [viewDate, setViewDate]       = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [showForm, setShowForm]       = useState(false);
  const [editing, setEditing]         = useState<Rental | null>(null);
  const [saving, setSaving]           = useState(false);
  const [deleting, setDeleting]       = useState<number | null>(null);
  const [filterSource, setFilterSource] = useState<ReservationSource | 'all'>('all');

  const emptyForm = (): FormData => ({
    logement_id      : '',
    tenant_name      : '',
    email            : '',
    phone            : '',
    start_date       : '',
    end_date         : '',
    adults           : 1,
    children         : 0,
    source           : 'direct',
    booking_status   : 'pending',
    pets             : false,
    special_requests : '',
    monthly_price    : '',
  });

  const [form, setForm] = useState<FormData>(emptyForm());

  // ── Derived dates ────────────────────────────────────────────────────────
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayColumns  = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthStartStr = padDate(year, month, 1);
  const monthEndStr   = padDate(year, month, daysInMonth);

  // ── Filtering ────────────────────────────────────────────────────────────
  const visibleRentals = rentals.filter(r =>
    (filterSource === 'all' || getRentalSource(r) === filterSource) &&
    r.start_date <= monthEndStr &&
    r.end_date   >  monthStartStr
  );

  // ── Cell calculation ──────────────────────────────────────────────────────
  const occupantAt = (logementId: number, day: number): Rental | undefined => {
    const dateStr = padDate(year, month, day);
    return visibleRentals.find(
      r => r.logement_id === logementId &&
           r.start_date <= dateStr &&
           dateStr < r.end_date
    );
  };

  // How many cells does the bar span (capped at end of month)
  const barSpan = (r: Rental, fromDay: number): number => {
    const end   = new Date(r.end_date + 'T12:00:00');
    const mEnd  = new Date(year, month + 1, 0);
    const effEnd = end < mEnd ? end : mEnd;
    const start  = new Date(year, month, fromDay);
    return Math.round((effEnd.getTime() - start.getTime()) / 86_400_000);
  };

  // ── Open forms ───────────────────────────────────────────────────────────
  const openNew = (logementId: number, day: number) => {
    setEditing(null);
    setForm({
      ...emptyForm(),
      logement_id : logementId,
      start_date  : padDate(year, month, day),
    });
    setShowForm(true);
  };

  const openEdit = (r: Rental) => {
    setEditing(r);
    setForm({
      logement_id      : r.logement_id,
      tenant_name      : r.tenant_name,
      email            : r.email            ?? '',
      phone            : r.phone            ?? '',
      start_date       : r.start_date,
      end_date         : r.end_date,
      adults           : r.adults           ?? 1,
      children         : r.children         ?? 0,
      source           : getRentalSource(r),
      booking_status   : getRentalStatus(r),
      pets             : r.pets             ?? false,
      special_requests : r.special_requests ?? '',
      monthly_price    : r.monthly_price != null ? String(r.monthly_price) : '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm());
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const nights = nightsBetween(form.start_date, form.end_date);
    if (!form.tenant_name.trim() || !form.start_date || !form.end_date
        || !form.logement_id || nights <= 0) return;

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
      closeForm();
    } catch (err) {
      console.error('Erreur sauvegarde réservation:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette réservation ?')) return;
    setDeleting(id);
    try {
      await deleteRental(id);
      closeForm();
    } catch (err) {
      console.error('Erreur suppression:', err);
    } finally {
      setDeleting(null);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const monthRentals = rentals.filter(r =>
    r.start_date <= monthEndStr && r.end_date > monthStartStr
  );
  const totalNights  = monthRentals.reduce((acc, r) => {
    const s = r.start_date < monthStartStr ? monthStartStr : r.start_date;
    const e = r.end_date   > monthEndStr   ? monthEndStr   : r.end_date;
    return acc + Math.max(0, nightsBetween(s, e));
  }, 0);

  const nights = nightsBetween(form.start_date, form.end_date);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="header">
        <h1>Réservations</h1>
        <p>Calendrier des réservations par logement — {monthRentals.length} réservation{monthRentals.length !== 1 ? 's' : ''} ce mois ({totalNights} nuits)</p>
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          className="btn btn-primary"
          onClick={() => { setEditing(null); setForm(emptyForm()); setShowForm(true); }}
        >
          <i className="fas fa-plus"></i> Nouvelle réservation
        </button>

        {/* Source filter */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(['all', 'airbnb', 'booking', 'direct', 'autre'] as const).map(src => (
            <button
              key={src}
              onClick={() => setFilterSource(src)}
              style={{
                padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                border: '2px solid', cursor: 'pointer', transition: 'all 0.15s',
                borderColor : filterSource === src ? (src === 'all' ? '#2c5aa0' : SOURCE_COLORS[src as ReservationSource]) : '#e5e7eb',
                background  : filterSource === src ? (src === 'all' ? '#eff6ff' : SOURCE_COLORS[src as ReservationSource] + '18') : 'white',
                color       : filterSource === src ? (src === 'all' ? '#2c5aa0' : SOURCE_COLORS[src as ReservationSource]) : '#6b7280',
              }}
            >
              {src === 'all' ? 'Tous' : SOURCE_LABELS[src as ReservationSource]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Timeline calendar ────────────────────────────────────────────────── */}
      <div className="content-card" style={{ padding: 0, overflow: 'hidden' }}>

        {/* Month navigation */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb',
        }}>
          <button
            className="btn-nav"
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
          >
            <i className="fas fa-chevron-left"></i>
          </button>
          <span style={{ fontWeight: 700, fontSize: '17px', color: '#1f2937' }}>
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            className="btn-nav"
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>

        {/* Scrollable grid */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: `${Math.max(860, daysInMonth * 38 + 200)}px`,
            tableLayout: 'fixed',
          }}>
            {/* Column widths */}
            <colgroup>
              <col style={{ width: '190px' }} />
              {dayColumns.map(d => <col key={d} style={{ width: '38px' }} />)}
              <col style={{ width: '20px' }} />
            </colgroup>

            {/* Header row */}
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{
                  padding: '8px 14px', textAlign: 'left', fontSize: '12px', fontWeight: 700,
                  color: '#374151', borderRight: '2px solid #d1d5db',
                  position: 'sticky', left: 0, background: '#f9fafb', zIndex: 10,
                }}>
                  Logement
                </th>
                {dayColumns.map(day => {
                  const d           = new Date(year, month, day);
                  const isWeekend   = d.getDay() === 0 || d.getDay() === 6;
                  const isToday     = d.toDateString() === new Date().toDateString();
                  return (
                    <th key={day} style={{
                      padding: '4px 2px', textAlign: 'center', fontSize: '11px', fontWeight: 600,
                      color     : isToday ? '#2563eb' : isWeekend ? '#ef4444' : '#9ca3af',
                      background: isToday ? '#eff6ff' : isWeekend ? '#fef9f0' : '#f9fafb',
                      borderRight: '1px solid #e5e7eb',
                    }}>
                      <div style={{ letterSpacing: '-0.2px' }}>{DAY_INITIALS[d.getDay()]}</div>
                      <div style={{ fontSize: '13px', color: isToday ? '#2563eb' : '#374151', fontWeight: 700 }}>
                        {day}
                      </div>
                    </th>
                  );
                })}
                <th style={{ background: '#f9fafb' }} />
              </tr>
            </thead>

            {/* Logement rows */}
            <tbody>
              {logements.length === 0 ? (
                <tr>
                  <td
                    colSpan={daysInMonth + 2}
                    style={{ textAlign: 'center', padding: '48px', color: '#9ca3af', fontSize: '14px' }}
                  >
                    Aucun logement. Ajoutez des logements dans l&apos;onglet Logement.
                  </td>
                </tr>
              ) : (
                logements.map((logement, lgIdx) => {
                  const rowBg = lgIdx % 2 === 0 ? '#ffffff' : '#fafafa';

                  return (
                    <tr key={logement.id} style={{ background: rowBg }}>
                      {/* Logement name – sticky left */}
                      <td style={{
                        padding: '6px 14px', fontWeight: 600, fontSize: '13px', color: '#1f2937',
                        borderRight: '2px solid #d1d5db', borderBottom: '1px solid #f3f4f6',
                        position: 'sticky', left: 0, background: rowBg, zIndex: 5,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        height: '40px',
                      }} title={logement.name}>
                        <i className="fas fa-home" style={{ marginRight: '7px', color: '#9ca3af', fontSize: '11px' }} />
                        {logement.name}
                      </td>

                      {/* Day cells */}
                      {dayColumns.map(day => {
                        const dateStr   = padDate(year, month, day);
                        const occupant  = occupantAt(logement.id, day);
                        const isStart   = occupant?.start_date === dateStr;
                        const isContinued = day === 1 && !!occupant && occupant.start_date < monthStartStr;
                        const isEffStart  = isStart || isContinued;

                        const d         = new Date(year, month, day);
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                        const isToday   = d.toDateString() === new Date().toDateString();

                        // Occupied cell that starts here (or continues from last month)
                        if (occupant && isEffStart) {
                          const span   = barSpan(occupant, day);
                          const src    = getRentalSource(occupant);
                          const status = getRentalStatus(occupant);
                          const color  = SOURCE_COLORS[src];

                          return (
                            <td
                              key={day}
                              colSpan={span}
                              style={{
                                padding: '4px 3px',
                                borderBottom: '1px solid #f3f4f6',
                                cursor: 'pointer',
                                verticalAlign: 'middle',
                              }}
                              onClick={() => openEdit(occupant)}
                            >
                              <div style={{
                                background    : color,
                                borderRadius  : isContinued ? '0 4px 4px 0' : '4px',
                                padding       : '3px 7px',
                                color         : 'white',
                                fontSize      : '11px',
                                fontWeight    : 600,
                                overflow      : 'hidden',
                                textOverflow  : 'ellipsis',
                                whiteSpace    : 'nowrap',
                                minHeight     : '26px',
                                display       : 'flex',
                                alignItems    : 'center',
                                gap           : '5px',
                                opacity       : status === 'pending' ? 0.78 : 1,
                                boxShadow     : status === 'paid' ? `0 0 0 2px ${color}, 0 0 0 3px white` : 'none',
                              }}>
                                {status === 'paid'    && <i className="fas fa-check-circle" style={{ fontSize: '9px', flexShrink: 0 }} />}
                                {status === 'pending' && <i className="fas fa-clock"        style={{ fontSize: '9px', flexShrink: 0 }} />}
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {occupant.tenant_name}
                                </span>
                                {(occupant.adults ?? 0) + (occupant.children ?? 0) > 0 && (
                                  <span style={{ opacity: 0.8, flexShrink: 0, fontSize: '10px' }}>
                                    · {(occupant.adults ?? 1) + (occupant.children ?? 0)}
                                    <i className="fas fa-user" style={{ marginLeft: '2px', fontSize: '8px' }} />
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        }

                        // Cell covered by a multi-day bar — skip (colSpan handles it)
                        if (occupant && !isEffStart) return null;

                        // Empty cell
                        return (
                          <td
                            key={day}
                            style={{
                              borderBottom : '1px solid #f3f4f6',
                              borderRight  : '1px solid #f3f4f6',
                              background   : isToday   ? '#eff6ff33'
                                            : isWeekend ? '#fef9f022'
                                            : 'transparent',
                              cursor  : 'pointer',
                              height  : '40px',
                              transition: 'background 0.1s',
                            }}
                            onClick={() => openNew(logement.id, day)}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#e0f2fe88'; }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLElement).style.background =
                                isToday ? '#eff6ff33' : isWeekend ? '#fef9f022' : 'transparent';
                            }}
                          />
                        );
                      })}

                      <td style={{ borderBottom: '1px solid #f3f4f6' }} />
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div style={{
          padding: '10px 20px', borderTop: '1px solid #e5e7eb',
          display: 'flex', gap: '16px', flexWrap: 'wrap', background: '#f9fafb',
          fontSize: '12px', color: '#4b5563', alignItems: 'center',
        }}>
          {(Object.entries(SOURCE_LABELS) as [ReservationSource, string][]).map(([src, label]) => (
            <span key={src} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: SOURCE_COLORS[src], display: 'inline-block' }} />
              {label}
            </span>
          ))}
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <i className="fas fa-check-circle" style={{ color: '#2563eb', fontSize: '11px' }} /> Payé
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <i className="fas fa-clock" style={{ color: '#f59e0b', fontSize: '11px' }} /> En attente
          </span>
          <span style={{ color: '#9ca3af' }}>
            Cliquez sur une case vide pour créer une réservation, sur une barre pour la modifier.
          </span>
        </div>
      </div>

      {/* ── Reservation Form Modal ───────────────────────────────────────────── */}
      {showForm && (
        <div
          className="modal-overlay"
          onClick={closeForm}
          style={{ zIndex: 1000 }}
        >
          <div
            className="modal"
            style={{ maxWidth: '580px', maxHeight: '92vh', overflowY: 'auto', width: '95vw' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>
                <i className="fas fa-calendar-check" style={{ marginRight: '8px', color: '#2c5aa0' }} />
                {editing ? 'Modifier la réservation' : 'Nouvelle réservation'}
              </h3>
              <button
                onClick={closeForm}
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
              {/* Toggle */}
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

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
              {editing && (
                <button
                  onClick={() => handleDelete(editing.id)}
                  disabled={deleting === editing.id}
                  style={{
                    padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                    background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}
                >
                  {deleting === editing.id
                    ? <><i className="fas fa-spinner fa-spin" /> Suppression…</>
                    : <><i className="fas fa-trash" /> Supprimer</>}
                </button>
              )}
              <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
                <button className="btn btn-secondary" onClick={closeForm}>
                  Annuler
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={
                    saving ||
                    !form.tenant_name.trim() ||
                    !form.start_date ||
                    !form.end_date ||
                    !form.logement_id ||
                    nights <= 0
                  }
                >
                  {saving
                    ? <><i className="fas fa-spinner fa-spin" /> Enregistrement…</>
                    : <><i className="fas fa-check" /> {editing ? 'Modifier' : 'Enregistrer'}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
