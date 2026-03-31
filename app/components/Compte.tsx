'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

// ── Types ───────────────────────────────────────────────────────────────────

type Plan = 'starter' | 'pro' | 'enterprise';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  plan: Plan;
  properties_limit: number;
  joined_at: string;
}

interface AuthError {
  message: string;
}

// ── Plan config ─────────────────────────────────────────────────────────────

const PLANS: Record<Plan, { label: string; price: string; limit: number; color: string; features: string[] }> = {
  starter: {
    label: 'Starter',
    price: 'Gratuit',
    limit: 2,
    color: '#6b7280',
    features: [
      '2 logements maximum',
      'Synchronisation iCal',
      'Messagerie de base',
      'Calendrier',
      'Analyses simples',
    ],
  },
  pro: {
    label: 'Pro',
    price: '29€ / mois',
    limit: 15,
    color: '#2c5aa0',
    features: [
      '15 logements',
      'Toutes les intégrations iCal',
      '✨ IA Messagerie (suggestions)',
      'Alertes intelligentes',
      'RevPAR & analyses avancées',
      'Heatmap & graphiques enrichis',
    ],
  },
  enterprise: {
    label: 'Enterprise',
    price: '89€ / mois',
    limit: 999,
    color: '#7c3aed',
    features: [
      'Logements illimités',
      'Tout le plan Pro',
      'API dédiée',
      'Support prioritaire 7j/7',
      'Tableau de bord multi-comptes',
      'Personnalisation marque blanche',
    ],
  },
};

// ── Component ───────────────────────────────────────────────────────────────

export default function Compte() {
  const [view, setView] = useState<'login' | 'register' | 'profile' | 'subscriptions'>('login');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [editName, setEditName] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Load session on mount
  useEffect(() => {
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id, session.user.email ?? '');
      } else {
        setUser(null);
        setView('login');
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadProfile(session.user.id, session.user.email ?? '');
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  const loadProfile = async (uid: string, mail: string) => {
    try {
      // Try to load from user_profiles table; fall back to metadata
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', uid)
        .single();

      const plan: Plan = (data?.plan as Plan) ?? 'starter';

      setUser({
        id: uid,
        email: mail,
        full_name: data?.full_name ?? mail.split('@')[0],
        plan,
        properties_limit: PLANS[plan].limit,
        joined_at: data?.created_at ?? new Date().toISOString(),
      });
      setView('profile');
    } catch {
      // Table might not exist yet — use minimal profile
      setUser({
        id: uid,
        email: mail,
        full_name: mail.split('@')[0],
        plan: 'starter',
        properties_limit: PLANS.starter.limit,
        joined_at: new Date().toISOString(),
      });
      setView('profile');
    } finally {
      setLoading(false);
    }
  };

  // ── Auth handlers ─────────────────────────────────────────────────────────

  const handleLogin = async () => {
    if (!email || !password) return setError('Remplissez tous les champs');
    setSubmitting(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) setError(translateError(err));
    setSubmitting(false);
  };

  const handleRegister = async () => {
    if (!email || !password || !fullName) return setError('Remplissez tous les champs');
    if (password.length < 8) return setError('Le mot de passe doit contenir au moins 8 caractères');
    setSubmitting(true);
    setError('');
    const { error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName } },
    });
    if (err) setError(translateError(err));
    else setSuccess('Vérifiez votre email pour confirmer votre compte.');
    setSubmitting(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setView('login');
    setEmail('');
    setPassword('');
    setSuccess('');
    setError('');
  };

  const handleSaveName = async () => {
    if (!user || !editName.trim()) return;
    setSubmitting(true);
    try {
      await supabase.from('user_profiles').upsert({ id: user.id, full_name: editName.trim() });
      setUser({ ...user, full_name: editName.trim() });
      setEditName('');
      setSuccess('Nom mis à jour.');
    } catch {
      setError('Impossible de mettre à jour le nom.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) return setError('Les mots de passe ne correspondent pas');
    if (newPassword.length < 8) return setError('Minimum 8 caractères');
    setSubmitting(true);
    setError('');
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    if (err) setError(translateError(err));
    else { setSuccess('Mot de passe modifié.'); setChangingPassword(false); setNewPassword(''); setConfirmPassword(''); }
    setSubmitting(false);
  };

  const handleForgotPassword = async () => {
    if (!email) return setError('Entrez votre email d\'abord');
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (err) setError(translateError(err));
    else setSuccess('Email de réinitialisation envoyé.');
  };

  const handleUpgrade = async (plan: Plan) => {
    if (!user) return;
    setSubmitting(true);
    setError('');
    try {
      await supabase.from('user_profiles').upsert({
        id: user.id,
        email: user.email,
        plan,
        full_name: user.full_name,
      });
      const updated = { ...user, plan, properties_limit: PLANS[plan].limit };
      setUser(updated);
      setSuccess(`Plan "${PLANS[plan].label}" activé avec succès !`);
      setView('profile');
    } catch {
      setError('Erreur lors du changement de plan.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render loading ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#2c5aa0' }}></i>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <h1>
          <i className="fas fa-user-circle" style={{ color: '#2c5aa0', marginRight: '10px' }}></i>
          {user ? 'Mon Compte' : 'Connexion'}
        </h1>
        <p>{user ? `Connecté en tant que ${user.email}` : 'Gérez votre accès et votre abonnement'}</p>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#dc2626', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fas fa-times-circle"></i>{error}
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}><i className="fas fa-times"></i></button>
        </div>
      )}
      {success && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#16a34a', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fas fa-check-circle"></i>{success}
          <button onClick={() => setSuccess('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a' }}><i className="fas fa-times"></i></button>
        </div>
      )}

      {/* ── LOGIN ── */}
      {view === 'login' && (
        <div style={{ maxWidth: '420px', margin: '0 auto' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '36px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #2c5aa0, #667eea)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px', color: 'white' }}>
                <i className="fas fa-rocket"></i>
              </div>
              <h2 style={{ margin: 0, fontSize: '22px', color: '#1f2937' }}>Side Kick</h2>
              <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: '14px' }}>Connectez-vous à votre espace</p>
            </div>

            <FormField label="Email" icon="fa-envelope">
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="vous@example.com" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </FormField>

            <FormField label="Mot de passe" icon="fa-lock" action={
              <button onClick={() => setShowPassword(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '14px' }}>
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            }>
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </FormField>

            <div style={{ textAlign: 'right', marginBottom: '20px' }}>
              <button onClick={handleForgotPassword} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2c5aa0', fontSize: '13px' }}>
                Mot de passe oublié ?
              </button>
            </div>

            <button onClick={handleLogin} disabled={submitting} style={primaryBtn}>
              {submitting ? <><i className="fas fa-spinner fa-spin"></i> Connexion...</> : <><i className="fas fa-sign-in-alt"></i> Se connecter</>}
            </button>

            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#6b7280' }}>
              Pas encore de compte ?{' '}
              <button onClick={() => { setView('register'); setError(''); setSuccess(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2c5aa0', fontWeight: 600 }}>
                Créer un compte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REGISTER ── */}
      {view === 'register' && (
        <div style={{ maxWidth: '420px', margin: '0 auto' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '36px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: '20px', color: '#1f2937' }}>
              <i className="fas fa-user-plus" style={{ color: '#2c5aa0', marginRight: '8px' }}></i>
              Créer un compte
            </h2>

            <FormField label="Nom complet" icon="fa-user">
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jean Dupont" />
            </FormField>
            <FormField label="Email" icon="fa-envelope">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@example.com" />
            </FormField>
            <FormField label="Mot de passe" icon="fa-lock">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 8 caractères" />
            </FormField>

            <button onClick={handleRegister} disabled={submitting} style={primaryBtn}>
              {submitting ? <><i className="fas fa-spinner fa-spin"></i> Création...</> : <><i className="fas fa-rocket"></i> Créer mon compte</>}
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: '#6b7280' }}>
              Déjà un compte ?{' '}
              <button onClick={() => { setView('login'); setError(''); setSuccess(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2c5aa0', fontWeight: 600 }}>
                Se connecter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PROFILE ── */}
      {view === 'profile' && user && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

          {/* Left: identity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: `linear-gradient(135deg, ${PLANS[user.plan].color}, #667eea)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', color: 'white', flexShrink: 0 }}>
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', color: '#1f2937' }}>{user.full_name}</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>{user.email}</p>
                  <span style={{ display: 'inline-block', marginTop: '6px', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: PLANS[user.plan].color, color: 'white' }}>
                    {PLANS[user.plan].label}
                  </span>
                </div>
              </div>

              <InfoRow icon="fa-calendar-alt" label="Membre depuis" value={new Date(user.joined_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} />
              <InfoRow icon="fa-building" label="Logements inclus" value={`${user.properties_limit === 999 ? 'Illimités' : user.properties_limit} logements`} />
              <InfoRow icon="fa-star" label="Plan actuel" value={`${PLANS[user.plan].label} — ${PLANS[user.plan].price}`} />
            </div>

            {/* Edit name */}
            <div style={card}>
              <h3 style={sectionTitle}><i className="fas fa-edit" style={{ marginRight: '8px' }}></i>Modifier le profil</h3>
              <label style={labelStyle}>Nom complet</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={editName || user.full_name}
                  onChange={e => setEditName(e.target.value)}
                  style={inputStyle}
                />
                <button onClick={handleSaveName} disabled={submitting || !editName.trim() || editName === user.full_name}
                  style={{ padding: '10px 16px', background: '#2c5aa0', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', flexShrink: 0, opacity: (!editName.trim() || editName === user.full_name) ? 0.5 : 1 }}>
                  <i className="fas fa-save"></i>
                </button>
              </div>
            </div>

            {/* Password */}
            <div style={card}>
              <h3 style={sectionTitle}><i className="fas fa-lock" style={{ marginRight: '8px' }}></i>Sécurité</h3>
              {!changingPassword ? (
                <button onClick={() => setChangingPassword(true)} style={secondaryBtn}>
                  <i className="fas fa-key"></i> Changer le mot de passe
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input type="password" placeholder="Nouveau mot de passe" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inputStyle} />
                  <input type="password" placeholder="Confirmer le mot de passe" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={inputStyle} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleChangePassword} disabled={submitting} style={{ ...primaryBtn, flex: 1 }}>
                      {submitting ? 'Mise à jour...' : 'Confirmer'}
                    </button>
                    <button onClick={() => setChangingPassword(false)} style={{ ...secondaryBtn, flex: 1 }}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Logout */}
            <button onClick={handleLogout} style={{ padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', cursor: 'pointer', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <i className="fas fa-sign-out-alt"></i> Déconnexion
            </button>
          </div>

          {/* Right: plan overview */}
          <div style={card}>
            <h3 style={sectionTitle}><i className="fas fa-star" style={{ marginRight: '8px' }}></i>Mon abonnement</h3>
            <div style={{ background: `linear-gradient(135deg, ${PLANS[user.plan].color}15, ${PLANS[user.plan].color}08)`, border: `1px solid ${PLANS[user.plan].color}40`, borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: PLANS[user.plan].color }}>{PLANS[user.plan].label}</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937' }}>{PLANS[user.plan].price}</div>
                </div>
                <span style={{ background: PLANS[user.plan].color, color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>Actif</span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {PLANS[user.plan].features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151' }}>
                    <i className="fas fa-check" style={{ color: PLANS[user.plan].color, flexShrink: 0 }}></i>{f}
                  </li>
                ))}
              </ul>
            </div>
            <button onClick={() => setView('subscriptions')} style={primaryBtn}>
              <i className="fas fa-arrow-up"></i> Voir tous les plans
            </button>
          </div>
        </div>
      )}

      {/* ── SUBSCRIPTIONS ── */}
      {view === 'subscriptions' && user && (
        <div>
          <button onClick={() => setView('profile')} style={{ ...secondaryBtn, marginBottom: '24px', display: 'inline-flex' }}>
            <i className="fas fa-arrow-left"></i> Retour au profil
          </button>
          <h2 style={{ margin: '0 0 8px', fontSize: '22px', color: '#1f2937' }}>Choisissez votre plan</h2>
          <p style={{ margin: '0 0 28px', color: '#6b7280', fontSize: '14px' }}>Passez à un plan supérieur à tout moment. La facturation est mensuelle.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {(Object.entries(PLANS) as [Plan, typeof PLANS[Plan]][]).map(([planId, plan]) => {
              const isCurrent = user.plan === planId;
              const isPopular = planId === 'pro';
              return (
                <div key={planId} style={{
                  background: 'white',
                  borderRadius: '12px',
                  border: `2px solid ${isCurrent ? plan.color : isPopular ? plan.color + '60' : '#e5e7eb'}`,
                  padding: '28px',
                  boxShadow: isPopular ? `0 8px 32px ${plan.color}20` : '0 2px 8px rgba(0,0,0,0.06)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  {isPopular && (
                    <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: plan.color, color: 'white', padding: '4px 16px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      ⭐ POPULAIRE
                    </div>
                  )}
                  {isCurrent && (
                    <div style={{ position: 'absolute', top: '-12px', right: '20px', background: '#2e7d32', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>
                      ✓ ACTUEL
                    </div>
                  )}

                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: plan.color, marginBottom: '4px' }}>{plan.label}</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#1f2937' }}>{plan.price}</div>
                  </div>

                  <ul style={{ margin: '0 0 24px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                    {plan.features.map(f => (
                      <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: '#374151' }}>
                        <i className="fas fa-check" style={{ color: plan.color, marginTop: '2px', flexShrink: 0 }}></i>{f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => !isCurrent && handleUpgrade(planId)}
                    disabled={isCurrent || submitting}
                    style={{
                      padding: '12px',
                      background: isCurrent ? '#f3f4f6' : plan.color,
                      color: isCurrent ? '#9ca3af' : 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: isCurrent ? 'default' : 'pointer',
                      fontWeight: 700,
                      fontSize: '14px',
                    }}
                  >
                    {isCurrent ? 'Plan actuel' : planId === 'starter' ? 'Rétrograder' : `Passer au ${plan.label}`}
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '24px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '16px', fontSize: '13px', color: '#92400e', display: 'flex', gap: '10px' }}>
            <i className="fas fa-info-circle" style={{ marginTop: '1px', flexShrink: 0 }}></i>
            <div>
              <strong>Note :</strong> La gestion des paiements est simulée localement pour cette démo. En production, intégrez Stripe avec un webhook Supabase pour gérer la facturation et les accès automatiquement.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components & style helpers ──────────────────────────────────────────

function FormField({ label, icon, children, action }: { label: string; icon: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <i className={`fas ${icon}`} style={{ position: 'absolute', left: '12px', color: '#9ca3af', fontSize: '14px', zIndex: 1 }}></i>
        <div style={{ flex: 1 }}>
          {children}
        </div>
        {action && <div style={{ position: 'absolute', right: '12px' }}>{action}</div>}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6b7280' }}>
        <i className={`fas ${icon}`} style={{ color: '#9ca3af', width: '14px', textAlign: 'center' }}></i>{label}
      </span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937' }}>{value}</span>
    </div>
  );
}

function translateError(err: AuthError): string {
  const m = err.message || '';
  if (m.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect';
  if (m.includes('Email not confirmed')) return 'Confirmez votre email avant de vous connecter';
  if (m.includes('User already registered')) return 'Un compte existe déjà avec cet email';
  if (m.includes('Password should be')) return 'Le mot de passe doit contenir au moins 8 caractères';
  if (m.includes('rate limit')) return 'Trop de tentatives, réessayez dans quelques minutes';
  return m;
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

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '13px',
  fontWeight: 600,
  color: '#374151',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px 10px 36px',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};

const primaryBtn: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  background: 'linear-gradient(135deg, #2c5aa0, #667eea)',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: '14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
};

const secondaryBtn: React.CSSProperties = {
  padding: '10px 16px',
  background: '#f3f4f6',
  color: '#374151',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '13px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};
