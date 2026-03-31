import { NextRequest, NextResponse } from 'next/server';

const DOC_TYPE_PROMPTS: Record<string, string> = {
  annonce: `Tu analyses une annonce de location immobilière (Airbnb, Booking, etc.).
Extrait ces informations et retourne UNIQUEMENT un objet JSON valide avec ces champs (omets les champs absents) :
{
  "name": "titre/nom du logement",
  "address": "adresse complète",
  "rooms": nombre_entier,
  "specific_equipment": "liste des équipements séparés par virgules",
  "notes": "règles de la maison, règlement intérieur",
  "description": "description générale du logement"
}`,

  welcome_book: `Tu analyses un manuel de maison / welcome book.
Extrait ces informations et retourne UNIQUEMENT un objet JSON valide avec ces champs (omets les champs absents) :
{
  "wifi_code": "nom_réseau / mot_de_passe WiFi",
  "building_code": "code boîte à clés ou code entrée immeuble",
  "key_location": "où et comment récupérer les clés",
  "garbage_info": "instructions tri sélectif et collecte poubelles",
  "specific_equipment": "équipements importants avec instructions d'utilisation",
  "notes": "numéros d'urgence, thermostat, autres informations importantes"
}`,

  facture: `Tu analyses une facture de service (eau, électricité, internet, gaz).
Extrait ces informations et retourne UNIQUEMENT un objet JSON valide avec ces champs (omets les champs absents) :
{
  "water_meter_location": "numéro contrat / compte eau",
  "electricity_meter_location": "numéro contrat / compte électricité",
  "notes": "fournisseurs, numéros de compte, références contrats"
}`,

  contrat_gestion: `Tu analyses un contrat de gestion immobilière.
Extrait ces informations et retourne UNIQUEMENT un objet JSON valide avec ces champs (omets les champs absents) :
{
  "concierge_commission": nombre_en_pourcentage_sans_symbole (ex: 15 pour 15%),
  "cleaning_fees": nombre_en_euros_sans_symbole (ex: 80 pour 80€),
  "notes": "prestations incluses, conditions particulières, durée"
}`,

  etat_lieux: `Tu analyses un état des lieux (entrée ou sortie).
Extrait ces informations et retourne UNIQUEMENT un objet JSON valide avec ces champs (omets les champs absents) :
{
  "specific_equipment": "liste des meubles et équipements inventoriés",
  "cleaning_checklist": "points à vérifier et nettoyer",
  "notes": "état général, observations, dégradations constatées"
}`,
};

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Groq API key not configured' }, { status: 500 });
    }

    const body = await req.json() as {
      base64?: string;
      mimeType: string;
      docType: string;
      extractedText?: string;
    };

    const { base64, mimeType, docType, extractedText } = body;

    const systemPrompt = DOC_TYPE_PROMPTS[docType];
    if (!systemPrompt) {
      return NextResponse.json({ error: 'Type de document invalide' }, { status: 400 });
    }

    const isImage = mimeType.startsWith('image/');

    type Message = {
      role: string;
      content: string | Array<{ type: string; image_url?: { url: string }; text?: string }>;
    };

    let messages: Message[];
    let model: string;

    const instruction = systemPrompt + '\n\nRetourne UNIQUEMENT le JSON, aucun autre texte ni explication. Si une donnée est absente du document, omets ce champ.';

    if (isImage && base64) {
      model = 'llama-3.2-90b-vision-preview';
      messages = [
        { role: 'system', content: instruction },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
            { type: 'text', text: 'Analyse ce document et retourne uniquement le JSON demandé.' },
          ],
        },
      ];
    } else if (extractedText) {
      model = 'llama-3.3-70b-versatile';
      messages = [
        { role: 'system', content: instruction },
        {
          role: 'user',
          content: `Contenu du document (PDF) :\n\n${extractedText.substring(0, 8000)}\n\nRetourne uniquement le JSON demandé.`,
        },
      ];
    } else {
      return NextResponse.json({ error: 'Aucune donnée de document fournie' }, { status: 400 });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, temperature: 0.1, max_tokens: 1024 }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Groq API error');
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content ?? '{}';

    let fields: Record<string, unknown> = {};
    try {
      fields = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try { fields = JSON.parse(match[0]); } catch { /* leave empty */ }
      }
    }

    // Strip null / empty values
    const cleanedFields = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== 'null'),
    );

    return NextResponse.json({ fields: cleanedFields });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
