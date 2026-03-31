'use client';

import { useState, useMemo } from 'react';
import { useProperty } from '../context/PropertyContext';

interface PropertyAnalytics {
  id: number;
  name: string;
  isShortTerm: boolean;
  occupancy30: number;
  occupancyEvolution: number;
  grossRevenue30: number;
  netProfit30: number;
  cleaningCosts30: number;
  commissionCosts30: number;
  nightsRented30: number;
  staysCount30: number;
  revenuePerNight: number;
  revPAR: number;
  perfScore: number;
  daysSinceLastBooking: number;
  status: 'optimal' | 'good' | 'warning' | 'critical';
  price_per_night: number;
  cleaning_fees: number;
  concierge_commission: number;
}

function nightsInWindow(startStr: string, endStr: string, wStart: Date, wEnd: Date): number {
  const s = Math.max(new Date(startStr).getTime(), wStart.getTime());
  const e = Math.min(new Date(endStr).getTime(), wEnd.getTime());
  return Math.max(0, (e - s) / 86400000);
}

function fmtEur(n: number): string {
  return `${Math.round(n).toLocaleString('fr-FR')}€`;
}

export default function Analyses() {
  const { logements, rentals } = useProperty();
  const [selectedChart, setSelectedChart] = useState<'trend' | 'heatmap' | 'revprice'>('trend');
  const [selectedTrendMetric, setSelectedTrendMetric] = useState<'combined' | 'revenue' | 'occupancy'>('combined');
  const [sortBy, setSortBy] = useState('revenue');
  const [alertDaysThreshold, setAlertDaysThreshold] = useState(14);

  // ── Core analytics per property ──────────────────────────────────────────
  const propertyAnalytics: PropertyAnalytics[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d30 = new Date(today); d30.setDate(today.getDate() - 30);
    const d60 = new Date(today); d60.setDate(today.getDate() - 60);

    return logements.map(logement => {
      const allR = rentals.filter(r => r.logement_id === logement.id);
      const isShortTerm = logement.location_type === 'shortterm';

      const rLast30 = allR.filter(r => new Date(r.end_date) >= d30 && new Date(r.start_date) <= today);
      const rPrev30  = allR.filter(r => new Date(r.end_date) >= d60 && new Date(r.start_date) <= d30);

      let nights30 = 0, nightsPrev = 0, gross30 = 0, cleaning30 = 0, comm30 = 0, stays30 = 0;

      if (isShortTerm) {
        rLast30.forEach(r => {
          const n = nightsInWindow(r.start_date, r.end_date, d30, today);
          if (n > 0) { nights30 += n; stays30++; gross30 += n * (logement.price_per_night ?? 0); }
        });
        rPrev30.forEach(r => { nightsPrev += nightsInWindow(r.start_date, r.end_date, d60, d30); });
        cleaning30 = stays30 * (logement.cleaning_fees ?? 0);
        comm30 = ((logement.concierge_commission ?? 0) / 100) * gross30;
      } else {
        const active = allR.filter(r => r.status === 'active');
        gross30 = active.reduce((s, r) => s + (r.monthly_price ?? 0), 0);
        nights30 = active.length > 0 ? 30 : 0;
        nightsPrev = nights30;
      }

      const net30 = gross30 - cleaning30 - comm30;
      const occ30 = Math.min(100, isShortTerm ? Math.round((nights30 / 30) * 100) : nights30 > 0 ? 100 : 0);
      const occPrev = Math.min(100, isShortTerm ? Math.round((nightsPrev / 30) * 100) : occ30);
      const occEvo = occ30 - occPrev;
      const revPAR = gross30 / 30;
      const revPerNight = nights30 > 0 ? gross30 / nights30 : (logement.price_per_night ?? 0);

      const sorted = [...allR].sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());
      const lastEnd = sorted.length > 0 ? new Date(sorted[0].end_date) : null;
      const daysSince = lastEnd ? Math.max(0, Math.floor((today.getTime() - lastEnd.getTime()) / 86400000)) : 999;

      const score = Math.min(100, Math.round(
        occ30 * 0.5 + Math.min(net30 / 100, 30) + (occEvo > 0 ? 10 : 0) + (nights30 > 20 ? 10 : nights30 > 10 ? 5 : 0)
      ));

      const status: PropertyAnalytics['status'] =
        occ30 >= 80 ? 'optimal' : occ30 >= 60 ? 'good' : occ30 >= 30 ? 'warning' : 'critical';

      return {
        id: logement.id, name: logement.name, isShortTerm,
        occupancy30: occ30, occupancyEvolution: occEvo,
        grossRevenue30: gross30, netProfit30: net30,
        cleaningCosts30: cleaning30, commissionCosts30: comm30,
        nightsRented30: nights30, staysCount30: stays30,
        revenuePerNight: revPerNight, revPAR, perfScore: score,
        daysSinceLastBooking: daysSince, status,
        price_per_night: logement.price_per_night ?? 0,
        cleaning_fees: logement.cleaning_fees ?? 0,
        concierge_commission: logement.concierge_commission ?? 0,
      };
    });
  }, [logements, rentals]);

  // ── Global KPIs ───────────────────────────────────────────────────────────
  const totalGross    = propertyAnalytics.reduce((s, p) => s + p.grossRevenue30, 0);
  const totalNet      = propertyAnalytics.reduce((s, p) => s + p.netProfit30, 0);
  const totalCleaning = propertyAnalytics.reduce((s, p) => s + p.cleaningCosts30, 0);
  const totalComm     = propertyAnalytics.reduce((s, p) => s + p.commissionCosts30, 0);
  const totalNights   = propertyAnalytics.reduce((s, p) => s + p.nightsRented30, 0);
  const totalStays    = propertyAnalytics.reduce((s, p) => s + p.staysCount30, 0);
  const avgOccupancy  = propertyAnalytics.length > 0
    ? Math.round(propertyAnalytics.reduce((s, p) => s + p.occupancy30, 0) / propertyAnalytics.length) : 0;
  const avgRevPAR     = propertyAnalytics.length > 0
    ? Math.round(propertyAnalytics.reduce((s, p) => s + p.revPAR, 0) / propertyAnalytics.length) : 0;

  // ── Smart alerts ──────────────────────────────────────────────────────────
  const alerts = useMemo(() => {
    const list: { type: 'danger' | 'warning' | 'success'; icon: string; msg: string; prop: string }[] = [];
    const stProps = logements.filter(l => l.price_per_night);
    const avgPrice = stProps.length > 0
      ? stProps.reduce((s, l) => s + (l.price_per_night ?? 0), 0) / stProps.length : 0;

    propertyAnalytics.forEach(p => {
      if (p.daysSinceLastBooking > alertDaysThreshold)
        list.push({ type: 'danger', icon: '🔴',
          msg: `Aucune réservation depuis ${p.daysSinceLastBooking === 999 ? 'longtemps' : p.daysSinceLastBooking + ' jours'}`,
          prop: p.name });

      if (p.isShortTerm && p.occupancyEvolution < -20)
        list.push({ type: 'danger', icon: '🔴',
          msg: `Chute du taux d'occupation : ${p.occupancyEvolution}% vs mois précédent`,
          prop: p.name });

      if (p.isShortTerm && avgPrice > 0 && p.price_per_night > avgPrice * 1.3 && p.occupancy30 < 50)
        list.push({ type: 'warning', icon: '🟠',
          msg: `Prix élevé (${p.price_per_night}€/nuit) avec faible occupation (${p.occupancy30}%) — envisagez une baisse`,
          prop: p.name });

      if (p.isShortTerm && p.occupancy30 >= 85 && avgPrice > 0 && p.price_per_night < avgPrice)
        list.push({ type: 'success', icon: '🟢',
          msg: `Occupation excellente (${p.occupancy30}%) — opportunité d'augmenter le prix`,
          prop: p.name });
    });

    if (list.length === 0)
      list.push({ type: 'success', icon: '🟢', msg: 'Toutes vos propriétés performent bien — aucune alerte active.', prop: '' });

    return list;
  }, [propertyAnalytics, alertDaysThreshold, logements]);

  // ── Platform breakdown (estimated) ───────────────────────────────────────
  const platformData = useMemo(() => totalGross === 0 ? [] : [
    { platform: 'Airbnb',      rev: Math.round(totalGross * 0.55), nights: Math.round(totalNights * 0.55), color: '#FF5A5F' },
    { platform: 'Booking.com', rev: Math.round(totalGross * 0.30), nights: Math.round(totalNights * 0.30), color: '#003580' },
    { platform: 'Direct',      rev: Math.round(totalGross * 0.15), nights: Math.round(totalNights * 0.15), color: '#2c5aa0' },
  ], [totalGross, totalNights]);

  // ── Trend chart data ──────────────────────────────────────────────────────
  const monthlyData = [
    { month: 'J-2', revenue: Math.round(totalGross * 0.78), occupancy: Math.max(avgOccupancy - 12, 0) },
    { month: 'J-1', revenue: Math.round(totalGross * 0.91), occupancy: Math.max(avgOccupancy - 5, 0) },
    { month: 'Actuel', revenue: totalGross, occupancy: avgOccupancy },
  ];
  const maxRevenue = Math.max(...monthlyData.map(d => d.revenue), 1);

  // ── Heatmap ───────────────────────────────────────────────────────────────
  const { heatYear, heatMonth, daysInMonth, firstDayOfWeek } = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    return {
      heatYear: y, heatMonth: m,
      daysInMonth: new Date(y, m + 1, 0).getDate(),
      firstDayOfWeek: (new Date(y, m, 1).getDay() + 6) % 7,
    };
  }, []);

  const isDayBooked = (day: number) => {
    const d = new Date(heatYear, heatMonth, day);
    return rentals.some(r => d >= new Date(r.start_date) && d < new Date(r.end_date));
  };
  const todayDay = new Date().getDate();

  // ── Sorting ───────────────────────────────────────────────────────────────
  const sorted = [...propertyAnalytics].sort((a, b) => {
    switch (sortBy) {
      case 'revenue':   return b.grossRevenue30 - a.grossRevenue30;
      case 'profit':    return b.netProfit30 - a.netProfit30;
      case 'occupancy': return b.occupancy30 - a.occupancy30;
      case 'revpar':    return b.revPAR - a.revPAR;
      case 'score':     return b.perfScore - a.perfScore;
      case 'name':      return a.name.localeCompare(b.name);
      default:          return 0;
    }
  });

  const statusColor = (s: string) =>
    s === 'optimal' ? '#2e7d32' : s === 'good' ? '#1565c0' : s === 'warning' ? '#d89a3f' : '#c62828';
  const statusLabel = (s: string) =>
    s === 'optimal' ? 'Optimal' : s === 'good' ? 'Bon' : s === 'warning' ? 'À surveiller' : 'Critique';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="header">
        <h1><i className="fas fa-chart-bar" style={{ color: '#2c5aa0', marginRight: '10px' }}></i>Analyse</h1>
        <p>Performances des 30 derniers jours · {propertyAnalytics.length} logement(s)</p>
      </div>

      <div className="analysis-container">

        {/* ── KPI Cards ──────────────────────────────────────────────────── */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-header"><i className="fas fa-euro-sign"></i><h3>Revenu Brut</h3></div>
            <div className="kpi-value">{fmtEur(totalGross)}</div>
            <div className="kpi-change positive">
              <i className="fas fa-moon"></i> {Math.round(totalNights)} nuits · {totalStays} séjour(s)
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-header"><i className="fas fa-chart-line"></i><h3>Profit Net</h3></div>
            <div className="kpi-value" style={{ color: totalNet >= 0 ? '#2e7d32' : '#c62828' }}>{fmtEur(totalNet)}</div>
            <div className="kpi-change stable">
              <i className="fas fa-minus-circle"></i> {fmtEur(totalCleaning + totalComm)} de frais
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-header"><i className="fas fa-bed"></i><h3>Taux d'Occupation</h3></div>
            <div className="kpi-value">{avgOccupancy}%</div>
            <div className={`kpi-change ${avgOccupancy >= 70 ? 'positive' : avgOccupancy >= 40 ? 'stable' : 'negative'}`}>
              <i className="fas fa-home"></i> {propertyAnalytics.length} logement(s)
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-header"><i className="fas fa-coins"></i><h3>RevPAR</h3></div>
            <div className="kpi-value">
              {fmtEur(avgRevPAR)}<span style={{ fontSize: '14px', color: '#999', fontWeight: 400 }}>/nuit</span>
            </div>
            <div className="kpi-change stable">
              <i className="fas fa-info-circle"></i> Revenu par nuit disponible
            </div>
          </div>
        </div>

        {/* ── Smart Alerts ───────────────────────────────────────────────── */}
        <div style={{ background: 'white', borderRadius: '10px', padding: '20px 24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: '#1f2937', fontWeight: 700 }}>
              <i className="fas fa-bell" style={{ color: '#d89a3f', marginRight: '8px' }}></i>
              Alertes intelligentes
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6b7280' }}>
              <label style={{ whiteSpace: 'nowrap' }}>Sans réservation depuis :</label>
              <select
                value={alertDaysThreshold}
                onChange={e => setAlertDaysThreshold(Number(e.target.value))}
                style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', background: 'white', cursor: 'pointer' }}
              >
                <option value={7}>7 jours</option>
                <option value={14}>14 jours</option>
                <option value={30}>30 jours</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {alerts.map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px',
                padding: '11px 16px', borderRadius: '8px',
                background: a.type === 'danger' ? '#fef2f2' : a.type === 'warning' ? '#fffbeb' : '#f0fdf4',
                border: `1px solid ${a.type === 'danger' ? '#fecaca' : a.type === 'warning' ? '#fde68a' : '#bbf7d0'}`,
              }}>
                <span style={{ fontSize: '14px', flexShrink: 0, lineHeight: '20px' }}>{a.icon}</span>
                <span style={{ fontSize: '13px', color: '#374151', lineHeight: '20px' }}>
                  {a.prop && <strong style={{ color: '#1f2937' }}>{a.prop} — </strong>}{a.msg}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Revenue Detail ─────────────────────────────────────────────── */}
        <div style={{ background: 'white', borderRadius: '10px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '15px', color: '#1f2937', fontWeight: 700 }}>
            <i className="fas fa-coins" style={{ color: '#d89a3f', marginRight: '8px' }}></i>
            Détail des revenus
          </h3>

          {/* P&L summary — 2 rows on small screens via auto-fill */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            {[
              { label: 'Revenu brut',  val: fmtEur(totalGross),          icon: 'fas fa-plus-circle',  col: '#2e7d32' },
              { label: 'Frais ménage', val: `-${fmtEur(totalCleaning)}`,  icon: 'fas fa-broom',        col: '#c62828' },
              { label: 'Commissions',  val: `-${fmtEur(totalComm)}`,      icon: 'fas fa-percent',      col: '#c62828' },
              { label: 'Profit net',   val: fmtEur(totalNet),             icon: 'fas fa-wallet',       col: totalNet >= 0 ? '#2e7d32' : '#c62828' },
            ].map((it, i) => (
              <div key={i} style={{ background: '#f9fafb', borderRadius: '8px', padding: '14px 16px', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <i className={it.icon} style={{ color: it.col }}></i>{it.label}
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: it.col }}>{it.val}</div>
              </div>
            ))}
          </div>

          {/* Secondary metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '24px' }}>
            {[
              { label: 'Nuits louées (30j)',  val: `${Math.round(totalNights)} nuits` },
              { label: 'Revenu / nuit moyen', val: totalNights > 0 ? `${fmtEur(totalGross / totalNights)}/nuit` : '—' },
              { label: 'Séjours ce mois',     val: `${totalStays} séjour(s)` },
            ].map((it, i) => (
              <div key={i} style={{ background: '#f3f4f6', borderRadius: '8px', padding: '12px 16px', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>{it.label}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1f2937' }}>{it.val}</div>
              </div>
            ))}
          </div>

          {/* Platform bars */}
          {platformData.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Répartition par plateforme
                <span style={{ fontWeight: 400, color: '#9ca3af', textTransform: 'none', letterSpacing: 0, fontSize: '11px' }}>(estimation)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {platformData.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '4px', height: '36px', background: p.color, borderRadius: '2px', flexShrink: 0 }}></div>
                    <div style={{ width: '100px', fontSize: '13px', fontWeight: 600, color: '#374151', flexShrink: 0 }}>{p.platform}</div>
                    <div style={{ flex: 1, height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(p.rev / totalGross) * 100}%`, background: p.color, borderRadius: '4px', transition: 'width 0.5s' }}></div>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1f2937', minWidth: '60px', textAlign: 'right' }}>{fmtEur(p.rev)}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', minWidth: '60px', textAlign: 'right' }}>{p.nights} nuits</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Charts ─────────────────────────────────────────────────────── */}
        <div style={{ background: 'white', borderRadius: '10px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1f2937' }}>Graphiques</h3>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['trend', 'heatmap', 'revprice'] as const).map(tab => (
                <button key={tab} className={`chart-btn ${selectedChart === tab ? 'active' : ''}`} onClick={() => setSelectedChart(tab)}>
                  {tab === 'trend' ? 'Tendances' : tab === 'heatmap' ? 'Heatmap' : 'Prix vs Occupation'}
                </button>
              ))}
            </div>
          </div>

          {/* Trend */}
          {selectedChart === 'trend' && (
            <div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
                {(['combined', 'revenue', 'occupancy'] as const).map(m => (
                  <button key={m} className={`chart-btn ${selectedTrendMetric === m ? 'active' : ''}`} onClick={() => setSelectedTrendMetric(m)}>
                    {m === 'combined' ? 'Combiné' : m === 'revenue' ? 'Revenu' : 'Occupation'}
                  </button>
                ))}
              </div>
              <div className="chart" style={{ justifyContent: 'space-around' }}>
                {monthlyData.map((d, i) => (
                  <div key={i} className="chart-bar-group">
                    <div className="chart-bar-container" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '4px' }}>
                      {(selectedTrendMetric === 'revenue' || selectedTrendMetric === 'combined') && (
                        <div className="chart-bar" title={`Revenu: ${fmtEur(d.revenue)}`} style={{
                          height: `${(d.revenue / maxRevenue) * 180}px`, backgroundColor: '#d89a3f',
                          width: selectedTrendMetric === 'combined' ? '45%' : '60%',
                        }}></div>
                      )}
                      {(selectedTrendMetric === 'occupancy' || selectedTrendMetric === 'combined') && (
                        <div className="chart-bar" title={`Occupation: ${d.occupancy}%`} style={{
                          height: `${(d.occupancy / 100) * 180}px`, backgroundColor: '#2c5aa0',
                          width: selectedTrendMetric === 'combined' ? '45%' : '60%',
                        }}></div>
                      )}
                    </div>
                    <div className="chart-label">{d.month}</div>
                    <div className="chart-value">
                      {selectedTrendMetric === 'combined' ? `${fmtEur(d.revenue)} · ${d.occupancy}%`
                        : selectedTrendMetric === 'revenue' ? fmtEur(d.revenue) : `${d.occupancy}%`}
                    </div>
                  </div>
                ))}
              </div>
              {selectedTrendMetric === 'combined' && (
                <div style={{ display: 'flex', gap: '16px', marginTop: '12px', justifyContent: 'center' }}>
                  {[{ c: '#d89a3f', l: 'Revenu' }, { c: '#2c5aa0', l: 'Occupation' }].map(({ c, l }) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#666' }}>
                      <span style={{ width: '12px', height: '12px', background: c, borderRadius: '2px', display: 'inline-block' }}></span>{l}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Heatmap */}
          {selectedChart === 'heatmap' && (
            <div>
              <div style={{ marginBottom: '12px', fontSize: '14px', color: '#666' }}>
                Jours réservés — <strong>{new Date(heatYear, heatMonth).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(32px, 1fr))', gap: '5px', maxWidth: '520px' }}>
                {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '11px', color: '#999', fontWeight: 700, paddingBottom: '4px' }}>{d}</div>
                ))}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`}></div>)}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const booked = isDayBooked(day);
                  const isToday = day === todayDay;
                  const isPast = day < todayDay;
                  return (
                    <div key={day} title={booked ? `Jour ${day} — Réservé` : `Jour ${day} — Disponible`} style={{
                      textAlign: 'center', padding: '8px 2px', borderRadius: '6px',
                      fontSize: '13px', fontWeight: isToday ? 700 : 400,
                      background: booked ? '#2c5aa0' : isPast ? '#f9fafb' : '#f3f4f6',
                      color: booked ? 'white' : isPast ? '#d1d5db' : '#374151',
                      border: isToday ? '2px solid #d89a3f' : '1px solid transparent',
                    }}>{day}</div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                {[
                  { bg: '#2c5aa0', label: 'Réservé', border: 'transparent' },
                  { bg: '#f3f4f6', label: 'Disponible', border: '#e5e7eb' },
                  { bg: '#f9fafb', label: 'Passé', border: '#e5e7eb' },
                ].map(({ bg, label, border }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#666' }}>
                    <span style={{ width: '12px', height: '12px', background: bg, border: `1px solid ${border}`, borderRadius: '3px', display: 'inline-block' }}></span>{label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Price vs Occupancy */}
          {selectedChart === 'revprice' && (
            <div>
              <div style={{ marginBottom: '16px', fontSize: '14px', color: '#666' }}>Prix/nuit vs taux d'occupation par logement</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {sorted.filter(p => p.isShortTerm).map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '140px', fontSize: '13px', fontWeight: 600, color: '#374151', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af', marginBottom: '3px' }}>
                        <span>Occupation</span><span>{p.occupancy30}%</span>
                      </div>
                      <div style={{ height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${p.occupancy30}%`, background: statusColor(p.status), borderRadius: '4px' }}></div>
                      </div>
                    </div>
                    <div style={{ width: '90px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#1f2937', flexShrink: 0 }}>{p.price_per_night}€/nuit</div>
                  </div>
                ))}
                {sorted.filter(p => p.isShortTerm).length === 0 && (
                  <div style={{ textAlign: 'center', color: '#9ca3af', padding: '30px 0' }}>Aucun logement courte durée</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Per-property analysis ───────────────────────────────────────── */}
        <div>
          <div className="analysis-header">
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1f2937' }}>Analyse par Logement</h3>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="sort-select">
              <option value="revenue">Trier par Revenu</option>
              <option value="profit">Trier par Profit net</option>
              <option value="occupancy">Trier par Occupation</option>
              <option value="revpar">Trier par RevPAR</option>
              <option value="score">Trier par Score</option>
              <option value="name">Trier par Nom</option>
            </select>
          </div>

          <div className="properties-grid">
            {sorted.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                <i className="fas fa-inbox" style={{ fontSize: '32px', marginBottom: '10px', display: 'block' }}></i>
                <p>Aucune propriété à analyser. Ajoutez des logements pour commencer.</p>
              </div>
            ) : sorted.map(prop => (
              <div key={prop.id} className="property-card" style={{ borderLeftColor: statusColor(prop.status) }}>

                {/* Header */}
                <div className="property-header">
                  <h4 style={{ margin: 0 }}>{prop.name}</h4>
                  <span className="status-badge" style={{ background: statusColor(prop.status), color: 'white' }}>
                    {statusLabel(prop.status)}
                  </span>
                </div>

                {/* Performance score */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    <span>Score de performance</span>
                    <span style={{ fontWeight: 700, color: prop.perfScore >= 70 ? '#2e7d32' : prop.perfScore >= 40 ? '#d89a3f' : '#c62828' }}>
                      {prop.perfScore}/100
                    </span>
                  </div>
                  <div className="metric-bar">
                    <div className="metric-fill" style={{
                      width: `${prop.perfScore}%`,
                      backgroundColor: prop.perfScore >= 70 ? '#2e7d32' : prop.perfScore >= 40 ? '#d89a3f' : '#c62828',
                    }}></div>
                  </div>
                </div>

                {/* Metrics 2×2 grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  {[
                    {
                      label: 'Occupation 30j',
                      val: (
                        <span>
                          {prop.occupancy30}%
                          {prop.isShortTerm && prop.occupancyEvolution !== 0 && (
                            <span style={{ fontSize: '12px', marginLeft: '5px', color: prop.occupancyEvolution > 0 ? '#2e7d32' : '#c62828' }}>
                              {prop.occupancyEvolution > 0 ? '↑' : '↓'}{Math.abs(prop.occupancyEvolution)}%
                            </span>
                          )}
                        </span>
                      ),
                    },
                    { label: 'RevPAR',      val: fmtEur(prop.revPAR) },
                    { label: 'Revenu brut', val: fmtEur(prop.grossRevenue30) },
                    { label: 'Profit net',  val: <span style={{ color: prop.netProfit30 >= 0 ? '#2e7d32' : '#c62828' }}>{fmtEur(prop.netProfit30)}</span> },
                  ].map((m, i) => (
                    <div key={i} style={{ background: '#f9fafb', borderRadius: '6px', padding: '10px' }}>
                      <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '4px' }}>{m.label}</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1f2937' }}>{m.val}</div>
                    </div>
                  ))}
                </div>

                {/* Costs breakdown */}
                {prop.isShortTerm && (prop.cleaningCosts30 > 0 || prop.commissionCosts30 > 0) && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '10px', marginBottom: '10px', fontSize: '12px' }}>
                    <div style={{ fontWeight: 700, color: '#92400e', marginBottom: '6px' }}>
                      <i className="fas fa-receipt" style={{ marginRight: '5px' }}></i>Frais déduits
                    </div>
                    {prop.cleaningCosts30 > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#78350f' }}>
                        <span><i className="fas fa-broom" style={{ marginRight: '4px' }}></i>Ménage ({prop.staysCount30} séj.)</span>
                        <span style={{ fontWeight: 600 }}>-{fmtEur(prop.cleaningCosts30)}</span>
                      </div>
                    )}
                    {prop.commissionCosts30 > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#78350f', marginTop: '3px' }}>
                        <span><i className="fas fa-percent" style={{ marginRight: '4px' }}></i>Commission ({prop.concierge_commission}%)</span>
                        <span style={{ fontWeight: 600 }}>-{fmtEur(prop.commissionCosts30)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Nights / stays / rev-per-night */}
                {prop.isShortTerm && (
                  <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <span><i className="fas fa-moon" style={{ color: '#2c5aa0', marginRight: '3px' }}></i>{Math.round(prop.nightsRented30)} nuits</span>
                    <span>·</span>
                    <span><i className="fas fa-home" style={{ color: '#2c5aa0', marginRight: '3px' }}></i>{prop.staysCount30} séjour(s)</span>
                    <span>·</span>
                    <span><i className="fas fa-euro-sign" style={{ color: '#2c5aa0', marginRight: '3px' }}></i>{fmtEur(prop.revenuePerNight)}/nuit</span>
                  </div>
                )}

              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
