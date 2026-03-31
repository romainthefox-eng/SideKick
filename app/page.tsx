'use client';

import { useState, useEffect } from 'react';
import './page.css';
import Logement from './components/Logement';
import Messagerie from './components/Messagerie';
import Calendrier from './components/Calendrier';
import Reservations from './components/Reservations';
import Demandes from './components/Demandes';
import Analyses from './components/Analyses';
import Integrations from './components/Integrations';
import Compte from './components/Compte';
import Avis from './components/Avis';
import NotificationCenter from './components/NotificationCenter';
import AuthPage from './components/AuthPage';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [activeSection, setActiveSection] = useState('accueil');
  const [authUser, setAuthUser] = useState<{ email: string; id: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user ? { email: session.user.email ?? '', id: session.user.id } : null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ? { email: session.user.email ?? '', id: session.user.id } : null);
      if (authLoading) setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sections = [
    { id: 'accueil',        label: 'Accueil',          icon: 'fas fa-home' },
    { id: 'logement',       label: 'Logement',          icon: 'fas fa-building' },
    { id: 'messagerie',     label: 'Messagerie',         icon: 'fas fa-comments' },
    { id: 'reservations',   label: 'Réservations',       icon: 'fas fa-calendar-check' },
    { id: 'calendrier',     label: 'Calendrier',         icon: 'fas fa-calendar' },
    { id: 'demande',        label: 'Demande',            icon: 'fas fa-question-circle' },
    { id: 'analyse',       label: 'Analyse',           icon: 'fas fa-chart-bar' },
    { id: 'integrations',  label: 'Intégrations',      icon: 'fas fa-plug' },
    { id: 'avis',          label: 'Avis',              icon: 'fas fa-star' },
  ];

  const cards = [
    { section: 'logement',     title: 'Logement',           description: 'Gérez vos biens et locations',                     icon: 'fas fa-building' },
    { section: 'messagerie',   title: 'Messagerie',          description: 'Communiquez avec vos locataires via l\'IA',         icon: 'fas fa-comments' },
    { section: 'reservations',  title: 'Réservations',         description: 'Calendrier des séjours par logement',               icon: 'fas fa-calendar-check' },
    { section: 'calendrier',   title: 'Calendrier',          description: 'Visualisez événements, tâches et incidents',         icon: 'fas fa-calendar' },
    { section: 'demande',      title: 'Discussions',          description: 'Posez vos questions et importez des documents',    icon: 'fas fa-comments' },
    { section: 'analyse',      title: 'Analyse',             description: 'Revenus, RevPAR, alertes intelligentes',           icon: 'fas fa-chart-bar' },
    { section: 'integrations', title: 'Intégrations',        description: 'Sync Airbnb, Booking.com et automatisation IA',    icon: 'fas fa-plug' },
    { section: 'avis',         title: 'Avis Voyageurs',       description: 'Centralisez et répondez aux avis plateformes',     icon: 'fas fa-star' },
    { section: 'compte',       title: 'Mon Compte',           description: 'Connexion, profil et abonnement',                  icon: 'fas fa-user-circle' },
  ];

  // ── Auth loading screen ───────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #2c5aa0, #667eea)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', boxShadow: '0 8px 24px rgba(44,90,160,0.3)' }}>🚀</div>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '22px', color: '#2c5aa0' }}></i>
        <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>Chargement…</p>
      </div>
    );
  }

  // ── Auth gate ─────────────────────────────────────────────────────────────
  if (!authUser) return <AuthPage />;

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2><i className="fas fa-rocket"></i> Side Kick</h2>
        </div>
        <nav>
          <ul>
            {sections.map(section => (
              <li key={section.id}>
                <button 
                  onClick={() => setActiveSection(section.id)}
                  className={section.id === activeSection ? 'active' : ''}
                >
                  <i className={section.icon}></i> {section.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── User footer ── */}
        <div
          onClick={() => setActiveSection('compte')}
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '14px 16px',
            borderTop: '1px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', gap: '10px',
            cursor: 'pointer', transition: 'background 0.2s',
            background: activeSection === 'compte' ? 'rgba(255,255,255,0.15)' : 'transparent',
          }}
          onMouseEnter={e => { if (activeSection !== 'compte') (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
          onMouseLeave={e => { if (activeSection !== 'compte') (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <div style={{
            width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.15))',
            border: '1px solid rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', fontWeight: 700, color: 'white',
          }}>
            {authUser.email.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {authUser.email}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', marginTop: '1px' }}>Mon compte</div>
          </div>
          <i className="fas fa-chevron-right" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}></i>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Accueil Section */}
        {activeSection === 'accueil' && (
          <section className="section active">
            <div className="header">
              <h1>Bienvenue sur Side Kick</h1>
              <p>Gérez vos locations et interactions avec les locataires en un seul endroit</p>
            </div>

            {/* Centre de Notifications */}
            <NotificationCenter />

            <div className="overview-grid">
              {cards.map(card => (
                <div 
                  key={card.section} 
                  className="card" 
                  onClick={() => setActiveSection(card.section)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="card-icon"><i className={card.icon}></i></div>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                  <span className="card-arrow">→</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Logement Section */}
        {activeSection === 'logement' && (
          <section className="section">
            <Logement />
          </section>
        )}

        {/* Messagerie Section */}
        {activeSection === 'messagerie' && (
          <section className="section">
            <Messagerie />
          </section>
        )}

        {/* Réservations Section */}
        {activeSection === 'reservations' && (
          <section className="section">
            <Reservations />
          </section>
        )}

        {/* Calendrier Section */}
        {activeSection === 'calendrier' && (
          <section className="section">
            <Calendrier />
          </section>
        )}

        {/* Demande Section */}
        {activeSection === 'demande' && (
          <section className="section">
            <Demandes />
          </section>
        )}

        {/* Analyse Section */}
        {activeSection === 'analyse' && (
          <section className="section">
            <Analyses />
          </section>
        )}

        {/* Intégrations Section */}
        {activeSection === 'integrations' && (
          <section className="section">
            <Integrations />
          </section>
        )}

        {/* Avis Section */}
        {activeSection === 'avis' && (
          <section className="section">
            <Avis />
          </section>
        )}

        {/* Compte Section */}
        {activeSection === 'compte' && (
          <section className="section">
            <Compte />
          </section>
        )}
      </main>
    </div>
  );
}