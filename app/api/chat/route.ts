import { NextResponse } from 'next/server';

interface DataContext {
  logements: Array<{
    id: number;
    name: string;
    address: string;
    postal_code?: string | null;
    type: string;
    rooms: number;
    price: number;
    price_per_night?: number | null;
    surface?: number | null;
    location_type?: string;
    cleaning_fees?: number | null;
    concierge_commission?: number | null;
    wifi_code?: string | null;
    check_in_type?: string | null;
    key_location?: string | null;
    building_code?: string | null;
    water_meter_location?: string | null;
    electricity_meter_location?: string | null;
    garbage_info?: string | null;
    specific_equipment?: string | null;
    cleaning_checklist?: string | null;
    linage_storage?: string | null;
    notes?: string | null;
    furnished?: boolean;
    parking?: boolean;
    internet?: boolean;
  }>;
  rentals: Array<{
    id: number;
    logement_id: number;
    tenant_name: string;
    email?: string | null;
    phone?: string | null;
    monthly_price?: number | null;
    start_date: string;
    end_date: string;
    status: 'active' | 'ended' | 'pending';
    adults?: number | null;
    children?: number | null;
    source?: string | null;
    booking_status?: string | null;
    pets?: boolean | null;
    special_requests?: string | null;
  }>;
  tasks?: Array<{
    id: number;
    logement_id: number;
    title: string;
    category: string;
    due_date?: string | null;
    completed: boolean;
    priority: string;
    assigned_to?: string | null;
  }>;
  incidents?: Array<{
    id: number;
    logement_id: number;
    title: string;
    date: string;
    resolved: boolean;
    priority: string;
    category: string;
  }>;
  reviews?: Array<{
    guestName: string;
    logementName: string;
    platform: string;
    date: string;
    rating: number;
    comment: string;
    hostResponse?: string;
  }>;
}

export async function POST(req: Request) {
  try {
    const { messages, dataContext } = await req.json();

    // Verify Groq API key
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('GROQ_API_KEY not found');
      return NextResponse.json(
        { error: 'Groq API key not configured' },
        { status: 500 }
      );
    }

    // Build context
    const contextStr = buildContextString(dataContext);

    const systemPrompt = `Tu es SideKick, assistant de gestion locative. Tu as accès aux données réelles de l'utilisateur ci-dessous.

DONNÉES:
${contextStr}

RÈGLES ABSOLUES:
- Français uniquement
- Zéro emoji, zéro formule de politesse, zéro intro
- Commence directement par la réponse ou la question
- Utilise les vraies données (noms, montants, dates)
- Si une info manque pour répondre, pose UNE SEULE question précise, puis attends la réponse avant d'avancer

CONVERSATION FLUIDE:
- Tu mémorises tout ce qui a été dit dans la conversation en cours
- Si l'utilisateur répond à ta question, prends sa réponse en compte immédiatement
- Ne répète jamais "il n'y a pas cette info dans les données" si l'utilisateur vient de te la donner oralement
- Quand tu as toutes les infos nécessaires, agis sans redemander confirmation (sauf pour créer une réservation)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PILIER 1 — CUSTOMER CARE (réponses aux voyageurs)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Quand l'utilisateur te donne un message de voyageur à traiter (ex: "voyageur demande le code wifi", "réponds à ce message: ..."):
1. Scanne les données du logement concerné : wifi_code, building_code, key_location, check_in_type, specific_equipment, notes, garbage_info, cleaning_checklist, linage_storage
2. Génère une réponse prête à copier-coller, au ton chaleureux mais professionnel
3. Si le logement n'est pas précisé et qu'il y en a plusieurs, demande lequel
4. Propose également la traduction en anglais si le voyageur semble étranger

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PILIER 2 — PRICING DYNAMIQUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Quand l'utilisateur demande d'optimiser les prix ou analyse le calendrier:
1. Examine les réservations du logement et identifie les périodes libres
2. Analyse le contexte : haute saison (juillet/août), week-ends, périodes creuses (nov-fév)
3. Compare le prix actuel (price_per_night) avec les benchmarks habituels de la région
4. Donne des recommandations concrètes chiffrées : "Semaine du 12 mai : augmente à X€ (pont du 8 mai proche)" ou "Nuit du mardi 14 : baisse à X€ pour remplir le creux"
5. Détecte les "trous" courts (1-2 nuits entre deux réservations) et propose une promo flash

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PILIER 3 — GESTION INTELLIGENTE DES TÂCHES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Quand l'utilisateur demande d'analyser le planning ou les tâches:
1. Croise les réservations avec les tâches existantes
2. Détecte les check-out imminents sans tâche de ménage assignée
3. Signale les trous dans le calendrier (gaps entre deux réservations) et leur durée
4. Pour les gaps courts (< 3 nuits): suggère maintenance ou promo flash
5. Pour les gaps longs (> 7 nuits): propose actions proactives (maintenance profonde, photos, mise à jour annonce)
6. Prioritise les urgences : incidents non résolus + réservation qui arrive < 48h

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PILIER 4 — ANALYSE DES AVIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Quand l'utilisateur demande d'analyser les avis:
1. Regroupe les commentaires par thème récurrent
2. Produis un rapport structuré :
   POINTS FORTS: [liste des thèmes positifs récurrents avec fréquence]
   POINTS FAIBLES: [liste des problèmes récurrents avec fréquence]
   ACTIONS PRIORITAIRES: [3 actions concrètes pour améliorer la note]
3. Calcule la note moyenne réelle et son évolution dans le temps
4. Identifie les avis sans réponse de l'hôte et propose des réponses types

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRÉATION DE RÉSERVATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Quand l'utilisateur veut créer une réservation, collecte dans cet ordre:
1. Logement (si non précisé et plusieurs logements)
2. Dates arrivée/départ
3. Nom du voyageur
4. Prix total (optionnel)

Dès que tu as logement + dates + nom, confirme les détails en une phrase, puis si l'utilisateur confirme, émets EXACTEMENT sur sa propre ligne:
[RESERVATION:{"logement_id":ID,"tenant_name":"NOM","start_date":"YYYY-MM-DD","end_date":"YYYY-MM-DD","monthly_price":PRIX,"adults":1,"children":0,"source":"direct","booking_status":"confirmed","pets":false,"special_requests":""}]

Pour un brouillon avec infos manquantes:
[DRAFT_RESERVATION:{"logement_id":ID,"tenant_name":"NOM","start_date":"YYYY-MM-DD","end_date":"YYYY-MM-DD","monthly_price":0,"note":"INFO MANQUANTE"}]`;

    const groqMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        temperature: 0.35,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Groq API Error:', errorData);
      throw new Error(`Groq API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'Pas de réponse';
    const lastMessage = messages[messages.length - 1]?.content ?? '';

    return NextResponse.json({
      response: aiResponse,
      category: determinCategory(lastMessage)
    });

  } catch (error) {
    console.error('chat route error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function buildContextString(dataContext: DataContext): string {
  if (!dataContext) return 'Aucune donnée disponible';

  let context = 'LOGEMENTS:\n';
  if (dataContext.logements.length === 0) {
    context += '- Aucun logement\n';
  } else {
    dataContext.logements.forEach(log => {
      const type = log.location_type === 'shortterm' ? 'Courte durée' : 'Longue durée';
      const price = log.location_type === 'shortterm'
        ? `${log.price_per_night ?? log.price}€/nuit`
        : `${log.price}€/mois`;
      context += `- [ID:${log.id}] ${log.name} — ${log.address}${log.postal_code ? ` ${log.postal_code}` : ''} — ${log.rooms} pièces${log.surface ? ` ${log.surface}m²` : ''} — ${type} — ${price}`;
      if (log.furnished) context += ' — meublé';
      if (log.parking) context += ' — parking';
      if (log.wifi_code) context += ` — WiFi: ${log.wifi_code}`;
      if (log.cleaning_fees) context += ` — ménage: ${log.cleaning_fees}€`;
      if (log.concierge_commission) context += ` — commission: ${log.concierge_commission}%`;
      if (log.check_in_type) context += ` — check-in: ${log.check_in_type}`;
      if (log.key_location) context += ` — clés: ${log.key_location}`;
      if (log.building_code) context += ` — code entrée: ${log.building_code}`;
      if (log.water_meter_location) context += ` — compteur eau: ${log.water_meter_location}`;
      if (log.electricity_meter_location) context += ` — compteur élec: ${log.electricity_meter_location}`;
      if (log.garbage_info) context += ` — poubelles: ${log.garbage_info}`;
      if (log.specific_equipment) context += ` — équipements: ${log.specific_equipment}`;
      if (log.cleaning_checklist) context += ` — checklist ménage: ${log.cleaning_checklist}`;
      if (log.linage_storage) context += ` — linge: ${log.linage_storage}`;
      if (log.notes) context += ` — notes: ${log.notes}`;
      context += '\n';
    });
  }

  context += '\nRESERVATIONS / LOCATIONS:\n';
  const activeRentals = dataContext.rentals.filter(r => r.status === 'active');
  const pendingRentals = dataContext.rentals.filter(r => r.status === 'pending');
  const endedRentals = dataContext.rentals.filter(r => r.status === 'ended');

  dataContext.rentals.forEach(r => {
    const logement = dataContext.logements.find(l => l.id === r.logement_id);
    const statusLabel = r.booking_status ?? r.status;
    const price = r.monthly_price ? `${r.monthly_price}€` : 'prix non renseigné';
    const guests = r.adults ? `${r.adults} adulte(s)${r.children ? `, ${r.children} enfant(s)` : ''}` : '';
    const source = r.source ?? '';
    const pets = r.pets ? 'animaux: oui' : '';
    const extras = [guests, source, pets, r.special_requests].filter(Boolean).join(' | ');
    context += `- [${statusLabel}] ${r.tenant_name}${r.email ? ` <${r.email}>` : ''}${r.phone ? ` ${r.phone}` : ''} — ${logement?.name ?? `Logement #${r.logement_id}`} — du ${r.start_date} au ${r.end_date} — ${price}`;
    if (extras) context += ` — ${extras}`;
    context += '\n';
  });

  context += '\nSTATISTIQUES:\n';
  const totalRevenue = activeRentals.reduce((sum, r) => sum + (r.monthly_price ?? 0), 0);
  const occupancy = dataContext.logements.length > 0
    ? Math.round((activeRentals.length / dataContext.logements.length) * 100)
    : 0;
  context += `- Revenu mensuel actif: ${totalRevenue}€\n`;
  context += `- Taux d'occupation: ${occupancy}%\n`;
  context += `- Actives: ${activeRentals.length} | En attente: ${pendingRentals.length} | Terminées: ${endedRentals.length}\n`;

  const tasks = dataContext.tasks ?? [];
  const pendingTasks = tasks.filter(t => !t.completed);
  if (pendingTasks.length > 0) {
    context += '\nTACHES EN COURS:\n';
    pendingTasks.forEach(t => {
      const logement = dataContext.logements.find(l => l.id === t.logement_id);
      context += `- [${t.priority}] ${t.title} — ${logement?.name ?? `Logement #${t.logement_id}`}${t.due_date ? ` — échéance: ${t.due_date}` : ''}${t.assigned_to ? ` — assigné: ${t.assigned_to}` : ''}\n`;
    });
  }

  const incidents = dataContext.incidents ?? [];
  const openIncidents = incidents.filter(i => !i.resolved);
  if (openIncidents.length > 0) {
    context += '\nINCIDENTS OUVERTS:\n';
    openIncidents.forEach(i => {
      const logement = dataContext.logements.find(l => l.id === i.logement_id);
      context += `- [${i.priority}] ${i.title} — ${logement?.name ?? `Logement #${i.logement_id}`} — ${i.date}\n`;
    });
  }

  const reviews = dataContext.reviews ?? [];
  if (reviews.length > 0) {
    context += '\nAVIS VOYAGEURS:\n';
    reviews.forEach(r => {
      context += `- ${r.guestName} (${r.platform}) — ${r.logementName} — ${r.date} — ${r.rating}/5 — "${r.comment}"${r.hostResponse ? ' [répondu]' : ' [sans réponse]'}\n`;
    });
    const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    context += `- Moyenne: ${avgRating.toFixed(1)}/5 sur ${reviews.length} avis\n`;
  }

  return context;
}

function determinCategory(message: string): string {
  const lower = message.toLowerCase();
  
  if (/créer|ajouter|nouvelle/i.test(lower)) return 'Locations';
  if (/revenu|finance|prix|coût|tarif|€/i.test(lower)) return 'Finance';
  if (/location|rental|tenant|locataire/i.test(lower)) return 'Locations';
  if (/logement|propriété|bien|appartement|maison/i.test(lower)) return 'Logements';
  if (/occupé|occupation|vacant|taux/i.test(lower)) return 'Finance';
  if (/historique|terminé|ended|passé/i.test(lower)) return 'Locations';
  if (/locataire|tenant|habitant/i.test(lower)) return 'Locataires';
  
  return 'Autres';
}