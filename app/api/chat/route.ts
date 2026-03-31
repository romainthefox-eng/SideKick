import { NextResponse } from 'next/server';

interface DataContext {
  logements: Array<{
    id: number;
    name: string;
    address: string;
    price: number;
    type: string;
    rooms: number;
  }>;
  rentals: Array<{
    id: number;
    logementId: number;
    tenantName: string;
    monthlyPrice: number;
    startDate: string;
    endDate: string;
    status: 'active' | 'ended' | 'pending';
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

    // Call Groq API
    console.log('🚀 Calling Groq API...');
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
            content: `Tu es l'assistant IA de gestion immobilière Side Kick. Tu aides l'utilisateur avec ses logements, locations et revenus.

DONNÉES ACTUELLES:
${contextStr}

INSTRUCTIONS:
- Réponds en français avec emojis pertinents
- Sois naturel, conversationnel, comme ChatGPT
- Fournis des insights utiles sur ses données
- Pose des questions pour mieux aider
- Sois motivant et professionnel

L'utilisateur peut te demander:
- Ses revenus, taux occupation
- Détails sur un logement/location
- Conseils de gestion
- Prédictions/analyses
- Créer une nouvelle location ou logement

Sois clair, concis, amical!`
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        temperature: 0.8,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Groq API Error:', errorData);
      throw new Error(`Groq API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'Pas de réponse';

    console.log('✅ Groq response received');
    return NextResponse.json({
      response: aiResponse,
      category: determinCategory(userMessage)
    });

  } catch (error) {
    console.error('❌ Error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      { 
        error: msg,
        hint: 'Vérifiez votre clé API Groq et votre connexion internet'
      },
      { status: 500 }
    );
  }
}

function buildContextString(dataContext: DataContext): string {
  if (!dataContext) return 'Aucune donnée disponible';

  let context = '**LOGEMENTS:**\n';
  if (dataContext.logements.length === 0) {
    context += '- Aucun logement enregistré\n';
  } else {
    dataContext.logements.forEach(log => {
      context += `- ${log.name} (${log.address}) - ${log.rooms} pièces - ${log.price}€/mois\n`;
    });
  }

  context += '\n**LOCATIONS ACTIVES:**\n';
  const activeRentals = dataContext.rentals.filter(r => r.status === 'active');
  if (activeRentals.length === 0) {
    context += '- Aucune location active\n';
  } else {
    activeRentals.forEach(r => {
      const logement = dataContext.logements.find(l => l.id === r.logementId);
      context += `- ${r.tenantName} dans ${logement?.name || 'Logement inconnu'} (${r.monthlyPrice}€/mois) jusqu'au ${r.endDate}\n`;
    });
  }

  context += '\n**STATISTIQUES:**\n';
  const totalRevenue = activeRentals.reduce((sum, r) => sum + r.monthlyPrice, 0);
  const occupancy = dataContext.logements.length > 0 
    ? Math.round((activeRentals.length / dataContext.logements.length) * 100) 
    : 0;
  context += `- Revenu mensuel: ${totalRevenue}€\n`;
  context += `- Taux d'occupation: ${occupancy}%\n`;
  context += `- Locations actives: ${activeRentals.length}/${dataContext.rentals.length}\n`;

  const reviews = dataContext.reviews ?? [];
  if (reviews.length > 0) {
    context += '\n**AVIS VOYAGEURS:**\n';
    reviews.forEach(r => {
      const responded = r.hostResponse ? ' [répondu]' : ' [sans réponse]';
      context += `- ${r.guestName} (${r.platform}) → ${r.logementName} le ${r.date} : ${r.rating}/5 — "${r.comment}"${responded}\n`;
    });
    const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    context += `- Note moyenne globale : ${avgRating.toFixed(1)}/5 sur ${reviews.length} avis\n`;
    const unanswered = reviews.filter(r => !r.hostResponse).length;
    if (unanswered > 0) context += `- ${unanswered} avis sans réponse de l'hôte\n`;
  } else {
    context += '\n**AVIS VOYAGEURS:** Aucun avis enregistré\n';
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