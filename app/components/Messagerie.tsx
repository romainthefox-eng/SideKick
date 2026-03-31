'use client';

import { useState, useEffect, useRef } from 'react';
import { useProperty } from '../context/PropertyContext';
import type { Logement, Rental } from '../context/PropertyContext';

/* --- Types ---------------------------------------------------------------- */

interface ChatMessage {
  id: number;
  text: string;
  sender: 'me' | 'guest';
  timestamp: string;
  platform?: string;
  translated?: string;
}

interface ConvData {
  messages: ChatMessage[];
  internalNote: string;
  unread: number;
}

/* --- Helpers -------------------------------------------------------------- */

const PLATFORM_COLOR: Record<string, string> = {
  'Airbnb': '#FF5A5F',
  'Booking.com': '#003580',
  'VRBO / Abritel': '#3D65B0',
};

const AVATAR_COLORS = ['#667eea', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899'];

function avatarColor(name: string): string {
  const code = (name.charCodeAt(0) || 0) + (name.charCodeAt(1) || 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function initials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntil(dateStr: string): number {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
}

function statusFor(start: string, end: string): { label: string; color: string; bg: string } {
  const now = new Date();
  const s = new Date(start), e = new Date(end);
  if (now >= s && now <= e) return { label: 'En sejour', color: '#059669', bg: '#d1fae5' };
  if (now < s) return { label: 'A venir', color: '#2563eb', bg: '#dbeafe' };
  return { label: 'Termine', color: '#9ca3af', bg: '#f3f4f6' };
}

function urgencyBadge(start: string, end: string): { text: string; color: string } | null {
  const { label } = statusFor(start, end);
  if (label === 'Termine') return null;
  const du = daysUntil(start);
  const de = daysUntil(end);
  if (label === 'En sejour') {
    if (de === 0) return { text: 'Depart auj.', color: '#dc2626' };
    return { text: 'En sejour', color: '#059669' };
  }
  if (du === 0) return { text: 'Arrive auj.', color: '#ea580c' };
  if (du === 1) return { text: 'Arrive demain', color: '#d97706' };
  if (du <= 3) return { text: `Dans ${du}j`, color: '#d97706' };
  if (du <= 7) return { text: `Dans ${du}j`, color: '#6b7280' };
  return null;
}

function sortScore(start: string, end: string): number {
  const now = new Date();
  const s = new Date(start), e = new Date(end);
  if (now > e) return 99_999;
  if (now >= s) return -1;
  return daysUntil(start);
}

function looksNonFrench(text: string): boolean {
  const frWords = ['bonjour', 'merci', 'oui', 'non', 'voici', 'pour', 'dans', 'avec', 'votre',
    'je', 'vous', 'tout', 'bonne', 'bien', 'est', 'les', 'des', 'une', 'mon', 'ma', 'pas'];
  const words = text.toLowerCase().split(/\s+/);
  const hasFrench = words.some(w => frWords.includes(w));
  const hasLatin = /[a-zA-Z]{3,}/.test(text);
  return hasLatin && !hasFrench;
}

/* --- Template builder ----------------------------------------------------- */

function buildTemplates(lg: Logement | undefined, tenantName: string) {
  const wifi = lg?.wifi_code
    ? `Le code WiFi est : ${lg.wifi_code}`
    : "Le code WiFi vous sera communique a votre arrivee.";
  const key = lg?.check_in_type === 'boitier'
    ? `Votre acces se fait via le boitier securise${lg.key_location ? ` (${lg.key_location})` : ''}.`
    : lg?.check_in_type === 'serrure'
    ? `Votre acces se fait via la serrure connectee${lg.key_location ? ` (${lg.key_location})` : ''}.`
    : lg?.key_location
    ? `Les cles se trouvent : ${lg.key_location}`
    : "Les instructions d'acces vous seront envoyees avant votre arrivee.";
  const code = lg?.building_code ? `\nCode immeuble : ${lg.building_code}` : '';
  const fn = tenantName.split(' ')[0];

  return [
    { label: 'Bienvenue', icon: 'fa-star',
      text: `Bonjour ${fn},\n\nBienvenue ! Tout est pret pour votre arrivee.\n${key}${code}\n\nJe reste disponible. Bon sejour !` },
    { label: 'Code WiFi', icon: 'fa-wifi',
      text: `Bonjour ${fn},\n\n${wifi}\n\nBonne connexion !` },
    { label: 'Acces / Cles', icon: 'fa-key',
      text: `Bonjour ${fn},\n\n${key}${code}\n\nN'hesitez pas a me contacter si besoin.` },
    { label: 'Arrivee', icon: 'fa-door-open',
      text: `Bonjour ${fn},\n\nVoici les informations pour votre arrivee :\n${key}${code}\n${wifi}\n\nBon sejour !` },
    { label: 'Depart', icon: 'fa-sign-out-alt',
      text: `Bonjour ${fn},\n\nPour votre depart :\n- Laissez les cles sur la table\n- Fermez fenetres et volets\n- Sortez les poubelles si necessaire\n\nMerci pour votre sejour !` },
    { label: 'Reglement', icon: 'fa-list-check',
      text: `Bonjour ${fn},\n\nQuelques rappels :\n- Pas de bruit apres 22h\n- Logement non-fumeur\n- Animaux non autorises sauf accord\n\nMerci de votre comprehension !` },
  ];
}

/* --- Demo incoming messages ----------------------------------------------- */

const DEMO_MSGS = [
  'Bonjour, a quelle heure puis-je arriver ?',
  "Where is the parking exactly? I can't find it.",
  'Hola! Cual es el codigo del WiFi?',
  "Bonjour, j'arrive dans 30 minutes, tout est ok ?",
  'Danke! Wo finde ich die Handtucher?',
  'Hi! Is there a hair dryer in the bathroom?',
  "Bonjour, y'a-t-il une machine a laver ?",
];

/* --- Component ------------------------------------------------------------ */

type EnrichedRental = Rental & { _i: number };

export default function Messagerie() {
  const { logements, rentals } = useProperty();

  const [platformMap, setPlatformMap] = useState<Record<string, string>>({});
  const [convs, setConvs] = useState<Record<number, ConvData>>({});
  const [selIdx, setSelIdx] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [translating, setTranslating] = useState<Record<number, boolean>>({});
  const [showTemplates, setShowTemplates] = useState(false);
  const [noteEdit, setNoteEdit] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { const r = localStorage.getItem('sk_rental_platforms'); if (r) setPlatformMap(JSON.parse(r)); } catch { /* noop */ }
    try { const r = localStorage.getItem('sk_conversations'); if (r) setConvs(JSON.parse(r)); } catch { /* noop */ }
  }, []);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convs, selIdx]);

  function persist(updated: Record<number, ConvData>) {
    setConvs(updated);
    try { localStorage.setItem('sk_conversations', JSON.stringify(updated)); } catch { /* noop */ }
  }

  /* Sorted list by urgency */
  const sorted: EnrichedRental[] = [...rentals]
    .map((r, i) => ({ ...r, _i: i }))
    .sort((a, b) => sortScore(a.start_date, a.end_date) - sortScore(b.start_date, b.end_date));

  /* Selected data */
  const selRental: Rental | null = selIdx !== null ? (rentals[selIdx] ?? null) : null;
  const selLg: Logement | undefined = selRental
    ? logements.find(l => l.id === selRental.logement_id)
    : undefined;
  const platformKey = selRental
    ? `${selRental.logement_id}_${selRental.start_date}_${selRental.tenant_name}`
    : '';
  const platform = platformKey ? platformMap[platformKey] : undefined;
  const conv: ConvData = selIdx !== null
    ? (convs[selIdx] ?? { messages: [], internalNote: '', unread: 0 })
    : { messages: [], internalNote: '', unread: 0 };
  const templates = selRental ? buildTemplates(selLg, selRental.tenant_name) : [];

  /* -- Actions ----------------------------------------------------------- */

  function sendMsg(text: string) {
    if (!text.trim() || selIdx === null) return;
    const msg: ChatMessage = {
      id: Date.now(),
      text: text.trim(),
      sender: 'me',
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      platform,
    };
    const prev = convs[selIdx] ?? { messages: [], internalNote: '', unread: 0 };
    persist({ ...convs, [selIdx]: { ...prev, messages: [...prev.messages, msg] } });
    setInput('');
    setShowTemplates(false);
  }

  function selectConv(i: number) {
    setSelIdx(i);
    setShowTemplates(false);
    setNoteEdit(false);
    const c = convs[i];
    if (c?.unread) persist({ ...convs, [i]: { ...c, unread: 0 } });
  }

  async function handleAiSuggest() {
    if (selIdx === null || !selRental) return;
    const lastGuest = [...conv.messages].reverse().find(m => m.sender === 'guest');
    const question = lastGuest?.text ?? "Bonjour, j'ai une question sur le logement.";
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          tenantName: selRental.tenant_name,
          propertyName: selLg?.name,
          propertyDetails: {
            wifi_code: selLg?.wifi_code,
            key_location: selLg?.key_location,
            building_code: selLg?.building_code,
            check_in_type: selLg?.check_in_type,
            address: selLg?.address,
          },
        }),
      });
      const data = await res.json();
      if (data.reply) setInput(data.reply);
    } catch { /* noop */ }
    setAiLoading(false);
  }

  async function handleTranslate(msgId: number, text: string) {
    setTranslating(p => ({ ...p, [msgId]: true }));
    try {
      const res = await fetch('/api/ai-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, mode: 'translate' }),
      });
      const data = await res.json();
      if (data.reply && selIdx !== null) {
        const prev = convs[selIdx] ?? { messages: [], internalNote: '', unread: 0 };
        persist({
          ...convs,
          [selIdx]: {
            ...prev,
            messages: prev.messages.map(m => m.id === msgId ? { ...m, translated: data.reply } : m),
          },
        });
      }
    } catch { /* noop */ }
    setTranslating(p => ({ ...p, [msgId]: false }));
  }

  function saveNote() {
    if (selIdx === null) return;
    const prev = convs[selIdx] ?? { messages: [], internalNote: '', unread: 0 };
    persist({ ...convs, [selIdx]: { ...prev, internalNote: noteDraft } });
    setNoteEdit(false);
  }

  function simulateGuest() {
    if (selIdx === null) return;
    const text = DEMO_MSGS[Math.floor(Math.random() * DEMO_MSGS.length)];
    const msg: ChatMessage = {
      id: Date.now(),
      text,
      sender: 'guest',
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      platform,
    };
    const prev = convs[selIdx] ?? { messages: [], internalNote: '', unread: 0 };
    persist({ ...convs, [selIdx]: { ...prev, messages: [...prev.messages, msg] } });
  }

  /* -- Render ---------------------------------------------------------------- */

  return (
    <div>
      <div className="header">
        <h1>Messagerie Centralisee</h1>
        <p>Toutes vos conversations locataires en un seul endroit</p>
      </div>

      <div style={{
        display: 'flex',
        height: 'calc(100vh - 188px)',
        background: 'white',
        borderRadius: 14,
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>

        {/* LEFT: Conversation list */}
        <div style={{
          width: 280,
          flexShrink: 0,
          borderRight: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#fff',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>Conversations</span>
              <span style={{ fontSize: 11, color: '#6b7280', background: '#f3f4f6', borderRadius: 6, padding: '2px 8px' }}>
                {sorted.length} contact{sorted.length !== 1 ? 's' : ''}
              </span>
            </div>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>Triees par urgence</p>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {sorted.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>
                <i className="fas fa-inbox" style={{ fontSize: 28, marginBottom: 8, display: 'block' }}></i>
                <p style={{ fontSize: 13, fontWeight: 600 }}>Aucun locataire</p>
                <p style={{ fontSize: 11, marginTop: 4 }}>Ajoutez des reservations dans Logements</p>
              </div>
            ) : (
              sorted.map(r => {
                const lg = logements.find(l => l.id === r.logement_id);
                const pk = `${r.logement_id}_${r.start_date}_${r.tenant_name}`;
                const pl = platformMap[pk];
                const badge = urgencyBadge(r.start_date, r.end_date);
                const c = convs[r._i];
                const lastMsg = c?.messages[c.messages.length - 1];
                const ac = avatarColor(r.tenant_name);
                const isSelected = selIdx === r._i;
                const isOngoing = statusFor(r.start_date, r.end_date).label === 'En sejour';

                return (
                  <div
                    key={r._i}
                    onClick={() => selectConv(r._i)}
                    style={{
                      padding: '11px 14px',
                      cursor: 'pointer',
                      background: isSelected ? '#f0f4ff' : 'white',
                      borderBottom: '1px solid #f5f5f5',
                      borderLeft: isSelected ? '3px solid #667eea' : '3px solid transparent',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = '#f9fafb'; }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'white'; }}
                  >
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: '50%',
                          background: ac, color: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 12,
                        }}>
                          {initials(r.tenant_name)}
                        </div>
                        {isOngoing && (
                          <span style={{ position: 'absolute', bottom: 1, right: 1, width: 9, height: 9, borderRadius: '50%', background: '#10b981', border: '2px solid white' }} />
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, fontSize: 13, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 4 }}>
                            {r.tenant_name}
                          </span>
                          {(c?.unread ?? 0) > 0 ? (
                            <span style={{ background: '#667eea', color: 'white', borderRadius: '50%', width: 17, height: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                              {c.unread}
                            </span>
                          ) : lastMsg ? (
                            <span style={{ fontSize: 10, color: '#9ca3af', flexShrink: 0 }}>{lastMsg.timestamp}</span>
                          ) : null}
                        </div>

                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {lg?.name ?? '-'}
                        </div>

                        {lastMsg && (
                          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {lastMsg.sender === 'me' ? 'Vous : ' : ''}{lastMsg.text}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
                          {badge && (
                            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 5, background: badge.color + '18', color: badge.color, fontWeight: 600 }}>
                              {badge.text}
                            </span>
                          )}
                          {pl && (
                            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 5, background: PLATFORM_COLOR[pl] ?? '#6b7280', color: 'white', fontWeight: 600 }}>
                              {pl}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CENTER: Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f5f7fa' }}>
          {selIdx !== null && selRental ? (
            <>
              {/* Chat header */}
              <div style={{
                padding: '10px 16px',
                background: 'white',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: 54,
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 35, height: 35, borderRadius: '50%',
                    background: avatarColor(selRental.tenant_name), color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 12,
                  }}>
                    {initials(selRental.tenant_name)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>{selRental.tenant_name}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', display: 'flex', gap: 6, alignItems: 'center' }}>
                      {selRental.email ?? "Pas d'email"}
                      {platform && (
                        <span style={{ padding: '1px 7px', borderRadius: 10, background: PLATFORM_COLOR[platform] ?? '#6b7280', color: 'white', fontSize: 10, fontWeight: 700 }}>
                          {platform}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={simulateGuest}
                    title="Simuler un message voyageur (demo)"
                    style={{ padding: '6px 10px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', fontSize: 11, color: '#6b7280', fontWeight: 600 }}
                  >
                    <i className="fas fa-comment-dots" style={{ marginRight: 4 }}></i>Simuler
                  </button>
                  <button
                    onClick={handleAiSuggest}
                    disabled={aiLoading}
                    style={{ padding: '6px 12px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', border: 'none', borderRadius: 8, cursor: aiLoading ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <i className={`fas ${aiLoading ? 'fa-spinner fa-spin' : 'fa-magic'}`}></i>
                    {aiLoading ? 'IA...' : 'IA Suggere'}
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {conv.messages.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', gap: 10, paddingTop: 60 }}>
                    <i className="fas fa-comments" style={{ fontSize: 40, color: '#e5e7eb' }}></i>
                    <p style={{ fontWeight: 600, fontSize: 14, color: '#374151' }}>Aucun message</p>
                    <p style={{ fontSize: 12 }}>Envoyez un message ou utilisez un modele rapide</p>
                  </div>
                ) : (
                  conv.messages.map(msg => (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: msg.sender === 'me' ? 'flex-end' : 'flex-start',
                        maxWidth: '72%',
                        alignSelf: msg.sender === 'me' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      {msg.sender === 'guest' && msg.platform && (
                        <span style={{ fontSize: 9, color: PLATFORM_COLOR[msg.platform] ?? '#6b7280', fontWeight: 700, marginBottom: 2, marginLeft: 4 }}>
                          <i className="fas fa-plug" style={{ marginRight: 3 }}></i>{msg.platform}
                        </span>
                      )}

                      <div style={{
                        padding: '9px 13px',
                        borderRadius: msg.sender === 'me' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: msg.sender === 'me' ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'white',
                        color: msg.sender === 'me' ? 'white' : '#1f2937',
                        fontSize: 13,
                        lineHeight: 1.55,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                        whiteSpace: 'pre-wrap',
                        border: msg.sender === 'guest' ? '1px solid #e5e7eb' : 'none',
                        wordBreak: 'break-word',
                      }}>
                        {msg.text}
                      </div>

                      {msg.translated && (
                        <div style={{
                          marginTop: 4, padding: '6px 10px',
                          background: '#fefce8', border: '1px solid #fde68a',
                          borderRadius: 8, fontSize: 11, color: '#92400e',
                          lineHeight: 1.45, maxWidth: '100%',
                        }}>
                          <i className="fas fa-language" style={{ marginRight: 5 }}></i>
                          {msg.translated}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3 }}>
                        <span style={{ fontSize: 10, color: '#9ca3af' }}>{msg.timestamp}</span>
                        {msg.sender === 'guest' && !msg.translated && (
                          <button
                            onClick={() => handleTranslate(msg.id, msg.text)}
                            style={{ fontSize: 10, color: looksNonFrench(msg.text) ? '#667eea' : '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: looksNonFrench(msg.text) ? 700 : 400 }}
                          >
                            {translating[msg.id] ? '...' : 'Traduire'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEnd} />
              </div>

              {/* Quick reply templates bar */}
              {showTemplates && (
                <div style={{ padding: '10px 14px', background: '#fafafa', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
                  {templates.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(t.text); setShowTemplates(false); }}
                      style={{ padding: '5px 10px', border: '1px solid #e5e7eb', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 11, color: '#374151', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500 }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f0f4ff')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                    >
                      <i className={`fas ${t.icon}`} style={{ color: '#667eea', fontSize: 10 }}></i>
                      {t.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Input area */}
              <div style={{ padding: '10px 14px', background: 'white', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
                <button
                  onClick={() => setShowTemplates(p => !p)}
                  title="Reponses rapides"
                  style={{ padding: '8px 11px', background: showTemplates ? '#667eea' : '#f3f4f6', border: 'none', borderRadius: 10, cursor: 'pointer', color: showTemplates ? 'white' : '#6b7280', flexShrink: 0, fontSize: 14, transition: 'all 0.15s' }}
                >
                  <i className="fas fa-bolt"></i>
                </button>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(input); } }}
                  placeholder="Tapez un message... (Entree pour envoyer)"
                  rows={Math.min(Math.max(input.split('\n').length, 1), 5)}
                  style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 10, padding: '9px 12px', fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5 }}
                />
                <button
                  onClick={() => sendMsg(input)}
                  disabled={!input.trim()}
                  style={{ padding: '9px 15px', background: input.trim() ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#e5e7eb', border: 'none', borderRadius: 10, cursor: input.trim() ? 'pointer' : 'default', color: input.trim() ? 'white' : '#9ca3af', flexShrink: 0, fontSize: 15, transition: 'background 0.15s' }}
                >
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', gap: 10 }}>
              <i className="fas fa-comments" style={{ fontSize: 52, color: '#e5e7eb' }}></i>
              <p style={{ fontWeight: 600, fontSize: 15, color: '#374151' }}>Selectionnez une conversation</p>
              <p style={{ fontSize: 13 }}>Choisissez un locataire dans la liste a gauche</p>
            </div>
          )}
        </div>

        {/* RIGHT: Reservation context panel */}
        {selIdx !== null && selRental && (
          <div style={{
            width: 300,
            flexShrink: 0,
            borderLeft: '1px solid #e5e7eb',
            overflowY: 'auto',
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Status */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                Reservation
              </div>
              {(() => {
                const s = statusFor(selRental.start_date, selRental.end_date);
                const labels: Record<string, string> = { 'En sejour': 'En sejour', 'A venir': 'A venir', 'Termine': 'Termine' };
                return (
                  <span style={{ padding: '4px 12px', borderRadius: 20, background: s.bg, color: s.color, fontSize: 12, fontWeight: 700 }}>
                    {labels[s.label] ?? s.label}
                  </span>
                );
              })()}
            </div>

            {/* Dates */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                Dates de sejour
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <i className="fas fa-sign-in-alt" style={{ color: '#10b981', width: 14 }}></i> Arrivee
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{fmtDate(selRental.start_date)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <i className="fas fa-sign-out-alt" style={{ color: '#ef4444', width: 14 }}></i> Depart
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{fmtDate(selRental.end_date)}</span>
                </div>
                {(() => {
                  const nights = Math.round(
                    (new Date(selRental.end_date).getTime() - new Date(selRental.start_date).getTime()) / 86_400_000
                  );
                  return (
                    <div style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', paddingTop: 6, borderTop: '1px dashed #f0f0f0' }}>
                      {nights} nuit{nights !== 1 ? 's' : ''}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Logement info */}
            {selLg && (
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                  Logement
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#111', marginBottom: 3 }}>{selLg.name}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>{selLg.address}</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selLg.wifi_code && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7 }}>
                      <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <i className="fas fa-wifi" style={{ color: '#10b981' }}></i> WiFi
                      </span>
                      <span style={{ fontWeight: 700, color: '#065f46', fontFamily: 'monospace', fontSize: 12 }}>{selLg.wifi_code}</span>
                    </div>
                  )}
                  {selLg.building_code && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 7 }}>
                      <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <i className="fas fa-hashtag" style={{ color: '#d97706' }}></i> Code immeuble
                      </span>
                      <span style={{ fontWeight: 700, color: '#92400e', fontFamily: 'monospace', fontSize: 12 }}>{selLg.building_code}</span>
                    </div>
                  )}
                  {selLg.key_location && (
                    <div style={{ padding: '5px 8px', background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: 7 }}>
                      <div style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                        <i className="fas fa-key" style={{ color: '#667eea' }}></i> Cles / Acces
                      </div>
                      <div style={{ fontWeight: 600, color: '#1e40af', fontSize: 11, lineHeight: 1.4 }}>{selLg.key_location}</div>
                    </div>
                  )}
                  {selLg.check_in_type && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 7 }}>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>Type acces</span>
                      <span style={{ fontWeight: 600, color: '#374151', fontSize: 11, textTransform: 'capitalize' }}>{selLg.check_in_type}</span>
                    </div>
                  )}
                </div>

                <a
                  href={`/properties/${selLg.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, marginTop: 10,
                    padding: '7px 10px',
                    background: 'linear-gradient(135deg, #667eea18, #764ba218)',
                    border: '1px solid #667eea40',
                    borderRadius: 9, fontSize: 12, fontWeight: 600, color: '#667eea', textDecoration: 'none',
                  }}
                >
                  <i className="fas fa-book-open"></i> Guide acces complet
                  <i className="fas fa-external-link-alt" style={{ fontSize: 9, marginLeft: 'auto' }}></i>
                </a>
              </div>
            )}

            {/* Internal note */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  <i className="fas fa-sticky-note" style={{ marginRight: 4, color: '#f59e0b' }}></i>Note interne
                </div>
                <button
                  onClick={() => { setNoteEdit(p => !p); setNoteDraft(conv.internalNote); }}
                  style={{ fontSize: 10, color: '#667eea', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                  {noteEdit ? 'Annuler' : 'Modifier'}
                </button>
              </div>
              {noteEdit ? (
                <>
                  <textarea
                    value={noteDraft}
                    onChange={e => setNoteDraft(e.target.value)}
                    placeholder="Ex : Voyageur exigeant, arrivee tardive prevue..."
                    rows={4}
                    style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 9px', fontSize: 12, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                  <button
                    onClick={saveNote}
                    style={{ marginTop: 6, width: '100%', padding: '6px', background: '#667eea', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                  >
                    Enregistrer
                  </button>
                </>
              ) : (
                <div style={{
                  fontSize: 12, color: conv.internalNote ? '#374151' : '#9ca3af',
                  lineHeight: 1.5, padding: '7px 9px',
                  background: conv.internalNote ? '#fefce8' : '#f9fafb',
                  borderRadius: 8,
                  border: `1px solid ${conv.internalNote ? '#fde68a' : '#f0f0f0'}`,
                  minHeight: 42,
                }}>
                  {conv.internalNote || 'Aucune note. Cliquez sur Modifier.'}
                </div>
              )}
            </div>

            {/* Contact */}
            {(selRental.email || selRental.phone) && (
              <div style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                  Contact
                </div>
                {selRental.email && (
                  <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                    <i className="fas fa-envelope" style={{ color: '#9ca3af', width: 14 }}></i>
                    <a href={`mailto:${selRental.email}`} style={{ color: '#667eea', textDecoration: 'none' }}>{selRental.email}</a>
                  </div>
                )}
                {selRental.phone && (
                  <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fas fa-phone" style={{ color: '#9ca3af', width: 14 }}></i>
                    <a href={`tel:${selRental.phone}`} style={{ color: '#667eea', textDecoration: 'none' }}>{selRental.phone}</a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
