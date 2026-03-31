'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';

type Tab = 'login' | 'register';

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect';
  if (msg.includes('Email not confirmed')) return 'Confirmez votre email avant de vous connecter';
  if (msg.includes('User already registered')) return 'Un compte existe déjà avec cet email';
  if (msg.includes('Password should be')) return 'Le mot de passe doit contenir au moins 8 caractères';
  if (msg.includes('rate limit')) return 'Trop de tentatives, réessayez dans quelques minutes';
  return msg;
}

export default function AuthPage() {
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const clear = () => { setError(''); setInfo(''); };

  const handleLogin = async () => {
    if (!email || !password) return setError('Remplissez tous les champs');
    setLoading(true); clear();
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) setError(translateError(err.message));
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!fullName || !email || !password) return setError('Remplissez tous les champs');
    if (password.length < 8) return setError('Le mot de passe doit contenir au moins 8 caractères');
    setLoading(true); clear();
    const { error: err } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { full_name: fullName } },
    });
    if (err) setError(translateError(err.message));
    else setInfo('Vérifiez votre email pour activer votre compte, puis connectez-vous ici.');
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) return setError("Entrez votre email d'abord");
    clear();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (err) setError(translateError(err.message));
    else setInfo('Email de réinitialisation envoyé ! Vérifiez votre boîte mail.');
  };

  const switchTab = (t: Tab) => { setTab(t); clear(); };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'inherit', background: '#f9fafb' }}>

      {/* ── Left branding panel ── */}
      <div style={{
        width: '45%', minHeight: '100vh', flexShrink: 0,
        background: 'linear-gradient(155deg, #1a336b 0%, #2c5aa0 55%, #667eea 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center', padding: '48px',
        color: 'white', position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '350px', height: '350px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-140px', left: '-80px', width: '450px', height: '450px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '40%', left: '-60px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', textAlign: 'center', maxWidth: '380px' }}>
          {/* Logo */}
          <div style={{
            width: '72px', height: '72px', borderRadius: '20px',
            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px', margin: '0 auto 24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            🚀
          </div>

          <h1 style={{ fontSize: '38px', fontWeight: 800, margin: '0 0 10px', letterSpacing: '-1.5px' }}>
            Side Kick
          </h1>
          <p style={{ fontSize: '15px', opacity: 0.8, lineHeight: 1.7, margin: '0 0 44px' }}>
            Gérez vos locations courte et longue durée en un seul endroit. IA intégrée, analyses en temps réel.
          </p>

          {/* Feature list */}
          {[
            { icon: 'fa-calendar-check', text: 'Synchronisation iCal Airbnb & Booking' },
            { icon: 'fa-robot',          text: 'Messagerie avec suggestions IA' },
            { icon: 'fa-chart-line',     text: 'Analyses RevPAR et alertes intelligentes' },
            { icon: 'fa-star',           text: 'Centralisation des avis voyageurs' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px', textAlign: 'left' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className={`fas ${icon}`} style={{ fontSize: '14px' }}></i>
              </div>
              <span style={{ fontSize: '14px', opacity: 0.9, lineHeight: 1.4 }}>{text}</span>
            </div>
          ))}

          {/* Testimonial */}
          <div style={{
            marginTop: '40px', padding: '20px 24px',
            background: 'rgba(255,255,255,0.1)', borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.15)', textAlign: 'left',
          }}>
            <p style={{ margin: '0 0 12px', fontSize: '13px', lineHeight: 1.6, opacity: 0.9, fontStyle: 'italic' }}>
              "Side Kick a transformé ma gestion locative. Je gagne 3h par semaine et mes revenus ont augmenté de 18%."
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700 }}>M</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>Marie D.</div>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>6 logements Airbnb · Paris</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>

          <h2 style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: 800, color: '#1f2937', letterSpacing: '-0.5px' }}>
            {tab === 'login' ? 'Bon retour 👋' : 'Créer un compte'}
          </h2>
          <p style={{ margin: '0 0 32px', fontSize: '14px', color: '#6b7280', lineHeight: 1.5 }}>
            {tab === 'login'
              ? 'Connectez-vous à votre espace Side Kick'
              : 'Rejoignez Side Kick et commencez gratuitement'}
          </p>

          {/* Tab switcher */}
          <div style={{ display: 'flex', background: '#e5e7eb', borderRadius: '10px', padding: '4px', marginBottom: '28px', gap: '4px' }}>
            {(['login', 'register'] as Tab[]).map(t => (
              <button key={t} onClick={() => switchTab(t)} style={{
                flex: 1, padding: '10px', border: 'none', borderRadius: '7px', cursor: 'pointer',
                fontWeight: 700, fontSize: '14px', transition: 'all 0.2s',
                background: tab === t ? 'white' : 'transparent',
                color: tab === t ? '#1f2937' : '#6b7280',
                boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
              }}>
                {t === 'login' ? 'Connexion' : 'Inscription'}
              </button>
            ))}
          </div>

          {/* Alerts */}
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#dc2626', fontSize: '13px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <i className="fas fa-exclamation-circle" style={{ marginTop: '1px', flexShrink: 0 }}></i>
              <span>{error}</span>
              <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', flexShrink: 0 }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}
          {info && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#16a34a', fontSize: '13px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <i className="fas fa-check-circle" style={{ marginTop: '1px', flexShrink: 0 }}></i>
              <span>{info}</span>
            </div>
          )}

          {/* Form fields */}
          {tab === 'register' && (
            <Field label="Nom complet">
              <FInput
                type="text" icon="fa-user" value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Jean Dupont"
                onKeyDown={e => e.key === 'Enter' && handleRegister()}
              />
            </Field>
          )}

          <Field label="Email">
            <FInput
              type="email" icon="fa-envelope" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vous@example.com"
              onKeyDown={e => e.key === 'Enter' && (tab === 'login' ? handleLogin() : handleRegister())}
            />
          </Field>

          <Field label="Mot de passe" style={{ marginBottom: tab === 'login' ? '8px' : '28px' }}>
            <div style={{ position: 'relative' }}>
              <FInput
                type={showPassword ? 'text' : 'password'} icon="fa-lock" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={tab === 'register' ? 'Minimum 8 caractères' : '••••••••'}
                onKeyDown={e => e.key === 'Enter' && (tab === 'login' ? handleLogin() : handleRegister())}
                paddingRight="44px"
              />
              <button onClick={() => setShowPassword(v => !v)} style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '14px',
              }}>
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </Field>

          {tab === 'login' && (
            <div style={{ textAlign: 'right', marginBottom: '28px' }}>
              <button onClick={handleForgotPassword} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2c5aa0', fontSize: '13px', fontWeight: 600 }}>
                Mot de passe oublié ?
              </button>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={tab === 'login' ? handleLogin : handleRegister}
            disabled={loading}
            style={{
              width: '100%', padding: '14px',
              background: loading ? '#9ca3af' : 'linear-gradient(135deg, #2c5aa0, #667eea)',
              color: 'white', border: 'none', borderRadius: '10px',
              cursor: loading ? 'default' : 'pointer', fontWeight: 700, fontSize: '15px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(44, 90, 160, 0.35)',
              transition: 'all 0.2s',
            }}
          >
            {loading
              ? <><i className="fas fa-spinner fa-spin"></i> Chargement...</>
              : tab === 'login'
                ? <><i className="fas fa-sign-in-alt"></i> Se connecter</>
                : <><i className="fas fa-rocket"></i> Créer mon compte</>
            }
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0', color: '#9ca3af', fontSize: '13px' }}>
            <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
            ou
            <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
          </div>

          <p style={{ textAlign: 'center', fontSize: '14px', color: '#6b7280', margin: 0 }}>
            {tab === 'login' ? 'Pas encore de compte ?' : 'Déjà un compte ?'}{' '}
            <button onClick={() => switchTab(tab === 'login' ? 'register' : 'login')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2c5aa0', fontWeight: 700, fontSize: '14px' }}>
              {tab === 'login' ? 'Créer un compte' : 'Se connecter'}
            </button>
          </p>

          <p style={{ textAlign: 'center', marginTop: '32px', fontSize: '12px', color: '#d1d5db' }}>
            En continuant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ marginBottom: '20px', ...style }}>
      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function FInput({ type, icon, value, onChange, placeholder, onKeyDown, paddingRight }: {
  type: string; icon: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  paddingRight?: string;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <i className={`fas ${icon}`} style={{
        position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
        color: '#9ca3af', fontSize: '14px', pointerEvents: 'none',
      }}></i>
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder} onKeyDown={onKeyDown}
        style={{
          width: '100%', padding: `12px 14px 12px 40px`,
          paddingRight: paddingRight ?? '14px',
          border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '14px',
          outline: 'none', boxSizing: 'border-box', background: 'white',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
        onFocus={e => { e.target.style.borderColor = '#2c5aa0'; e.target.style.boxShadow = '0 0 0 3px rgba(44,90,160,0.1)'; }}
        onBlur={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
      />
    </div>
  );
}
