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
    const { userMessage, dataContext } = await req.json();

    // Verify Groq API key
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('❌ GROQ_API_KEY not found');
      return NextResponse.json(
        { error: 'Groq API key not configured' },
        { status: 500 }
      );
    }

    // Build context
    const contextStr = buildContextString(dataContext);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `Tu es SideKick, un assistant de gestion locative. Tu as accès à toutes les données réelles de l'utilisateur.

DONNÉES EN TEMPS RÉEL:
${contextStr}

RÈGLES STRICTES:
- Réponds uniquement en français
- Pas d'emojis, jamais
- Réponses courtes et directes — maximum 5 phrases sauf si une analyse détaillée est explicitement demandée
- Utilise les données fournies pour répondre avec précision (noms, montants, dates réels)
- Si une information manque dans les données, dis-le clairement
- Pas de formules d'intro du type "Bien sûr !", "Absolument !", "Avec plaisir !"
- Commence directement par la réponse`
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        temperature: 0.4,
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

    return NextResponse.json({
      response: aiResponse,
      category: determinCategory(userMessage)
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