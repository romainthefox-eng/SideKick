'use client';

import { useState, useEffect, useMemo } from 'react';
import { useProperty } from '../context/PropertyContext';

// ── Types ─────────────────────────────────────────────────────────────────────

type Platform = 'airbnb' | 'booking' | 'vrbo' | 'google' | 'direct' | 'other';

interface Review {
  id: string;
  logementId: number;
  logementName: string;
  platform: Platform;
  guestName: string;
  date: string;          // ISO date string
  rating: number;        // 1–5
  comment: string;
  hostResponse?: string;
  importedAt: string;
}

interface NewReviewForm {
  logementId: number;
  platform: Platform;
  guestName: string;
  date: string;
  rating: number;
  comment: string;
  hostResponse: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<Platform, { label: string; color: string; icon: string }> = {
  airbnb:  { label: 'Airbnb',        color: '#FF5A5F', icon: 'fa-home' },
  booking: { label: 'Booking.com',   color: '#003580', icon: 'fa-bed' },
  vrbo:    { label: 'VRBO',          color: '#3D65B0', icon: 'fa-umbrella-beach' },
  google:  { label: 'Google',        color: '#4285F4', icon: 'fa-google' },
  direct:  { label: 'Direct',        color: '#2e7d32', icon: 'fa-handshake' },
  other:   { label: 'Autre',         color: '#6b7280', icon: 'fa-star' },
};

const STORAGE_KEY = 'sk_reviews';

const BLANK_FORM: NewReviewForm = {
  logementId: 0,
  platform: 'airbnb',
  guestName: '',
  date: new Date().toISOString().slice(0, 10),
  rating: 5,
  comment: '',
  hostResponse: '',
};

// ── Demo data (seeds on first load) ──────────────────────────────────────────

function seedDemoReviews(logements: { id: number; name: string }[]): Review[] {
  if (!logements.length) return [];
  const [l1, l2] = logements;
  return [
    { id: 'demo-1', logementId: l1.id, logementName: l1.name, platform: 'airbnb', guestName: 'Sophie L.', date: '2025-06-10', rating: 5, comment: 'Appartement magnifique, très propre. Hôte réactif et sympathique. Nous reviendrons !', importedAt: new Date().toISOString() },
    { id: 'demo-2', logementId: l1.id, logementName: l1.name, platform: 'booking', guestName: 'Marcus W.', date: '2025-06-18', rating: 4, comment: 'Bel endroit, bien situé. Quelques petits défauts mineurs mais globalement excellent séjour.', hostResponse: 'Merci beaucoup Marcus, nous espérons vous revoir prochainement !', importedAt: new Date().toISOString() },
    { id: 'demo-3', logementId: l1.id, logementName: l1.name, platform: 'airbnb', guestName: 'Amélie P.', date: '2025-07-02', rating: 5, comment: 'Parfait sous tous les aspects. Communication impeccable, logement conforme aux photos.', importedAt: new Date().toISOString() },
    { id: 'demo-4', logementId: l1.id, logementName: l1.name, platform: 'vrbo', guestName: 'David R.', date: '2025-07-12', rating: 3, comment: 'Séjour correct mais la connexion Wi-Fi était instable. Le logement est agréable sinon.', importedAt: new Date().toISOString() },
    ...(l2 ? [
      { id: 'demo-5', logementId: l2.id, logementName: l2.name, platform: 'airbnb' as Platform, guestName: 'Nina B.', date: '2025-06-22', rating: 5, comment: 'Coup de cœur total ! Décoration soignée, literie confortable. 10/10.', importedAt: new Date().toISOString() },
      { id: 'demo-6', logementId: l2.id, logementName: l2.name, platform: 'booking' as Platform, guestName: 'Julien M.', date: '2025-07-08', rating: 4, comment: 'Très bon séjour. Logement propre et bien équipé. Hôte disponible.', hostResponse: 'Merci Julien, c\'est un plaisir !', importedAt: new Date().toISOString() },
    ] : []),
  ];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Avis() {
  const { logements } = useProperty();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Filters
  const [filterLogement, setFilterLogement] = useState<number | 'all'>('all');
  const [filterPlatform, setFilterPlatform] = useState<Platform | 'all'>('all');
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');

  // UI state
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<NewReviewForm>({ ...BLANK_FORM, logementId: logements[0]?.id ?? 0 });
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list');
  const [sortBy, setSortBy] = useState<'date' | 'rating'>('date');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load from localStorage (or seed demo data)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setReviews(JSON.parse(saved));
      } else if (logements.length > 0) {
        const demo = seedDemoReviews(logements.map(l => ({ id: l.id, name: l.name })));
        setReviews(demo);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
      }
    } catch { /* noop */ }
    setLoaded(true);
  }, [logements]);

  const save = (next: Review[]) => {
    setReviews(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* noop */ }
  };

  // ── Filtered & sorted list ───────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = [...reviews];
    if (filterLogement !== 'all') list = list.filter(r => r.logementId === filterLogement);
    if (filterPlatform !== 'all') list = list.filter(r => r.platform === filterPlatform);
    if (filterRating !== 'all') list = list.filter(r => r.rating === filterRating);
    list.sort((a, b) => sortBy === 'date'
      ? new Date(b.date).getTime() - new Date(a.date).getTime()
      : b.rating - a.rating);
    return list;
  }, [reviews, filterLogement, filterPlatform, filterRating, sortBy]);

  // ── Stats ────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const scope = filterLogement === 'all' ? reviews : reviews.filter(r => r.logementId === filterLogement);
    const avg = scope.length ? scope.reduce((s, r) => s + r.rating, 0) / scope.length : 0;
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    scope.forEach(r => dist[r.rating]++);
    const byPlatform = Object.fromEntries(
      (Object.keys(PLATFORM_CONFIG) as Platform[]).map(p => [
        p,
        { count: scope.filter(r => r.platform === p).length, avg: (() => { const x = scope.filter(r => r.platform === p); return x.length ? x.reduce((s, r) => s + r.rating, 0) / x.length : 0; })() },
      ])
    );
    const responded = scope.filter(r => r.hostResponse).length;
    return { avg, dist, byPlatform, total: scope.length, responded };
  }, [reviews, filterLogement]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleAddReview = () => {
    if (!form.logementId) return setError('Sélectionnez un logement');
    if (!form.guestName.trim()) return setError('Nom du voyageur requis');
    if (!form.comment.trim()) return setError('Commentaire requis');
    const lgt = logements.find(l => l.id === Number(form.logementId));
    const review: Review = {
      id: `r-${Date.now()}`,
      logementId: Number(form.logementId),
      logementName: lgt?.name ?? 'Logement',
      platform: form.platform,
      guestName: form.guestName.trim(),
      date: form.date,
      rating: form.rating,
      comment: form.comment.trim(),
      hostResponse: form.hostResponse.trim() || undefined,
      importedAt: new Date().toISOString(),
    };
    save([review, ...reviews]);
    setShowAddModal(false);
    setForm({ ...BLANK_FORM, logementId: logements[0]?.id ?? 0 });
    setError('');
    setSuccess('Avis ajouté !');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleSaveResponse = (id: string) => {
    const next = reviews.map(r => r.id === id ? { ...r, hostResponse: responseText.trim() } : r);
    save(next);
    setRespondingId(null);
    setResponseText('');
    setSuccess('Réponse enregistrée !');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDeleteReview = (id: string) => {
    if (!confirm('Supprimer cet avis ?')) return;
    save(reviews.filter(r => r.id !== id));
  };

  const handleAiResponse = async (review: Review) => {
    setAiLoading(review.id);
    try {
      const res = await fetch('/api/ai-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `L'avis du voyageur est : "${review.comment}" — Note : ${review.rating}/5`,
          tenantName: review.guestName,
          propertyName: review.logementName,
          context: 'review_response',
        }),
      });
      const data = await res.json();
      setRespondingId(review.id);
      setResponseText(data.reply ?? '');
    } catch {
      setError('IA indisponible. Répondez manuellement.');
    } finally {
      setAiLoading(null);
    }
  };

  if (!loaded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#2c5aa0' }}></i>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="header">
        <h1><i className="fas fa-star" style={{ color: '#f59e0b', marginRight: '10px' }}></i>Avis Voyageurs</h1>
        <p>Centralisez et répondez aux avis de toutes vos plateformes</p>
      </div>

      {/* Alerts */}
      {error && <AlertBanner type="error" msg={error} onClose={() => setError('')} />}
      {success && <AlertBanner type="success" msg={success} onClose={() => setSuccess('')} />}

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: '#f3f4f6', borderRadius: '8px', padding: '4px' }}>
          {(['list', 'stats'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              padding: '8px 18px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              background: activeTab === t ? 'white' : 'transparent',
              color: activeTab === t ? '#1f2937' : '#6b7280',
              boxShadow: activeTab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}>
              <i className={`fas ${t === 'list' ? 'fa-list' : 'fa-chart-bar'}`} style={{ marginRight: '6px' }}></i>
              {t === 'list' ? 'Avis' : 'Statistiques'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAddModal(true)} style={{ padding: '10px 18px', background: '#2c5aa0', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fas fa-plus"></i> Ajouter un avis
        </button>
      </div>

      {/* Filters */}
      <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb', padding: '16px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280' }}><i className="fas fa-filter" style={{ marginRight: '6px' }}></i>Filtres</span>
        <select value={filterLogement} onChange={e => setFilterLogement(e.target.value === 'all' ? 'all' : Number(e.target.value))} style={selectStyle}>
          <option value="all">Tous les logements</option>
          {logements.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value as Platform | 'all')} style={selectStyle}>
          <option value="all">Toutes les plateformes</option>
          {(Object.entries(PLATFORM_CONFIG) as [Platform, typeof PLATFORM_CONFIG[Platform]][]).map(([p, cfg]) =>
            <option key={p} value={p}>{cfg.label}</option>
          )}
        </select>
        <select value={filterRating} onChange={e => setFilterRating(e.target.value === 'all' ? 'all' : Number(e.target.value))} style={selectStyle}>
          <option value="all">Toutes les notes</option>
          {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{'⭐'.repeat(n)}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as 'date' | 'rating')} style={selectStyle}>
          <option value="date">Trier par date</option>
          <option value="rating">Trier par note</option>
        </select>
        <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#6b7280' }}>{filtered.length} avis</span>
      </div>

      {/* ── LIST TAB ─── */}
      {activeTab === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
              <i className="fas fa-star" style={{ fontSize: '40px', marginBottom: '12px', display: 'block' }}></i>
              <p style={{ margin: 0, fontSize: '15px' }}>Aucun avis trouvé</p>
              <p style={{ margin: '6px 0 0', fontSize: '13px' }}>Ajoutez votre premier avis ou modifiez les filtres</p>
            </div>
          )}
          {filtered.map(review => (
            <ReviewCard
              key={review.id}
              review={review}
              respondingId={respondingId}
              responseText={responseText}
              aiLoading={aiLoading}
              onStartRespond={() => { setRespondingId(review.id); setResponseText(review.hostResponse ?? ''); }}
              onCancelRespond={() => { setRespondingId(null); setResponseText(''); }}
              onSaveResponse={() => handleSaveResponse(review.id)}
              onAiResponse={() => handleAiResponse(review)}
              onDelete={() => handleDeleteReview(review.id)}
              onResponseChange={setResponseText}
            />
          ))}
        </div>
      )}

      {/* ── STATS TAB ─── */}
      {activeTab === 'stats' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

          {/* Overall score */}
          <div style={card}>
            <h3 style={sectionTitle}>Note globale</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '56px', fontWeight: 800, color: ratingColor(stats.avg), lineHeight: 1 }}>{stats.avg.toFixed(1)}</div>
                <StarRow rating={stats.avg} size={18} />
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{stats.total} avis</div>
              </div>
              <div style={{ flex: 1 }}>
                {[5, 4, 3, 2, 1].map(n => {
                  const count = stats.dist[n] || 0;
                  const pct = stats.total ? (count / stats.total) * 100 : 0;
                  return (
                    <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280', width: '12px', textAlign: 'right' }}>{n}</span>
                      <i className="fas fa-star" style={{ color: '#f59e0b', fontSize: '10px' }}></i>
                      <div style={{ flex: 1, height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: ratingColor(n), borderRadius: '4px', transition: 'width 0.5s' }}></div>
                      </div>
                      <span style={{ fontSize: '12px', color: '#9ca3af', width: '20px' }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#16a34a' }}>{stats.responded}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Réponses publiées</div>
              </div>
              <div style={{ background: '#fef9c3', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#ca8a04' }}>{stats.total - stats.responded}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Sans réponse</div>
              </div>
            </div>
          </div>

          {/* By platform */}
          <div style={card}>
            <h3 style={sectionTitle}>Par plateforme</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(Object.entries(PLATFORM_CONFIG) as [Platform, typeof PLATFORM_CONFIG[Platform]][])
                .filter(([p]) => (stats.byPlatform[p]?.count ?? 0) > 0)
                .map(([p, cfg]) => {
                  const ps = stats.byPlatform[p];
                  return (
                    <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', flexShrink: 0 }}>
                        <i className={`fas ${cfg.icon}`}></i>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1f2937' }}>{cfg.label}</div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>{ps.count} avis</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: ratingColor(ps.avg) }}>{ps.avg.toFixed(1)}</div>
                        <StarRow rating={ps.avg} size={10} />
                      </div>
                    </div>
                  );
                })}
              {stats.total === 0 && <p style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', margin: '20px 0' }}>Aucun avis pour cette sélection</p>}
            </div>
          </div>

          {/* By property */}
          {filterLogement === 'all' && (
            <div style={{ ...card, gridColumn: '1 / -1' }}>
              <h3 style={sectionTitle}>Par logement</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                {logements.map(l => {
                  const lreviews = reviews.filter(r => r.logementId === l.id);
                  const lavg = lreviews.length ? lreviews.reduce((s, r) => s + r.rating, 0) / lreviews.length : 0;
                  return (
                    <div key={l.id} style={{ background: '#f9fafb', borderRadius: '10px', padding: '16px', border: '1px solid #e5e7eb' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#1f2937', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '28px', fontWeight: 800, color: ratingColor(lavg) }}>{lreviews.length ? lavg.toFixed(1) : '—'}</span>
                        <div>
                          <StarRow rating={lavg} size={12} />
                          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{lreviews.length} avis</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ADD MODAL ─── */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: '18px', color: '#1f2937' }}>
              <i className="fas fa-plus-circle" style={{ color: '#2c5aa0', marginRight: '8px' }}></i>Ajouter un avis
            </h2>
            {error && <AlertBanner type="error" msg={error} onClose={() => setError('')} />}

            {/* Logement */}
            <Field label="Logement">
              <select value={form.logementId} onChange={e => setForm({ ...form, logementId: Number(e.target.value) })} style={selectStyle}>
                <option value={0}>Choisir un logement</option>
                {logements.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>

            {/* Platform */}
            <Field label="Plateforme">
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(Object.entries(PLATFORM_CONFIG) as [Platform, typeof PLATFORM_CONFIG[Platform]][]).map(([p, cfg]) => (
                  <button key={p} onClick={() => setForm({ ...form, platform: p })} style={{
                    padding: '6px 12px', borderRadius: '6px', border: `2px solid ${form.platform === p ? cfg.color : '#e5e7eb'}`,
                    background: form.platform === p ? cfg.color : 'white',
                    color: form.platform === p ? 'white' : '#374151',
                    cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                  }}>
                    <i className={`fas ${cfg.icon}`} style={{ marginRight: '4px' }}></i>{cfg.label}
                  </button>
                ))}
              </div>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Nom du voyageur">
                <input value={form.guestName} onChange={e => setForm({ ...form, guestName: e.target.value })} placeholder="Jean Dupont" style={inputStyle} />
              </Field>
              <Field label="Date du séjour">
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} />
              </Field>
            </div>

            {/* Rating */}
            <Field label={`Note : ${form.rating}/5`}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setForm({ ...form, rating: n })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '28px', color: n <= form.rating ? '#f59e0b' : '#d1d5db' }}>★</button>
                ))}
              </div>
            </Field>

            <Field label="Commentaire du voyageur">
              <textarea value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} rows={3} placeholder="Ce que le voyageur a dit..." style={{ ...inputStyle, resize: 'vertical' }} />
            </Field>

            <Field label="Votre réponse (optionnel)">
              <textarea value={form.hostResponse} onChange={e => setForm({ ...form, hostResponse: e.target.value })} rows={2} placeholder="Votre réponse à l'avis..." style={{ ...inputStyle, resize: 'vertical' }} />
            </Field>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button onClick={handleAddReview} style={{ flex: 1, padding: '12px', background: '#2c5aa0', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}>
                <i className="fas fa-save" style={{ marginRight: '6px' }}></i> Enregistrer
              </button>
              <button onClick={() => { setShowAddModal(false); setError(''); }} style={{ flex: 1, padding: '12px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ReviewCard ────────────────────────────────────────────────────────────────

function ReviewCard({ review, respondingId, responseText, aiLoading, onStartRespond, onCancelRespond, onSaveResponse, onAiResponse, onDelete, onResponseChange }: {
  review: Review;
  respondingId: string | null;
  responseText: string;
  aiLoading: string | null;
  onStartRespond: () => void;
  onCancelRespond: () => void;
  onSaveResponse: () => void;
  onAiResponse: () => void;
  onDelete: () => void;
  onResponseChange: (t: string) => void;
}) {
  const cfg = PLATFORM_CONFIG[review.platform];
  const isResponding = respondingId === review.id;
  const isAiLoading = aiLoading === review.id;

  return (
    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Avatar */}
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `linear-gradient(135deg, ${cfg.color}30, ${cfg.color}60)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: cfg.color, flexShrink: 0 }}>
            {review.guestName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#1f2937' }}>{review.guestName}</div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>{new Date(review.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} · {review.logementName}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Platform badge */}
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '12px', background: cfg.color, color: 'white', fontSize: '11px', fontWeight: 700 }}>
            <i className={`fas ${cfg.icon}`}></i> {cfg.label}
          </span>
          {/* Star rating */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fef9c3', padding: '4px 10px', borderRadius: '12px' }}>
            <StarRow rating={review.rating} size={12} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#ca8a04' }}>{review.rating}/5</span>
          </div>
          {/* Delete */}
          <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: '4px' }} title="Supprimer">
            <i className="fas fa-trash" style={{ fontSize: '13px' }}></i>
          </button>
        </div>
      </div>

      {/* Comment */}
      <p style={{ margin: '0 0 12px', fontSize: '14px', color: '#374151', lineHeight: 1.6, padding: '12px', background: '#f9fafb', borderRadius: '8px', borderLeft: `3px solid ${cfg.color}` }}>
        "{review.comment}"
      </p>

      {/* Host response (if exists) */}
      {review.hostResponse && !isResponding && (
        <div style={{ padding: '10px 14px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '13px', color: '#1e40af', marginBottom: '12px', display: 'flex', gap: '8px' }}>
          <i className="fas fa-reply" style={{ marginTop: '2px', flexShrink: 0 }}></i>
          <span><strong>Votre réponse :</strong> {review.hostResponse}</span>
        </div>
      )}

      {/* Response editor */}
      {isResponding ? (
        <div style={{ marginTop: '12px' }}>
          <textarea
            value={responseText}
            onChange={e => onResponseChange(e.target.value)}
            rows={3}
            placeholder="Rédigez votre réponse..."
            style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button onClick={onSaveResponse} style={{ padding: '8px 16px', background: '#2c5aa0', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fas fa-save"></i> Enregistrer
            </button>
            <button onClick={onAiResponse} disabled={isAiLoading} style={{ padding: '8px 14px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', opacity: isAiLoading ? 0.7 : 1 }}>
              {isAiLoading ? <><i className="fas fa-spinner fa-spin"></i> IA...</> : <><i className="fas fa-magic"></i> Suggérer IA</>}
            </button>
            <button onClick={onCancelRespond} style={{ padding: '8px 14px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button onClick={onStartRespond} style={{ padding: '7px 14px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <i className="fas fa-reply"></i> {review.hostResponse ? 'Modifier la réponse' : 'Répondre'}
        </button>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StarRow({ rating, size }: { rating: number; size: number }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <i key={n} className={`fas ${rating >= n ? 'fa-star' : rating >= n - 0.5 ? 'fa-star-half-alt' : 'fa-star'}`}
          style={{ fontSize: `${size}px`, color: rating >= n - 0.5 ? '#f59e0b' : '#d1d5db' }}></i>
      ))}
    </div>
  );
}

function AlertBanner({ type, msg, onClose }: { type: 'error' | 'success'; msg: string; onClose: () => void }) {
  const isErr = type === 'error';
  return (
    <div style={{ background: isErr ? '#fef2f2' : '#f0fdf4', border: `1px solid ${isErr ? '#fecaca' : '#bbf7d0'}`, borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: isErr ? '#dc2626' : '#16a34a', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <i className={`fas ${isErr ? 'fa-times-circle' : 'fa-check-circle'}`}></i>{msg}
      <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}><i className="fas fa-times"></i></button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>{label}</label>
      {children}
    </div>
  );
}

function ratingColor(n: number): string {
  if (n >= 4.5) return '#16a34a';
  if (n >= 3.5) return '#65a30d';
  if (n >= 2.5) return '#ca8a04';
  if (n >= 1.5) return '#ea580c';
  return '#dc2626';
}

// Shared styles
const card: React.CSSProperties = {
  background: 'white',
  borderRadius: '12px',
  padding: '24px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  border: '1px solid #e5e7eb',
};

const sectionTitle: React.CSSProperties = {
  margin: '0 0 20px',
  fontSize: '15px',
  color: '#1f2937',
  fontWeight: 700,
};

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '13px',
  background: 'white',
  cursor: 'pointer',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '13px',
  boxSizing: 'border-box',
};
