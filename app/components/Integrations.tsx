'use client';

import { useState, useEffect } from 'react';
import { useProperty } from '../context/PropertyContext';

// ── Constants ───────────────────────────────────────────────────────────────

const PLATFORMS = [
  {
    id: 'airbnb', label: 'Airbnb', color: '#FF5A5F', textColor: 'white',
    icon: 'fas fa-home',
    howto: 'Airbnb → Tableau de bord → Paramètres → Gestion des disponibilités → Connecter des calendriers → Exporter le calendrier → Copier le lien',
  },
  {
    id: 'booking', label: 'Booking.com', color: '#003580', textColor: 'white',
    icon: 'fas fa-building',
    howto: 'Booking.com Extranet → Calendrier → Synchronisation iCal → Copier l\'URL d\'exportation',
  },
  {
    id: 'vrbo', label: 'VRBO / Abritel', color: '#3D65B0', textColor: 'white',
    icon: 'fas fa-umbrella-beach',
    howto: 'VRBO → Espace hôte → Disponibilités → Synchroniser → Exporter calendrier → Copier le lien',
  },
  {
    id: 'other', label: 'Autre', color: '#6b7280', textColor: 'white',
    icon: 'fas fa-calendar-alt',
    howto: 'Collez n\'importe quelle URL iCal (.ics) compatible avec votre plateforme',
  },
] as const;

type PlatformId = 'airbnb' | 'booking' | 'vrbo' | 'other';

// ── Types ───────────────────────────────────────────────────────────────────

interface IcalConnection {
  id: string;
  logementId: number;
  platform: PlatformId;
  url: string;
  enabled: boolean;
  lastSync: string | null;
  lastSyncCount: number;
}

interface ImportedBooking {
  uid: string;
  guestName: string;
  platform: string;
  logementId: number;
  logementName: string;
  startDate: string;
  endDate: string;
  description: string;
  status: 'pending' | 'imported' | 'skipped';
}

interface AutoConfig {
  autoImport: boolean;
  aiReply: boolean;
  replyTemplate: string;
}

const CONN_KEY = 'sk_ical_connections';
const BOOK_KEY = 'sk_pending_bookings';
const AUTO_KEY = 'sk_auto_config';

function getPlatform(id: string) {
  return PLATFORMS.find(p => p.id === id) ?? PLATFORMS[3];
}

// ── Component ───────────────────────────────────────────────────────────────

export default function Integrations() {
  const { logements, addRental, getRentalsByLogement } = useProperty();

  const [connections, setConnections] = useState<IcalConnection[]>([]);
  const [pendingBookings, setPendingBookings] = useState<ImportedBooking[]>([]);
  const [autoConfig, setAutoConfig] = useState<AutoConfig>({
    autoImport: false,
    aiReply: false,
    replyTemplate: `Bonjour {nom},\n\nMerci pour votre réservation du {debut} au {fin} dans notre logement "{logement}".\n\nNous sommes ravis de vous accueillir ! N'hésitez pas à nous contacter pour toute question.\n\nCordialement`,
  });

  const [syncing, setSyncing] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [syncErrors, setSyncErrors] = useState<Record<string, string>>({});
  const [syncSuccess, setSyncSuccess] = useState<Record<string, number>>({});
  const [addingFor, setAddingFor] = useState<number | null>(null);
  const [showHowtoFor, setShowHowtoFor] = useState<string | null>(null);
  const [newConn, setNewConn] = useState<{ platform: PlatformId; url: string }>({ platform: 'airbnb', url: '' });
  const [activeSection, setActiveSection] = useState<'connections' | 'bookings' | 'ai'>('connections');
  const [importingAll, setImportingAll] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const c = localStorage.getItem(CONN_KEY);
      if (c) setConnections(JSON.parse(c));
      const b = localStorage.getItem(BOOK_KEY);
      if (b) setPendingBookings(JSON.parse(b));
      const a = localStorage.getItem(AUTO_KEY);
      if (a) setAutoConfig(prev => ({ ...prev, ...JSON.parse(a) }));
    } catch {}
  }, []);

  const saveConnections = (updated: IcalConnection[]) => {
    setConnections(updated);
    localStorage.setItem(CONN_KEY, JSON.stringify(updated));
  };

  const saveBookings = (updated: ImportedBooking[]) => {
    setPendingBookings(updated);
    localStorage.setItem(BOOK_KEY, JSON.stringify(updated));
  };

  const saveAutoConfig = (updated: AutoConfig) => {
    setAutoConfig(updated);
    localStorage.setItem(AUTO_KEY, JSON.stringify(updated));
  };

  // ── Connection management ──────────────────────────────────────────────

  const addConnection = (logementId: number) => {
    if (!newConn.url.trim()) return;
    const updated: IcalConnection[] = [...connections, {
      id: `conn_${Date.now()}`,
      logementId,
      platform: newConn.platform,
      url: newConn.url.trim(),
      enabled: true,
      lastSync: null,
      lastSyncCount: 0,
    }];
    saveConnections(updated);
    setNewConn({ platform: 'airbnb', url: '' });
    setAddingFor(null);
  };

  const removeConnection = (id: string) => {
    saveConnections(connections.filter(c => c.id !== id));
  };

  const toggleConnection = (id: string) => {
    saveConnections(connections.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
  };

  // ── Sync ──────────────────────────────────────────────────────────────

  const doSync = async (conn: IcalConnection, currentBookings: ImportedBooking[]): Promise<ImportedBooking[]> => {
    setSyncing(conn.id);
    setSyncErrors(prev => { const e = { ...prev }; delete e[conn.id]; return e; });
    setSyncSuccess(prev => { const e = { ...prev }; delete e[conn.id]; return e; });

    try {
      const res = await fetch('/api/ical-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: conn.url, platform: conn.platform, logementId: conn.logementId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur inconnue');

      const logement = logements.find(l => l.id === conn.logementId);
      const platLabel = getPlatform(conn.platform).label;
      const existingRentals = getRentalsByLogement(conn.logementId);
      const existingUids = new Set(currentBookings.map(b => b.uid));

      const newBookings: ImportedBooking[] = (data.bookings || []).filter((b: any) => {
        if (existingUids.has(b.uid)) return false;
        // Skip if already a rental with same dates
        return !existingRentals.some(r => r.start_date === b.start && r.end_date === b.end);
      }).map((b: any) => ({
        uid: b.uid,
        guestName: extractGuestName(b.summary, platLabel),
        platform: platLabel,
        logementId: conn.logementId,
        logementName: logement?.name || '',
        startDate: b.start,
        endDate: b.end,
        description: b.description || '',
        status: 'pending' as const,
      }));

      const merged = [...currentBookings, ...newBookings];

      // Update connection sync info
      saveConnections(connections.map(c => c.id === conn.id
        ? { ...c, lastSync: new Date().toISOString(), lastSyncCount: data.total || 0 }
        : c
      ));

      setSyncSuccess(prev => ({ ...prev, [conn.id]: newBookings.length }));
      return merged;

    } catch (e: any) {
      setSyncErrors(prev => ({ ...prev, [conn.id]: e.message }));
      return currentBookings;
    } finally {
      setSyncing(null);
    }
  };

  const syncOne = async (conn: IcalConnection) => {
    const merged = await doSync(conn, pendingBookings);
    saveBookings(merged);

    // Auto-import if enabled
    if (autoConfig.autoImport) {
      let latest = merged;
      for (const b of merged.filter(bk => bk.status === 'pending')) {
        latest = await doImport(b, latest);
      }
      saveBookings(latest);
    }
  };

  const syncAll = async () => {
    let current = [...pendingBookings];
    for (const conn of connections.filter(c => c.enabled)) {
      current = await doSync(conn, current);
    }
    saveBookings(current);

    if (autoConfig.autoImport) {
      let latest = current;
      for (const b of current.filter(bk => bk.status === 'pending')) {
        latest = await doImport(b, latest);
      }
      saveBookings(latest);
    }
  };

  // ── Import booking as rental ─────────────────────────────────────────

  const doImport = async (booking: ImportedBooking, list: ImportedBooking[]): Promise<ImportedBooking[]> => {
    try {
      await addRental({
        logement_id: booking.logementId,
        tenant_name: booking.guestName,
        email: null,
        phone: null,
        start_date: booking.startDate,
        end_date: booking.endDate,
        monthly_price: null,
        status: 'active',
        adults: 1,
        children: 0,
        source: booking.platform === 'Airbnb' ? 'airbnb' : booking.platform === 'Booking' ? 'booking' : 'direct',
        booking_status: 'confirmed',
        pets: false,
        special_requests: '',
      });

      // Store platform source for Messagerie to read
      try {
        const map = JSON.parse(localStorage.getItem('sk_rental_platforms') || '{}');
        const key = `${booking.logementId}_${booking.startDate}_${booking.guestName}`;
        map[key] = booking.platform;
        localStorage.setItem('sk_rental_platforms', JSON.stringify(map));
      } catch {}

      return list.map(b => b.uid === booking.uid ? { ...b, status: 'imported' as const } : b);
    } catch {
      return list;
    }
  };

  const importOne = async (booking: ImportedBooking) => {
    setImporting(booking.uid);
    const updated = await doImport(booking, pendingBookings);
    saveBookings(updated);
    setImporting(null);
  };

  const importAll = async () => {
    setImportingAll(true);
    let list = [...pendingBookings];
    for (const b of list.filter(bk => bk.status === 'pending')) {
      list = await doImport(b, list);
    }
    saveBookings(list);
    setImportingAll(false);
  };

  const skipBooking = (uid: string) => {
    saveBookings(pendingBookings.map(b => b.uid === uid ? { ...b, status: 'skipped' as const } : b));
  };

  const clearImported = () => {
    saveBookings(pendingBookings.filter(b => b.status === 'pending'));
  };

  // ── Helpers ────────────────────────────────────────────────────────────

  const connectedCount = connections.filter(c => c.enabled).length;
  const importedCount = pendingBookings.filter(b => b.status === 'imported').length;
  const pendingCount = pendingBookings.filter(b => b.status === 'pending').length;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="header">
        <h1><i className="fas fa-plug" style={{ color: '#2c5aa0', marginRight: '10px' }}></i>Intégrations & Automatisation</h1>
        <p>Synchronisez Airbnb, Booking.com, VRBO et automatisez votre gestion avec l'IA</p>
      </div>

      {/* KPI Strip */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card">
          <div className="kpi-header"><i className="fas fa-link"></i><h3>Connexions actives</h3></div>
          <div className="kpi-value">{connectedCount}</div>
          <div className="kpi-change stable"><i className="fas fa-calendar"></i> {connections.length} plateforme(s) configurée(s)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><i className="fas fa-cloud-download-alt"></i><h3>En attente d'import</h3></div>
          <div className="kpi-value" style={{ color: pendingCount > 0 ? '#d89a3f' : '#2e7d32' }}>{pendingCount}</div>
          <div className="kpi-change stable"><i className="fas fa-check"></i> {importedCount} importée(s)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><i className="fas fa-robot"></i><h3>Auto-import</h3></div>
          <div className="kpi-value" style={{ fontSize: '18px', color: autoConfig.autoImport ? '#2e7d32' : '#6b7280' }}>
            {autoConfig.autoImport ? 'Activé' : 'Désactivé'}
          </div>
          <div className="kpi-change stable"><i className="fas fa-magic"></i> Réservations auto-appliquées</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-header"><i className="fas fa-comments"></i><h3>IA Messagerie</h3></div>
          <div className="kpi-value" style={{ fontSize: '18px', color: autoConfig.aiReply ? '#2e7d32' : '#6b7280' }}>
            {autoConfig.aiReply ? 'Activée' : 'Désactivée'}
          </div>
          <div className="kpi-change stable"><i className="fas fa-star"></i> Suggestions de réponse</div>
        </div>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {([
          { id: 'connections', label: 'Connexions iCal', icon: 'fas fa-link' },
          { id: 'bookings',    label: `Réservations${pendingCount > 0 ? ` (${pendingCount})` : ''}`, icon: 'fas fa-calendar-check' },
          { id: 'ai',         label: 'Automatisation IA',  icon: 'fas fa-robot' },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: activeSection === tab.id ? '#2c5aa0' : '#f0f0f0',
              color: activeSection === tab.id ? 'white' : '#555',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <i className={tab.icon}></i>{tab.label}
            {tab.id === 'bookings' && pendingCount > 0 && (
              <span style={{ background: '#d89a3f', color: 'white', borderRadius: '20px', padding: '1px 7px', fontSize: '11px', fontWeight: 700 }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── CONNECTIONS ─── */}
      {activeSection === 'connections' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Info banner */}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '16px', display: 'flex', gap: '12px' }}>
            <i className="fas fa-info-circle" style={{ color: '#2563eb', marginTop: '2px', flexShrink: 0 }}></i>
            <div style={{ fontSize: '13px', color: '#1e40af' }}>
              <strong>Comment ça marche :</strong> Airbnb, Booking.com et VRBO permettent d'exporter votre calendrier au format iCal (.ics). Copiez le lien d'exportation depuis votre compte hôte et collez-le ici. La synchronisation importe automatiquement les réservations dans vos logements et votre calendrier.
            </div>
          </div>

          {/* Global sync */}
          {connections.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={syncAll}
                disabled={syncing !== null}
                style={{ padding: '10px 20px', background: '#2c5aa0', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <i className={`fas ${syncing ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
                Synchroniser tout
              </button>
            </div>
          )}

          {/* Per-logement */}
          {logements.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '8px', padding: '40px', textAlign: 'center', color: '#9ca3af', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <i className="fas fa-building" style={{ fontSize: '32px', marginBottom: '12px', display: 'block' }}></i>
              <p>Ajoutez des logements dans l'onglet "Logement" pour configurer des connexions.</p>
            </div>
          ) : (
            logements.map(logement => {
              const logConn = connections.filter(c => c.logementId === logement.id);
              const isAdding = addingFor === logement.id;
              return (
                <div key={logement.id} style={{ background: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', color: '#1f2937' }}>
                        <i className="fas fa-home" style={{ color: '#2c5aa0', marginRight: '8px' }}></i>
                        {logement.name}
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>{logement.address}</p>
                    </div>
                    <button
                      onClick={() => { setAddingFor(isAdding ? null : logement.id); setNewConn({ platform: 'airbnb', url: '' }); }}
                      style={{ padding: '8px 14px', background: isAdding ? '#f3f4f6' : '#2c5aa0', color: isAdding ? '#374151' : 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <i className={`fas ${isAdding ? 'fa-times' : 'fa-plus'}`}></i>
                      {isAdding ? 'Annuler' : 'Ajouter'}
                    </button>
                  </div>

                  {/* Add form */}
                  {isAdding && (
                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                        {PLATFORMS.map(p => (
                          <button
                            key={p.id}
                            onClick={() => { setNewConn(n => ({ ...n, platform: p.id })); setShowHowtoFor(null); }}
                            style={{ padding: '6px 14px', borderRadius: '20px', border: `2px solid ${newConn.platform === p.id ? p.color : '#e5e7eb'}`, background: newConn.platform === p.id ? p.color : 'white', color: newConn.platform === p.id ? p.textColor : '#374151', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.15s' }}
                          >
                            <i className={p.icon} style={{ marginRight: '5px' }}></i>{p.label}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => setShowHowtoFor(showHowtoFor === `${logement.id}_${newConn.platform}` ? null : `${logement.id}_${newConn.platform}`)}
                        style={{ background: 'none', border: 'none', color: '#2c5aa0', cursor: 'pointer', fontSize: '12px', marginBottom: '10px', padding: 0 }}
                      >
                        <i className="fas fa-question-circle" style={{ marginRight: '4px' }}></i>
                        Où trouver l'URL iCal sur {getPlatform(newConn.platform).label} ?
                      </button>

                      {showHowtoFor === `${logement.id}_${newConn.platform}` && (
                        <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: '6px', padding: '10px 14px', fontSize: '12px', color: '#92400e', marginBottom: '10px' }}>
                          <i className="fas fa-map-marker-alt" style={{ marginRight: '6px' }}></i>
                          {getPlatform(newConn.platform).howto}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="url"
                          value={newConn.url}
                          onChange={e => setNewConn(n => ({ ...n, url: e.target.value }))}
                          placeholder={`URL iCal ${getPlatform(newConn.platform).label} (https://...)`}
                          style={{ flex: 1, padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
                        />
                        <button
                          onClick={() => addConnection(logement.id)}
                          disabled={!newConn.url.trim()}
                          style={{ padding: '10px 18px', background: '#2c5aa0', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', opacity: !newConn.url.trim() ? 0.5 : 1 }}
                        >
                          <i className="fas fa-save" style={{ marginRight: '5px' }}></i>Ajouter
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Connections list */}
                  {logConn.length === 0 ? (
                    <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>
                      <i className="fas fa-unlink" style={{ marginRight: '6px' }}></i>Aucune plateforme connectée
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {logConn.map(conn => {
                        const plat = getPlatform(conn.platform);
                        const err = syncErrors[conn.id];
                        const ok = syncSuccess[conn.id];
                        return (
                          <div key={conn.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', background: conn.enabled ? 'white' : '#f9fafb' }}>
                            <span style={{ background: plat.color, color: plat.textColor, padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                              <i className={plat.icon} style={{ marginRight: '4px' }}></i>{plat.label}
                            </span>
                            <span style={{ flex: 1, fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {conn.url}
                            </span>
                            {conn.lastSync && !err && !ok && (
                              <span style={{ fontSize: '11px', color: '#9ca3af', flexShrink: 0 }}>
                                <i className="fas fa-clock" style={{ marginRight: '3px' }}></i>
                                {new Date(conn.lastSync).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                            {err && <span style={{ fontSize: '11px', color: '#dc2626', flexShrink: 0 }}><i className="fas fa-times-circle" style={{ marginRight: '3px' }}></i>{err}</span>}
                            {ok !== undefined && !err && <span style={{ fontSize: '11px', color: '#16a34a', flexShrink: 0 }}><i className="fas fa-check-circle" style={{ marginRight: '3px' }}></i>{ok} nouv.</span>}
                            <button
                              onClick={() => toggleConnection(conn.id)}
                              title={conn.enabled ? 'Désactiver' : 'Activer'}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: conn.enabled ? '#2e7d32' : '#9ca3af', flexShrink: 0 }}
                            >
                              <i className={`fas ${conn.enabled ? 'fa-toggle-on' : 'fa-toggle-off'}`}></i>
                            </button>
                            <button
                              onClick={() => syncOne(conn)}
                              disabled={syncing === conn.id || !conn.enabled}
                              title="Synchroniser"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#2c5aa0', flexShrink: 0, opacity: !conn.enabled ? 0.4 : 1 }}
                            >
                              <i className={`fas ${syncing === conn.id ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
                            </button>
                            <button
                              onClick={() => removeConnection(conn.id)}
                              title="Supprimer"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#dc2626', flexShrink: 0, opacity: 0.6 }}
                              onMouseOver={e => (e.currentTarget.style.opacity = '1')}
                              onMouseOut={e => (e.currentTarget.style.opacity = '0.6')}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── BOOKINGS ─── */}
      {activeSection === 'bookings' && (
        <div style={{ background: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#1f2937' }}>
              <i className="fas fa-calendar-check" style={{ color: '#2c5aa0', marginRight: '8px' }}></i>
              Réservations importées
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              {importedCount > 0 && (
                <button onClick={clearImported} style={{ padding: '8px 14px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  <i className="fas fa-broom" style={{ marginRight: '5px' }}></i>Vider les importées
                </button>
              )}
              {pendingCount > 0 && (
                <button
                  onClick={importAll}
                  disabled={importingAll}
                  style={{ padding: '8px 14px', background: '#2c5aa0', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                >
                  <i className={`fas ${importingAll ? 'fa-spinner fa-spin' : 'fa-cloud-download-alt'}`} style={{ marginRight: '5px' }}></i>
                  Tout importer ({pendingCount})
                </button>
              )}
            </div>
          </div>

          {pendingBookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
              <i className="fas fa-calendar-times" style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}></i>
              <p style={{ margin: 0 }}>Aucune réservation importée pour l'instant.</p>
              <p style={{ margin: '8px 0 0', fontSize: '13px' }}>Configurez vos connexions iCal et cliquez sur "Synchroniser".</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Plateforme', 'Voyageur', 'Logement', 'Arrivée', 'Départ', 'Statut', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingBookings.map((b, i) => {
                  const plat = PLATFORMS.find(p => p.label === b.platform) || PLATFORMS[3];
                  return (
                    <tr key={b.uid} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '12px' }}>
                        <span style={{ background: plat.color, color: plat.textColor, padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>
                          {b.platform}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>{b.guestName}</td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#6b7280' }}>{b.logementName}</td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#374151' }}>{formatDate(b.startDate)}</td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#374151' }}>{formatDate(b.endDate)}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                          background: b.status === 'imported' ? '#dcfce7' : b.status === 'skipped' ? '#f3f4f6' : '#fef3c7',
                          color: b.status === 'imported' ? '#16a34a' : b.status === 'skipped' ? '#6b7280' : '#92400e',
                        }}>
                          {b.status === 'imported' ? '✓ Importée' : b.status === 'skipped' ? 'Ignorée' : '⏳ En attente'}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {b.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => importOne(b)}
                              disabled={importing === b.uid}
                              style={{ padding: '5px 10px', background: '#2c5aa0', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                            >
                              <i className={`fas ${importing === b.uid ? 'fa-spinner fa-spin' : 'fa-download'}`} style={{ marginRight: '4px' }}></i>
                              Importer
                            </button>
                            <button
                              onClick={() => skipBooking(b.uid)}
                              style={{ padding: '5px 8px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}
                            >
                              Ignorer
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─── AI CONFIG ─── */}
      {activeSection === 'ai' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Disclaimer */}
          <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: '8px', padding: '16px', display: 'flex', gap: '12px' }}>
            <i className="fas fa-exclamation-triangle" style={{ color: '#d97706', marginTop: '2px', flexShrink: 0 }}></i>
            <div style={{ fontSize: '13px', color: '#92400e' }}>
              <strong>Accès direct aux messages Airbnb / Booking :</strong> Airbnb et Booking.com requièrent une approbation officielle en tant que partenaire logiciel (Airbnb API Connect, Booking.com Connectivity Partner). En attendant, utilisez la synchronisation iCal pour importer les réservations, et l'IA Side Kick pour rédiger vos réponses depuis la Messagerie.
            </div>
          </div>

          {/* Toggles */}
          <div style={{ background: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '16px', color: '#1f2937' }}>
              <i className="fas fa-robot" style={{ color: '#2c5aa0', marginRight: '8px' }}></i>
              Paramètres d'automatisation
            </h3>

            {[
              { key: 'autoImport' as const, label: 'Auto-importer les réservations', desc: 'Dès qu\'une synchronisation détecte une nouvelle réservation, elle est automatiquement ajoutée à vos logements et au calendrier', icon: 'fa-calendar-plus' },
              { key: 'aiReply' as const, label: 'Suggestions de réponse IA', desc: 'Dans l\'onglet Messagerie, un bouton "✨ IA Suggère" génère une réponse professionnelle pour chaque message', icon: 'fa-comment-dots' },
            ].map(({ key, label, desc, icon }) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <i className={`fas ${icon}`} style={{ color: '#2c5aa0', fontSize: '20px', marginTop: '2px', flexShrink: 0 }}></i>
                  <div>
                    <div style={{ fontWeight: 700, color: '#1f2937', marginBottom: '4px', fontSize: '14px' }}>{label}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.5' }}>{desc}</div>
                  </div>
                </div>
                <button
                  onClick={() => saveAutoConfig({ ...autoConfig, [key]: !autoConfig[key] })}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '28px', color: autoConfig[key] ? '#2e7d32' : '#d1d5db', flexShrink: 0, marginLeft: '16px' }}
                >
                  <i className={`fas ${autoConfig[key] ? 'fa-toggle-on' : 'fa-toggle-off'}`}></i>
                </button>
              </div>
            ))}
          </div>

          {/* Reply template */}
          <div style={{ background: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: '#1f2937' }}>
              <i className="fas fa-file-alt" style={{ color: '#2c5aa0', marginRight: '8px' }}></i>
              Modèle de message de bienvenue
            </h3>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 16px' }}>
              Variables disponibles : <code style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: '3px' }}>{'{nom}'}</code> <code style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: '3px' }}>{'{debut}'}</code> <code style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: '3px' }}>{'{fin}'}</code> <code style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: '3px' }}>{'{logement}'}</code>
            </p>
            <textarea
              value={autoConfig.replyTemplate}
              onChange={e => setAutoConfig(prev => ({ ...prev, replyTemplate: e.target.value }))}
              rows={6}
              style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                onClick={() => saveAutoConfig(autoConfig)}
                style={{ padding: '10px 20px', background: '#2c5aa0', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
              >
                <i className="fas fa-save" style={{ marginRight: '6px' }}></i>Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Util functions ──────────────────────────────────────────────────────────

function extractGuestName(summary: string, platform: string): string {
  if (!summary) return 'Voyageur';
  // Airbnb blocked time: "Airbnb (Not available)" or similar
  if (/not available|indisponible|blocked|fermé/i.test(summary)) return 'Indisponible';
  // Remove platform name prefix if present
  const cleaned = summary.replace(/^(airbnb|booking\.com|vrbo|homeaway)\s*[-–:]\s*/i, '').trim();
  return cleaned || 'Voyageur';
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}
