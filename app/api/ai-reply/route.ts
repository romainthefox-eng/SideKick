import { NextResponse } from 'next/server';

interface PropertyDetails {
  wifi_code?: string | null;
  key_location?: string | null;
  building_code?: string | null;
  check_in_type?: string | null;
  address?: string | null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, tenantName, propertyName, propertyDetails, mode } = body as {
      message: string;
      tenantName?: string;
      propertyName?: string;
      propertyDetails?: PropertyDetails;
      mode?: 'reply' | 'translate';
    };

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message requis' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key non configuree' }, { status: 500 });
    }

    let systemPrompt: string;
    let userContent: string;

    if (mode === 'translate') {
      systemPrompt = `Tu es un traducteur professionnel. Traduis le texte suivant en français. Repondre uniquement avec la traduction, sans commentaire ni explication.`;
      userContent = message;
    } else {
      const details: string[] = [];
      if (propertyDetails?.wifi_code) details.push(`Code WiFi : ${propertyDetails.wifi_code}`);
      if (propertyDetails?.building_code) details.push(`Code immeuble : ${propertyDetails.building_code}`);
      if (propertyDetails?.key_location) details.push(`Cles / Acces : ${propertyDetails.key_location}`);
      if (propertyDetails?.check_in_type) details.push(`Type d'acces : ${propertyDetails.check_in_type}`);
      if (propertyDetails?.address) details.push(`Adresse : ${propertyDetails.address}`);

      systemPrompt = `Tu es un assistant de gestion locative professionnel. Tu aides un gestionnaire immobilier a rediger des reponses a ses locataires et voyageurs en francais.

${propertyName ? `Logement concerne : ${propertyName}` : ''}
${tenantName ? `Locataire / Voyageur : ${tenantName}` : ''}
${details.length > 0 ? `\nInfos du logement :\n${details.map(d => `- ${d}`).join('\n')}` : ''}

Regles :
- Redige une reponse courte, professionnelle et chaleureuse (3-5 phrases maximum)
- Commence directement par la reponse (pas de "Voici une reponse :")
- Utilise "Bonjour ${tenantName?.split(' ')[0] ?? '[Prenom]'}," en debut de message
- Utilise les infos du logement si pertinentes (WiFi, cles, code...) pour repondre precisement
- Termine par "Cordialement" ou une formule chaleureuse selon le contexte
- Ne mets pas de json, juste le texte de la reponse`;

      userContent = `Message recu : "${message}"\n\nRedige une reponse appropriee.`;
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: mode === 'translate' ? 0.2 : 0.7,
        max_tokens: mode === 'translate' ? 200 : 350,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('Groq error:', err);
      return NextResponse.json({ error: 'Erreur API IA' }, { status: 502 });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim() ?? '';

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('ai-reply error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
