'use client';

import { useState } from 'react';
import { useProperty, type Logement } from '../context/PropertyContext';

interface Message {
  id: number;
  question: string;
  response: string;
  timestamp: string;
  category: string;
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Nom du logement',
  address: 'Adresse',
  rooms: 'Nombre de pièces',
  specific_equipment: 'Équipements',
  notes: 'Notes / informations',
  description: 'Description',
  wifi_code: 'Code WiFi',
  building_code: 'Code boîte à clés / entrée',
  key_location: 'Emplacement des clés',
  garbage_info: 'Instructions poubelles',
  water_meter_location: 'Compteur eau / contrat',
  electricity_meter_location: 'Compteur électricité / contrat',
  concierge_commission: 'Commission conciergerie (%)',
  cleaning_fees: 'Frais de ménage (€)',
  cleaning_checklist: 'Checklist ménage',
};

export default function Demandes() {
  const { logements, rentals, addRental, addLogement, updateLogement } = useProperty();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ─── Document import states ───────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'chat' | 'import'>('chat');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('annonce');
  const [selectedLogementId, setSelectedLogementId] = useState<number | ''>('');
  const [uploading, setUploading] = useState(false);
  const [extractedFields, setExtractedFields] = useState<Record<string, string | number> | null>(null);
  const [editedFields, setEditedFields] = useState<Record<string, string | number>>({});
  const [uploadError, setUploadError] = useState('');
  const [applySuccess, setApplySuccess] = useState(false);

  // ===============================
  // HYBRID AI SYSTEM
  // ===============================
  
  // Check if a query should be handled by OpenAI (complex questions)
  const shouldUseOpenAI = (query: string): boolean => {
    // ALWAYS USE OPENAI - Full AI interaction mode
    return true;
  };

  // Call OpenAI API
  const callOpenAI = async (userMessage: string): Promise<{ response: string; category: string }> => {
    try {
      // Load reviews from localStorage
      let reviews: { guestName: string; logementName: string; platform: string; date: string; rating: number; comment: string; hostResponse?: string }[] = [];
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('sk_reviews') : null;
        if (raw) reviews = JSON.parse(raw);
      } catch { /* noop */ }

      const dataContext = {
        logements: logements.map(l => ({
          id: l.id,
          name: l.name,
          address: l.address,
          price: l.price,
          type: l.type,
          rooms: l.rooms
        })),
        rentals: rentals.map(r => ({
          id: r.id,
          logement_id: r.logement_id,
          tenant_name: r.tenant_name,
          monthly_price: r.monthly_price,
          start_date: r.start_date,
          end_date: r.end_date,
          status: r.status
        })),
        reviews,
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage,
          dataContext
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Impossible de lire la réponse' }));
        const errorMsg = errorData.error || `Erreur HTTP ${response.status}`;
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMsg,
          details: errorData.details
        });
        throw new Error(errorMsg);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      return {
        response: data.response || 'Pas de réponse',
        category: data.category || 'Autres'
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('❌ erreur complète:', errorMsg);
      return {
        response: `❌ **Erreur**: ${errorMsg}\n\n💡 **Solution**: Vérifiez que:\n1. Votre clé API OpenAI est correcte\n2. Vous avez du crédit OpenAI\n3. Vous utilisez un modèle disponible\n\n**Mode local activé**. Essayez: "Combien de locations?"`,
        category: 'Autres'
      };
    }
  };

  // ===============================
  // CONVERSATIONAL AI ENGINE (LOCAL)
  // ===============================
  const conversationalAI = (query: string): { response: string; category: string } => {
    const q = query.toLowerCase().trim();
    
    // Extract intent & entities
    const intent = detectIntent(q);
    const entities = extractEntities(query);
    
    // Route to appropriate handler
    if (intent === 'create_rental') {
      return handleCreateRental(query, entities);
    } else if (intent === 'create_property') {
      return handleCreateProperty(query, entities);
    } else if (intent === 'query_finances') {
      return handleFinanceQuery(query, entities);
    } else if (intent === 'query_tenants') {
      return handleTenantQuery(query);
    } else if (intent === 'query_properties') {
      return handlePropertyQuery(query, entities);
    } else if (intent === 'query_stats') {
      return handleStatsQuery(query);
    } else if (intent === 'query_advice') {
      return handleAdviceQuery(query);
    }
    
    // Default: ask clarifying question
    return {
      response: `Je ne suis pas sûr de comprendre. Vous voulez:\n\n💰 **Finances?** (Revenu, taux occ...)\n👥 **Locataires?** (Qui habite où)\n🏠 **Logements?** (Liste, détails)\n✨ **Créer?** (Location, logement)\n\nPosez votre question autrement!`,
      category: 'Clarification'
    };
  };

  const detectIntent = (q: string): string => {
    // Creation intents - MORE FLEXIBLE
    if (/crée|creer|ajoute|ajouter|ajoute.moi|rajoute|rajouter|nouvelle|nouveau|rajoute.moi|ajoute.un|ajoute.une/i.test(q)) {
      if (/location|locataire|tenant|loue|louer|habite|occupant|location.pour|locataire.dans/i.test(q)) return 'create_rental';
      if (/logement|propriété|bien|appartement|maison|adresse|rue|avenue|immeuble|maison.de/i.test(q)) return 'create_property';
    }
    
    // Query intents - IMPROVED PATTERNS
    if (/revenu|gain|gagne|combien.*gagne|combien.*par|combien.*mois|combien.*year|combien.*annuel|prix|coût|€|euros|finance|cash|bénéfice|profit|chiffre|income/i.test(q)) return 'query_finances';
    if (/locataire|tenant|qui|habitant|loge|habite|occupant|résident|qui.*où|où.*habite|où.*loge/i.test(q)) return 'query_tenants';
    if (/logement|propriété|bien|portefeuille|liste|détail|appart|adresse|caractéristique|spécification|chauffage|internet|parking/i.test(q)) return 'query_properties';
    if (/combien|nombre|total|taux|occupat|statistique|stats|situation|vue.*ensemble|state|status/i.test(q)) return 'query_stats';
    if (/conseil|preconisation|suggestion|comment|optimiser|meilleur|tip|astuce|analyse|stratég|recommandation|advice|faire pour/i.test(q)) return 'query_advice';
    
    return 'unknown';
  };

  const extractEntities = (query: string) => {
    return {
      property: findPropertyByName(query),
      dates: extractDates(query),
      price: extractPrice(query),
      tenantName: extractTenantName(query)
    };
  };

  const extractTenantName = (text: string): string | null => {
    // Look for patterns like "nommé X", "pour X", "tenant X"
    const patterns = [
      /nommé[:\s]+([A-Za-z\sàâäéèêëïîôùûüœæ]+?)(?:\s+du|\s+de|,|$)/i,
      /locataire[:\s]+([A-Za-z\sàâäéèêëïîôùûüœæ]+?)(?:\s+du|\s+de|,|$)/i,
      /tenant[:\s]+([A-Za-z\sàâäéèêëïîôùûüœæ]+?)(?:\s+du|\s+de|,|$)/i,
      /pour\s+([A-Za-z\sàâäéèêëïîôùûüœæ]+?)(?:\s+du|\s+de|,|$)/i,
      /nom.*?([A-Za-z\sàâäéèêëïîôùûüœæ]+?)(?:\s+du|\s+de|,|$)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim().length > 2) {
        return match[1].trim();
      }
    }
    return null;
  };

  const handleCreateRental = (query: string, entities: any) => {
    if (!entities.property) {
      return {
        response: `📍 Quel logement? (ex: Appart 1A, Dupont...)\n\nVos logements:\n${logements.map(l => `• ${l.name} - ${l.address}`).join('\n')}`,
        category: 'Création'
      };
    }
    
    if (entities.dates.length < 2) {
      return {
        response: `📅 Quelles dates?\n\nExemples:\n• "du 15 avril au 30 juin"\n• "01/05/2025 30/06/2025"\n• "15-04-2025 à 15-06-2025"`,
        category: 'Création'
      };
    }
    
    if (!entities.price) {
      return {
        response: `💰 Quel prix mensuel?\n\nExemples: "1200€", "pour 950 euros", "1500"`,
        category: 'Création'
      };
    }

    // All info present - CREATE
    const startDate = entities.dates[0];
    const endDate = entities.dates[1];
    
    // Check conflicts
    const conflicts = rentals.filter(r => {
      if (r.logement_id !== entities.property.id || r.status === 'ended') return false;
      const rStart = new Date(r.start_date);
      const rEnd = new Date(r.end_date);
      const newStart = new Date(startDate);
      const newEnd = new Date(endDate);
      return (newStart <= rEnd) && (newEnd >= rStart);
    });

    if (conflicts.length > 0) {
      return {
        response: `⚠️ Conflit! ${conflicts[0].tenant_name} habite déjà du ${new Date(conflicts[0].start_date).toLocaleDateString('fr-FR')} au ${new Date(conflicts[0].end_date).toLocaleDateString('fr-FR')}.\n\nChoisissez d'autres dates.`,
        category: 'Création'
      };
    }

    // Create
    addRental({
      logement_id: entities.property.id,
      tenant_name: entities.tenantName || 'À renseigner',
      email: '',
      phone: '',
      start_date: startDate,
      end_date: endDate,
      monthly_price: entities.price || 0,
      status: 'active'
    });

    const duration = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    const revenue = Math.round((duration / 30) * entities.price);

    return {
      response: `✅ **Location créée!**\n\n🏠 ${entities.property.name}\n📅 ${new Date(startDate).toLocaleDateString('fr-FR')} → ${new Date(endDate).toLocaleDateString('fr-FR')}\n💰 ${entities.price}€/mois\n💵 Revenu estimé: ${revenue}€`,
      category: 'Création'
    };
  };

  const handleCreateProperty = (query: string, entities: any) => {
    if (!entities.price) {
      return {
        response: `💰 Quel est le prix mensuel?\n\nExemple: "1200€", "850 euros"`,
        category: 'Création'
      };
    }

    let address = null;
    const addressMatch = query.match(/(?:à|au|en|rue|avenue|boulevard|place|chez|adresse)[\s:]*([^€\n]+?)(?:\s+pour|\s*€|$)/i);
    if (addressMatch) {
      address = addressMatch[1].trim();
    }

    if (!address) {
      return {
        response: `📍 Où se situe le logement?\n\nExemple: "15 rue Dupont", "Paris", "123 avenue centrale"`,
        category: 'Création'
      };
    }

    // Check if exists
    const exists = logements.find(l => l.address.toLowerCase() === address.toLowerCase());
    if (exists) {
      return {
        response: `⚠️ Ce logement existe déjà: **${exists.name}** à ${exists.address}`,
        category: 'Création'
      };
    }

    // Create
    addLogement({
      name: address.split(',')[0],
      address: address,
      postal_code: null,
      type: 'appartement',
      rooms: 2,
      price: entities.price,
      description: 'Créé via Assistant IA',
      location_type: 'longterm',
      rent_without_charges: entities.price,
      monthly_charges: null,
      surface: null,
      deposit_guarantee: null,
      heating: null,
      water: null,
      internet: false,
      parking: false,
      furnished: false,
      notes: null,
      price_per_night: null,
      cleaning_fees: null,
      concierge_commission: null,
      check_in_type: null,
      key_location: null,
      building_code: null,
      wifi_code: null,
      water_meter_location: null,
      electricity_meter_location: null,
      garbage_info: null,
      specific_equipment: null,
      cleaning_checklist: null,
      linage_storage: null,
    });

    return {
      response: `✅ **Logement créé!**\n\n🏠 ${address}\n💵 ${entities.price}€/mois\n\n📝 Vous pouvez modifier les détails dans la section Logement.`,
      category: 'Création'
    };
  };

  const handleFinanceQuery = (query: string, entities: any) => {
    const activeRentals = rentals.filter(r => r.status === 'active');
    const totalMonthly = activeRentals.reduce((sum, r) => sum + (r.monthly_price ?? 0), 0);
    const totalYearly = totalMonthly * 12;

    let response = `💰 **Vos revenus**\n\n`;
    response += `📊 Mensuel: **${totalMonthly}€**\n`;
    response += `📊 Annuel: **${totalYearly}€**\n`;
    response += `📍 Locations actives: ${activeRentals.length}\n\n`;

    if (activeRentals.length > 0) {
      const avgPrice = Math.round(totalMonthly / activeRentals.length);
      response += `📈 Moyenne par location: ${avgPrice}€/mois\n`;
      response += `📈 Taux d'occupation: ${logements.length > 0 ? Math.round((activeRentals.length / logements.length) * 100) : 0}%`;
    }

    return {
      response: response,
      category: 'Finances'
    };
  };

  const handleTenantQuery = (query: string) => {
    const activeRentals = rentals.filter(r => r.status === 'active');
    
    if (activeRentals.length === 0) {
      return {
        response: `👥 **Aucun locataire actif** pour l'instant.\n\nVoulez-vous créer une location?`,
        category: 'Locataires'
      };
    }

    let response = `👥 **${activeRentals.length} locataire${activeRentals.length > 1 ? 's' : ''}** actif${activeRentals.length > 1 ? 's' : ''}\n\n`;
    
    activeRentals.forEach(r => {
      const logement = logements.find(l => l.id === r.logement_id);
      const daysLeft = Math.ceil((new Date(r.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const status = daysLeft > 30 ? '✅' : daysLeft > 0 ? '⚠️' : '🔴';
      
      response += `${status} **${r.tenant_name}**\n`;
      response += `   📍 ${logement?.name || 'Logement'}\n`;
      response += `   💰 ${r.monthly_price}€/mois\n`;
      response += `   📅 Fin dans ${daysLeft} jours\n\n`;
    });

    return {
      response: response.trim(),
      category: 'Locataires'
    };
  };

  const handlePropertyQuery = (query: string, entities: any) => {
    if (entities.property) {
      const activeCount = rentals.filter(r => r.logement_id === entities.property.id && r.status === 'active').length;
      let response = `🏠 **${entities.property.name}**\n\n`;
      response += `📍 ${entities.property.address}\n`;
      response += `🛏️ ${entities.property.rooms} pièces • ${entities.property.type}\n`;
      response += `💵 ${entities.property.price}€/mois\n\n`;
      response += `🔥 Chauffage: ${entities.property.specifications.heating}\n`;
      response += `💧 Eau: ${entities.property.specifications.water}\n`;
      response += `📡 Internet: ${entities.property.specifications.internet ? '✓' : '✗'}\n`;
      response += `🅿️ Parking: ${entities.property.specifications.parking ? '✓' : '✗'}\n`;
      response += `👥 Occupants: ${activeCount}`;

      return {
        response: response,
        category: 'Logements'
      };
    }

    // List all
    if (logements.length === 0) {
      return {
        response: `📭 **Aucun logement** pour le moment.\n\nCréez-en un: "Ajoute logement rue Dupont 850€"`,
        category: 'Logements'
      };
    }

    let response = `🏠 **${logements.length} logement${logements.length > 1 ? 's' : ''}**\n\n`;
    logements.forEach(l => {
      const activeCount = rentals.filter(r => r.logement_id === l.id && r.status === 'active').length;
      response += `📌 **${l.name}** (${l.address})\n`;
      response += `   ${l.rooms} pièces • ${l.price}€/mois • ${activeCount} location${activeCount === 1 ? '' : 's'}\n`;
    });

    return {
      response: response.trim(),
      category: 'Logements'
    };
  };

  const handleStatsQuery = (query: string) => {
    const activeRentals = rentals.filter(r => r.status === 'active');
    const occupancyRate = logements.length > 0 ? Math.round((activeRentals.length / logements.length) * 100) : 0;
    const totalMonthly = activeRentals.reduce((sum, r) => sum + (r.monthly_price ?? 0), 0);

    let response = `📊 **Vue d'ensemble**\n\n`;
    response += `🏠 Portefeuille: ${logements.length} logement${logements.length === 1 ? '' : 's'}\n`;
    response += `👥 Locations actives: ${activeRentals.length}/${rentals.length}\n`;
    response += `💰 Revenu mensuel: ${totalMonthly}€\n`;
    response += `📈 Taux d'occupation: ${occupancyRate}%\n`;
    response += `📉 Logements libres: ${logements.length - activeRentals.length}`;

    return {
      response: response,
      category: 'Statistiques'
    };
  };

  const handleAdviceQuery = (query: string) => {
    const activeRentals = rentals.filter(r => r.status === 'active');
    const occupancyRate = logements.length > 0 ? (activeRentals.length / logements.length) * 100 : 0;
    const totalMonthly = activeRentals.reduce((sum, r) => sum + (r.monthly_price ?? 0), 0);

    let response = `💡 **Mes conseils**\n\n`;

    if (occupancyRate < 50) {
      response += `⚠️ Votre occupation est faible (${Math.round(occupancyRate)}%). Cherchez des locataires!\n`;
    } else if (occupancyRate === 100) {
      response += `✅ Excellent! Vous êtes à 100% d'occupation.\n`;
    }

    if (logements.length === 0) {
      response += `📝 Vous devriez ajouter des logements à votre portefeuille.\n`;
    }

    if (activeRentals.length === 0) {
      response += `📝 Créez votre première location pour commencer à gagner!\n`;
    }

    const avgPrice = activeRentals.length > 0 ? Math.round(totalMonthly / activeRentals.length) : 0;
    if (avgPrice > 0 && avgPrice < 500) {
      response += `💰 Votre prix moyen (${avgPrice}€) semble bas. Vérifiez la tarification du marché.\n`;
    }

    response += `\n👍 Vous gériez vos locations via Side Kick - excellent!`;

    return {
      response: response,
      category: 'Conseils'
    };
  };
  
  // Extract dates from natural language - IMPROVED
  const extractDates = (text: string) => {
    const frenchMonths: { [key: string]: string } = {
      'janvier': '01', 'février': '02', 'fevrier': '02', 'mars': '03', 'avril': '04',
      'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08', 'aout': '08', 'septembre': '09',
      'octobre': '10', 'novembre': '11', 'décembre': '12', 'decembre': '12'
    };

    const dates = [];
    
    // Format YYYY-MM-DD
    const pattern1 = /(\d{4})-(\d{2})-(\d{2})/g;
    let match;
    while ((match = pattern1.exec(text)) !== null) {
      dates.push(`${match[1]}-${match[2]}-${match[3]}`);
    }
    
    // Format DD/MM/YYYY
    const pattern2 = /(\d{1,2})\/(\d{1,2})\/(\d{4})/g;
    while ((match = pattern2.exec(text)) !== null) {
      dates.push(`${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`);
    }
    
    // Format DD-MM-YYYY or DD.MM.YYYY
    const pattern2b = /(\d{1,2})[-.](\d{1,2})[-.](\d{4})/g;
    while ((match = pattern2b.exec(text)) !== null) {
      dates.push(`${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`);
    }
    
    // Format DD mois YYYY (naturel) - avec "du", "au", etc.
    const pattern3 = /(?:du|au|de|le)?\s*(\d{1,2})\s+(?:janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+(\d{4})?/gi;
    const matches = [];
    let match3;
    while ((match3 = pattern3.exec(text)) !== null) {
      matches.push({ day: match3[1], month: match3[0].match(/(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)/i)?.[0], year: match3[2] || new Date().getFullYear() });
    }
    
    matches.forEach(m => {
      if (m.month) {
        const month = frenchMonths[m.month.toLowerCase()];
        dates.push(`${m.year}-${month}-${m.day.padStart(2, '0')}`);
      }
    });
    
    // Remove duplicates and sort
    return [...new Set(dates)].sort();
  };

  // Extract price in any format
  const extractPrice = (text: string): number | null => {
    const pricePattern = /(\d+(?:[.,]\d{2})?)\s*€|pour\s+(\d+(?:[.,]\d{2})?)|(\d+(?:[.,]\d{2})?)\s+euros?/gi;
    let match;
    let lastPrice = null;
    
    while ((match = pricePattern.exec(text)) !== null) {
      const priceStr = match[1] || match[2] || match[3];
      lastPrice = parseInt(priceStr.replace(/[.,]/g, ''));
    }
    
    return lastPrice;
  };

  // Smarter property finder - IMPROVED
  const findPropertyByName = (text: string) => {
    const lowerText = text.toLowerCase();
    
    // Exact match first (check both name and address)
    for (const log of logements) {
      if (lowerText.includes(log.name.toLowerCase()) || lowerText.includes(log.address.toLowerCase())) {
        return log;
      }
    }
    
    // Fuzzy match by keywords - check for partial matches
    for (const log of logements) {
      const nameWords = log.name.toLowerCase().split(/\s+/);
      const addressWords = log.address.toLowerCase().split(/\s+/);
      const allWords = [...nameWords, ...addressWords].filter(w => w.length > 2);
      
      if (allWords.some(w => lowerText.includes(w))) {
        return log;
      }
    }
    
    // If only one logement exists, return it as default
    if (logements.length === 1) {
      return logements[0];
    }
    
    return null;
  };

  // ===============================
  // INTELLIGENT REQUEST PARSER
  // ===============================
  const parseCreateRentalRequest = (query: string) => {
    const lowerQuery = query.toLowerCase();
    
    // Check if this is a creation request
    const createKeywords = ['créer', 'créé', 'ajouter', 'ajoute', 'nouvelle', 'nouveau', 'add', 'create', 'ajoute moi'];
    const rentalKeywords = ['location', 'locataire', 'rental', 'tenant'];
    
    const isCreationRequest = createKeywords.some(keyword => lowerQuery.includes(keyword)) && 
                              rentalKeywords.some(keyword => lowerQuery.includes(keyword));
    
    if (!isCreationRequest) {
      return { success: false };
    }

    // Find logement by fuzzy matching
    let foundLogement = null;
    for (const logement of logements) {
      const logementNameLower = logement.name.toLowerCase();
      if (lowerQuery.includes(logementNameLower)) {
        foundLogement = logement;
        break;
      }
      const nameWords = logementNameLower.split(/\s+/);
      if (nameWords.some(word => word.length > 2 && lowerQuery.includes(word))) {
        foundLogement = logement;
        break;
      }
    }
    
    if (!foundLogement) {
      const availableLogements = logements.map(l => l.name).join(', ');
      return { success: false, error: `Logement non trouvé. Logements disponibles: ${availableLogements}` };
    }

    const frenchMonths: { [key: string]: string } = {
      'janvier': '01', 'février': '02', 'fevrier': '02', 'mars': '03', 'avril': '04', 
      'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08', 'aout': '08', 'septembre': '09', 
      'octobre': '10', 'novembre': '11', 'décembre': '12', 'decembre': '12'
    };

    let startDate: string | undefined;
    let endDate: string | undefined;

    const datePattern1 = /(\d{4})-(\d{2})-(\d{2})/g;
    const dates1 = [...query.matchAll(datePattern1)];
    
    const datePattern2 = /(\d{1,2})\/(\d{1,2})\/(\d{4})/g;
    const dates2 = [...query.matchAll(datePattern2)];
    
    const datePattern3 = /(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+(\d{4})/gi;
    const dates3 = [...query.matchAll(datePattern3)];

    if (dates1.length >= 2) {
      startDate = `${dates1[0][1]}-${dates1[0][2]}-${dates1[0][3]}`;
      endDate = `${dates1[1][1]}-${dates1[1][2]}-${dates1[1][3]}`;
    } else if (dates2.length >= 2) {
      const d1 = dates2[0];
      const d2 = dates2[1];
      startDate = `${d1[3]}-${d1[2].padStart(2, '0')}-${d1[1].padStart(2, '0')}`;
      endDate = `${d2[3]}-${d2[2].padStart(2, '0')}-${d2[1].padStart(2, '0')}`;
    } else if (dates3.length >= 2) {
      const d1 = dates3[0];
      const d2 = dates3[1];
      const month1 = frenchMonths[d1[2].toLowerCase()];
      const month2 = frenchMonths[d2[2].toLowerCase()];
      startDate = `${d1[3]}-${month1}-${d1[1].padStart(2, '0')}`;
      endDate = `${d2[3]}-${month2}-${d2[1].padStart(2, '0')}`;
    } else {
      return { success: false, error: 'Format de date invalide. Utilisez: DD/MM/YYYY ou DD mois YYYY' };
    }

    const pricePattern = /(\d+(?:[.,]\d{2})?)\s*€|euros?|pour\s+(\d+(?:[.,]\d{2})?)/gi;
    const prices = [...query.matchAll(pricePattern)];
    
    if (prices.length === 0) {
      return { success: false, error: 'Prix non spécifié. Exemple: "1200€" ou "pour 1200"' };
    }

    const priceStr = prices[prices.length - 1][1] || prices[prices.length - 1][2];
    const monthlyPrice = parseInt(priceStr.replace(/[.,]/g, ''));

    if (!startDate || !endDate || !monthlyPrice) {
      return { success: false, error: 'Paramètres incomplets' };
    }

    return {
      success: true,
      logementId: foundLogement.id,
      startDate,
      endDate,
      monthlyPrice
    };
  };

  // ===============================
  // ULTRA-FLUIDE NATURAL LANGUAGE AI
  // ===============================
  const intelligentSearch = (query: string): { response: string; category: string } => {
    const q = query.toLowerCase().trim();
    
    // ==========================================
    // 1. CREATE RENTAL - ULTRA FLEXIBLE
    // ==========================================
    const isRentalCreation = /crée|creer|ajoute|ajouter|nouvelle|nouveau|rajoute|rajouter|location|locataire|tenant|loue/i.test(query);
    
    if (isRentalCreation) {
      // Extract ALL possible info
      const property = findPropertyByName(query);
      const dates = extractDates(query);
      const price = extractPrice(query);
      
      // TRY TO CREATE if we have minimum info
      if (property && dates.length >= 2 && price) {
        try {
          const startDate = dates[0];
          const endDate = dates[1];
          
          // Check for conflicts
          const conflicts = rentals.filter(r => {
            if (r.logement_id !== property.id || r.status === 'ended') return false;
            const rStart = new Date(r.start_date);
            const rEnd = new Date(r.end_date);
            const newStart = new Date(startDate);
            const newEnd = new Date(endDate);
            return (newStart <= rEnd) && (newEnd >= rStart);
          });

          if (conflicts.length > 0) {
            return {
              response: `⚠️ **Dates occupées!**\n${conflicts[0].tenant_name} habite déjà du ${new Date(conflicts[0].start_date).toLocaleDateString('fr-FR')} au ${new Date(conflicts[0].end_date).toLocaleDateString('fr-FR')}.`,
              category: 'Locations'
            };
          }

          addRental({
            logement_id: property.id,
            tenant_name: 'À renseigner',
            email: '',
            phone: '',
            start_date: startDate,
            end_date: endDate,
            monthly_price: price,
            status: 'active'
          });

          const duration = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
          const revenue = Math.round((duration / 30) * price);

          return {
            response: `✅ **Location créée!**\n🏠 ${property.name}\n📅 ${new Date(startDate).toLocaleDateString('fr-FR')} → ${new Date(endDate).toLocaleDateString('fr-FR')}\n💰 ${price}€/mois (~${revenue}€ total)`,
            category: 'Locations'
          };
        } catch (error) {
          return {
            response: `❌ Erreur: ${error instanceof Error ? error.message : 'Erreur création'}`,
            category: 'Locations'
          };
        }
      }
      
      // SHOW WHAT'S MISSING
      const missing = [];
      if (!property) missing.push('logement (ex: "Appart 1A")');
      if (dates.length < 2) missing.push('dates (ex: "du 15 avril au 30 juin")');
      if (!price) missing.push('prix (ex: "1200€")');
      
      return {
        response: `ℹ️ Manque: ${missing.join(', ')}\n\n💡 Exemple: "Ajoute location appart 1A du 15/04 au 30/06 pour 1200€"`,
        category: 'Locations'
      };
    }

    // ==========================================
    // 2. CREATE PROPERTY - ULTRA FLEXIBLE
    // ==========================================
    const isPropertyCreation = /crée|creer|ajoute|ajouter|nouveau|nouvelle|logement|propriété|bien|appartement|maison/i.test(query) && 
                                /logement|propriété|bien|appartement|maison|adresse|rue|avenue|boulevard/i.test(query);
    
    if (isPropertyCreation && !(isRentalCreation)) {
      let address = null;
      const price = extractPrice(query);
      
      // Extract address - très flexible
      const addressMatch = query.match(/(?:à|au|en|rue|avenue|boulevard|place|chez|adresse|localisation)[\s:]*([^€\n]+?)(?:\s+pour|\s*€|$)/i);
      if (addressMatch) {
        address = addressMatch[1].trim();
      }
      
      if (address && price) {
        const exists = logements.find(l => l.address.toLowerCase() === address.toLowerCase());
        if (exists) {
          return {
            response: `⚠️ **Logement existe déjà**: ${exists.name} à ${exists.address}`,
            category: 'Logements'
          };
        }

        addLogement({
          name: address.split(',')[0],
          address: address,
          postal_code: null,
          type: 'appartement',
          rooms: 2,
          price: price,
          description: 'Créé via Assistant',
          location_type: 'longterm',
          rent_without_charges: price,
          monthly_charges: null,
          surface: null,
          deposit_guarantee: null,
          heating: null,
          water: null,
          internet: false,
          parking: false,
          furnished: false,
          notes: null,
          price_per_night: null,
          cleaning_fees: null,
          concierge_commission: null,
          check_in_type: null,
          key_location: null,
          building_code: null,
          wifi_code: null,
          water_meter_location: null,
          electricity_meter_location: null,
          garbage_info: null,
          specific_equipment: null,
          cleaning_checklist: null,
          linage_storage: null,
        });

        return {
          response: `✅ **Logement créé!**\n🏠 ${address}\n💵 ${price}€/mois\n\n📝 Modifiez les détails dans la section Logement.`,
          category: 'Logements'
        };
      }
      
      return {
        response: `ℹ️ Manque: ${!address ? 'adresse' : ''} ${!price ? 'prix' : ''}\n\n💡 Exemple: "Ajoute logement au 15 rue Dupont pour 850€"`,
        category: 'Logements'
      };
    }

    // ==========================================
    // 3. STATISTICS QUERIES
    // ==========================================
    if (/combien|nombre|total|statistique|stats|qu'est|ca va|ça va|situation|status|état/i.test(query)) {
      const activeRentals = rentals.filter(r => r.status === 'active');
      const totalMonthly = activeRentals.reduce((sum, r) => sum + (r.monthly_price ?? 0), 0);
      const occupancyRate = logements.length > 0 ? Math.round((activeRentals.length / logements.length) * 100) : 0;

      let response = `📊 **Vue d'ensemble**\n`;
      response += `🏠 Logements: ${logements.length}\n`;
      response += `👥 Locations actives: ${activeRentals.length}\n`;
      response += `💰 Revenu mensuel: ${totalMonthly}€\n`;
      response += `📈 Occupation: ${occupancyRate}%`;

      return {
        response: response,
        category: 'Statistiques'
      };
    }

    // ==========================================
    // 4. FINANCE QUERIES
    // ==========================================
    if (/revenu|gain|income|prix|tarif|coût|combien.*gagne|€|euros|finance|argent|cash|bénéfice|profit/i.test(query)) {
      const activeRentals = rentals.filter(r => r.status === 'active');
      const totalMonthly = activeRentals.reduce((sum, r) => sum + (r.monthly_price ?? 0), 0);
      const totalYearly = totalMonthly * 12;

      let response = `💰 **Finances**\n`;
      response += `Revenu mensuel: ${totalMonthly}€\n`;
      response += `Revenu annuel: ${totalYearly}€\n`;
      response += `Locations: ${activeRentals.length}`;

      if (activeRentals.length > 0) {
        const avgPrice = Math.round(totalMonthly / activeRentals.length);
        response += `\nMoyenne: ${avgPrice}€/mois`;
      }

      return {
        response: response,
        category: 'Finance'
      };
    }

    // ==========================================
    // 5. TENANTS QUERIES
    // ==========================================
    if (/locataire|tenant|qui|habitant|occupant|résident|habite|loge|logé/i.test(query)) {
      const activeRentals = rentals.filter(r => r.status === 'active');
      
      if (activeRentals.length === 0) {
        return {
          response: `👥 **Aucun locataire actif** pour l'instant.`,
          category: 'Locataires'
        };
      }

      let response = `👥 **${activeRentals.length} locataire${activeRentals.length > 1 ? 's' : ''} actif${activeRentals.length > 1 ? 's' : ''}**\n\n`;
      activeRentals.forEach(r => {
        const logement = logements.find(l => l.id === r.logement_id);
        const daysLeft = Math.ceil((new Date(r.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        response += `• **À renseigner** → ${logement?.name || 'Logement'}\n  ${r.monthly_price}€/mois • J+${daysLeft}\n`;
      });

      return {
        response: response.trim(),
        category: 'Locataires'
      };
    }

    // ==========================================
    // 6. PROPERTY DETAILS
    // ==========================================
    if (/détail|info|spécification|caractéristique|chauffage|eau|internet|parking|meublé|pièce|type/i.test(query)) {
      let prop = findPropertyByName(query);
      if (!prop && logements.length > 0) {
        prop = logements[0];
      }

      if (prop) {
        const activeCount = rentals.filter(r => r.logement_id === prop.id && r.status === 'active').length;
        let response = `🏠 **${prop.name}**\n`;
        response += `📍 ${prop.address}\n`;
        response += `🛏️ ${prop.rooms} pièces • ${prop.type}\n`;
        response += `💵 ${prop.price}€\n\n`;
        response += `🔥 Chauffage: ${prop.heating || 'Non renseigné'}\n`;
        response += `💧 Eau: ${prop.water || 'Non renseignée'}\n`;
        response += `📡 Internet: ${prop.internet ? '✓' : '✗'}\n`;
        response += `🅿️ Parking: ${prop.parking ? '✓' : '✗'}\n`;
        response += `👥 Occupants: ${activeCount}`;

        return {
          response: response,
          category: 'Logements'
        };
      }
    }

    // ==========================================
    // 7. LIST ALL PROPERTIES
    // ==========================================
    if (/liste|portefeuille|propriété|bien|logement|tous|all|mon.*immobilier|ma.*collection/i.test(query)) {
      if (logements.length === 0) {
        return {
          response: `📭 **Aucun logement** enregistré pour le moment.`,
          category: 'Logements'
        };
      }

      let response = `🏠 **${logements.length} logement${logements.length > 1 ? 's' : ''}**\n\n`;
      logements.forEach(l => {
        const activeCount = rentals.filter(r => r.logement_id === l.id && r.status === 'active').length;
        response += `• **${l.name}**\n  ${l.address} • ${l.rooms} pièces • ${l.price}€ • ${activeCount} location${activeCount === 1 ? '' : 's'}\n`;
      });

      return {
        response: response.trim(),
        category: 'Logements'
      };
    }

    // ==========================================
    // 8. SEARCH BY NAME
    // ==========================================
    const searchMatch = rentals.filter(r => 
      r.tenant_name.toLowerCase().includes(q) ||
      (r.email?.toLowerCase().includes(q) ?? false)
    );

    if (searchMatch.length > 0) {
      let response = `🔍 **${searchMatch.length} résultat${searchMatch.length > 1 ? 's' : ''}**\n\n`;
      searchMatch.forEach(r => {
        const logement = logements.find(l => l.id === r.logement_id);
        response += `• ${r.tenant_name} → ${logement?.name}\n`;
      });
      return {
        response: response.trim(),
        category: 'Recherche'
      };
    }

    // ==========================================
    // 9. DEFAULT HELP
    // ==========================================
    return {
      response: `🤖 **Essayez:**\n\n**Créer**\n• "Ajoute location appart 1A du 15/04 au 30/06 pour 1200€"\n• "Nouveau logement rue Dupont 850€"\n\n**Consulter**\n• "Combien je gagne?"\n• "Qui habite?"\n• "Liste des logements"\n• "Détails [logement]"\n\n💡 Posez n'importe quelle question, liez les données!`,
      category: 'Aide'
    };
  };

  // ─── Document import helpers ──────────────────────────────────────
  const extractPdfText = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let raw = '';
    for (let i = 0; i < bytes.length; i++) raw += String.fromCharCode(bytes[i]);
    const blocks: string[] = [];
    const btRe = /BT([\s\S]*?)ET/g;
    let m: RegExpExecArray | null;
    while ((m = btRe.exec(raw)) !== null) {
      const strs = (m[1].match(/\(([^)]*)\)/g) || [])
        .map(s => s.slice(1, -1))
        .join(' ')
        .replace(/\\n/g, '\n')
        .replace(/[^\x20-\x7E\n]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (strs) blocks.push(strs);
    }
    return blocks.join('\n').substring(0, 8000);
  };

  const handleAnalyze = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadError('');
    setExtractedFields(null);
    setApplySuccess(false);
    try {
      const isImage = uploadFile.type.startsWith('image/');
      const isPdf = uploadFile.type === 'application/pdf';
      let body: Record<string, unknown>;
      if (isImage) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(uploadFile);
        });
        body = { base64, mimeType: uploadFile.type, docType };
      } else if (isPdf) {
        const buffer = await uploadFile.arrayBuffer();
        const extractedText = extractPdfText(buffer);
        if (!extractedText.trim()) {
          setUploadError('Impossible de lire ce PDF. Essayez de le convertir en image (JPG/PNG).');
          setUploading(false);
          return;
        }
        body = { extractedText, mimeType: uploadFile.type, docType };
      } else {
        setUploadError('Format non supporté. Utilisez JPG, PNG, WEBP ou PDF.');
        setUploading(false);
        return;
      }
      const res = await fetch('/api/analyze-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'analyse');
      setExtractedFields(data.fields ?? {});
      setEditedFields(data.fields ?? {});
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setUploading(false);
    }
  };

  const handleApply = async () => {
    if (!extractedFields || !selectedLogementId) return;
    try {
      await updateLogement(Number(selectedLogementId), editedFields as unknown as Partial<Logement>);
      setApplySuccess(true);
      setTimeout(() => setApplySuccess(false), 4000);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    try {
      // Use DeepSeek AI via API
      const result = await callOpenAI(input);
      
      const newMessage: Message = {
        id: Date.now(),
        question: input,
        response: result.response,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        category: result.category
      };

      setMessages([newMessage, ...messages]);
      setInput('');
    } catch (error) {
      console.error('Error:', error);
      const newMessage: Message = {
        id: Date.now(),
        question: input,
        response: '❌ Erreur de communication. Réessayez!',
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        category: 'Erreur'
      };
      setMessages([newMessage, ...messages]);
      setInput('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMessage = (id: number) => {
    setMessages(messages.filter(m => m.id !== id));
  };

  return (
    <div className="section">
      <div className="header">
        <h1>Assistant IA</h1>
        <p>Posez vos questions sur vos locations et logements</p>
      </div>

      <div className="doc-tab-bar">
        <button
          className={`doc-tab-btn${activeTab === 'chat' ? ' active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <i className="fas fa-comments"></i> Chat IA
        </button>
        <button
          className={`doc-tab-btn${activeTab === 'import' ? ' active' : ''}`}
          onClick={() => { setActiveTab('import'); setExtractedFields(null); setUploadError(''); setApplySuccess(false); }}
        >
          <i className="fas fa-file-upload"></i> Importer un document
        </button>
      </div>

      {activeTab === 'chat' && (
      <div className="content-card">
        <div className="demand-chat">
          {/* CHAT HISTORY */}
          <div className="chat-history">
            {messages.length === 0 ? (
              <div className="empty-chat">
                <i className="fas fa-comments"></i>
                <p>Commencez une conversation...</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="chat-message">
                  <div className="message-bubble user-message">
                    <strong>Vous:</strong> {msg.question}
                  </div>
                  <div className="message-bubble ai-message">
                    <strong>IA:</strong> {msg.response}
                    <div className="message-footer">
                      <span className="badge">{msg.category}</span>
                      <span className="time">{msg.timestamp}</span>
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="btn-delete-msg"
                        title="Supprimer"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* INPUT */}
          <div className="chat-input-section">
            <div className="input-wrapper">
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handleSend();
                  }
                }}
                placeholder="Poser une question... (Ctrl+Entrée pour envoyer)"
                rows={3}
                disabled={isLoading}
                className="chat-textarea"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="btn btn-primary"
              >
                {isLoading ? (
                  <>
                    <span className="spinner-small"></span>
                    <span>Recherche...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane"></i>
                    <span>Envoyer</span>
                  </>
                )}
              </button>
            </div>
            
            <div className="quick-info">
              <div className="info-stat">
                <span>{logements.length}</span>
                <small>Logements</small>
              </div>
              <div className="info-stat">
                <span>{rentals.length}</span>
                <small>Locations</small>
              </div>
              <div className="info-stat">
                <span>{rentals.filter(r => r.status === 'active').length}</span>
                <small>Actives</small>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {activeTab === 'import' && (
        <div className="content-card">
          <div className="doc-import">

            <div className="import-step">
              <label className="drop-zone" htmlFor="doc-file-input">
                {uploadFile ? (
                  <div className="file-selected">
                    <i className="fas fa-file-alt"></i>
                    <span>{uploadFile.name}</span>
                    <small>{(uploadFile.size / 1024).toFixed(0)} Ko</small>
                  </div>
                ) : (
                  <>
                    <i className="fas fa-cloud-upload-alt"></i>
                    <span>Glissez un fichier ici ou cliquez pour sélectionner</span>
                    <small>JPG, PNG, WEBP ou PDF &bull; Annonces, factures, contrats, welcome book&hellip;</small>
                  </>
                )}
              </label>
              <input
                id="doc-file-input"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0] ?? null;
                  if (f) { setUploadFile(f); setExtractedFields(null); setUploadError(''); setApplySuccess(false); }
                }}
              />
            </div>

            <div className="import-step import-selectors">
              <div className="import-field">
                <label>Type de document</label>
                <select value={docType} onChange={e => setDocType(e.target.value)} className="import-select">
                  <option value="annonce">📢 Annonce plateforme (Airbnb, Booking…)</option>
                  <option value="welcome_book">📖 Manuel de maison / Welcome Book</option>
                  <option value="facture">🧾 Factures services (eau, élec, internet)</option>
                  <option value="contrat_gestion">📄 Contrat de gestion</option>
                  <option value="etat_lieux">🔍 État des lieux</option>
                </select>
              </div>
              <div className="import-field">
                <label>Logement à remplir</label>
                <select
                  value={selectedLogementId}
                  onChange={e => setSelectedLogementId(e.target.value ? Number(e.target.value) : '')}
                  className="import-select"
                >
                  <option value="">— Sélectionner un logement —</option>
                  {logements.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              className="btn btn-primary import-btn"
              onClick={handleAnalyze}
              disabled={!uploadFile || uploading}
            >
              {uploading ? (
                <><span className="spinner-small"></span> Analyse en cours&hellip;</>
              ) : (
                <><i className="fas fa-magic"></i> Analyser avec l&apos;IA</>
              )}
            </button>

            {uploadError && (
              <div className="import-error">
                <i className="fas fa-exclamation-circle"></i> {uploadError}
              </div>
            )}

            {extractedFields && Object.keys(extractedFields).length > 0 && (
              <div className="extracted-fields">
                <h3><i className="fas fa-check-circle"></i> Données extraites — vérifiez et modifiez si nécessaire</h3>
                <div className="fields-grid">
                  {Object.entries(editedFields).map(([key, value]) => (
                    <div key={key} className="field-item">
                      <label>{FIELD_LABELS[key] ?? key}</label>
                      <textarea
                        value={String(value)}
                        onChange={e => setEditedFields(prev => ({ ...prev, [key]: e.target.value }))}
                        rows={String(value).length > 80 ? 3 : 1}
                        className="field-input"
                      />
                    </div>
                  ))}
                </div>
                <div className="apply-row">
                  <button
                    className="btn btn-success apply-btn"
                    onClick={handleApply}
                    disabled={!selectedLogementId}
                  >
                    <i className="fas fa-check"></i> Appliquer au logement
                  </button>
                  {!selectedLogementId && (
                    <small className="apply-hint">Sélectionnez un logement dans la liste ci-dessus</small>
                  )}
                </div>
              </div>
            )}

            {extractedFields && Object.keys(extractedFields).length === 0 && (
              <div className="import-error">
                <i className="fas fa-exclamation-triangle"></i> Aucune donnée extraite. Vérifiez la qualité du document.
              </div>
            )}

            {applySuccess && (
              <div className="import-success">
                <i className="fas fa-check-circle"></i> Le logement a bien été mis à jour avec succès !
              </div>
            )}

          </div>
        </div>
      )}

      <style jsx>{`
        .demand-chat {
          display: flex;
          flex-direction: column;
          height: 600px;
          gap: 15px;
        }

        .chat-history {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 15px;
          padding-right: 8px;
        }

        .chat-history::-webkit-scrollbar {
          width: 6px;
        }

        .chat-history::-webkit-scrollbar-track {
          background: #f0f0f0;
          border-radius: 10px;
        }

        .chat-history::-webkit-scrollbar-thumb {
          background: #2c5aa0;
          border-radius: 10px;
        }

        .empty-chat {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #999;
        }

        .empty-chat i {
          font-size: 48px;
          margin-bottom: 15px;
          color: #d9d9d9;
        }

        .empty-chat p {
          font-size: 14px;
        }

        .chat-message {
          display: flex;
          flex-direction: column;
          gap: 8px;
          animation: messageSlide 0.3s ease-in;
        }

        @keyframes messageSlide {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .message-bubble {
          padding: 12px 15px;
          border-radius: 8px;
          font-size: 14px;
          line-height: 1.5;
          max-width: 80%;
          word-wrap: break-word;
        }

        .user-message {
          background: #2c5aa0;
          color: white;
          margin-left: auto;
          border-bottom-right-radius: 2px;
        }

        .user-message strong {
          display: block;
          font-size: 12px;
          opacity: 0.8;
          margin-bottom: 4px;
        }

        .ai-message {
          background: #f0f0f0;
          color: #333;
          margin-right: auto;
          border-bottom-left-radius: 2px;
        }

        .ai-message strong {
          display: block;
          font-size: 12px;
          color: #2c5aa0;
          margin-bottom: 4px;
        }

        .ai-message p {
          margin: 0;
          white-space: pre-wrap;
        }

        .message-footer {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 8px;
          font-size: 11px;
        }

        .badge {
          background: #2c5aa0;
          color: white;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .time {
          color: #999;
        }

        .btn-delete-msg {
          background: none;
          border: none;
          color: #c62828;
          cursor: pointer;
          font-size: 12px;
          padding: 0;
          transition: all 0.2s;
        }

        .btn-delete-msg:hover {
          color: #990000;
          transform: scale(1.1);
        }

        .chat-input-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-top: 15px;
          border-top: 1px solid #e0e0e0;
        }

        .input-wrapper {
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }

        .chat-textarea {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid #d9d9d9;
          border-radius: 8px;
          font-family: inherit;
          font-size: 14px;
          resize: vertical;
          transition: all 0.3s;
        }

        .chat-textarea:focus {
          outline: none;
          border-color: #2c5aa0;
          box-shadow: 0 0 0 3px rgba(44, 90, 160, 0.1);
        }

        .chat-textarea:disabled {
          background: #f5f5f5;
          color: #999;
        }

        .btn.btn-primary {
          padding: 10px 20px;
          height: fit-content;
          margin-top: 2px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .spinner-small {
          display: inline-block;
          width: 12px;
          height: 12px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .quick-info {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .info-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 10px;
          background: #f9f9f9;
          border-radius: 6px;
          text-align: center;
        }

        .info-stat span {
          font-size: 18px;
          font-weight: 700;
          color: #2c5aa0;
        }

        .info-stat small {
          font-size: 11px;
          color: #999;
          text-transform: uppercase;
          margin-top: 3px;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .demand-chat {
            height: auto;
          }

          .chat-history {
            min-height: 300px;
          }

          .message-bubble {
            max-width: 95%;
          }

          .input-wrapper {
            flex-direction: column;
          }

          .btn.btn-primary {
            width: 100%;
            justify-content: center;
            margin-top: 0;
          }
        }

        /* ─── Document Import Tab ─────────────────────────────── */
        .doc-tab-bar {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .doc-tab-btn {
          padding: 8px 20px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          color: #666;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .doc-tab-btn:hover {
          border-color: #2c5aa0;
          color: #2c5aa0;
        }

        .doc-tab-btn.active {
          background: #2c5aa0;
          border-color: #2c5aa0;
          color: white;
        }

        .doc-import {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .drop-zone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border: 2px dashed #c0c8d8;
          border-radius: 12px;
          padding: 40px 20px;
          cursor: pointer;
          transition: all 0.2s;
          color: #888;
          text-align: center;
          background: #fafbff;
        }

        .drop-zone:hover {
          border-color: #2c5aa0;
          color: #2c5aa0;
          background: #f0f5ff;
        }

        .drop-zone i {
          font-size: 36px;
        }

        .drop-zone small {
          font-size: 12px;
          opacity: 0.7;
        }

        .file-selected {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          color: #2c5aa0;
        }

        .file-selected i { font-size: 32px; }
        .file-selected span { font-weight: 600; font-size: 15px; }
        .file-selected small { color: #888; font-size: 12px; }

        .import-selectors {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .import-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .import-field label {
          font-size: 13px;
          font-weight: 600;
          color: #555;
        }

        .import-select {
          padding: 9px 12px;
          border: 1px solid #d9d9d9;
          border-radius: 8px;
          font-size: 14px;
          background: white;
          cursor: pointer;
        }

        .import-select:focus {
          outline: none;
          border-color: #2c5aa0;
          box-shadow: 0 0 0 3px rgba(44, 90, 160, 0.1);
        }

        .import-btn {
          align-self: flex-start;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .import-error {
          padding: 12px 16px;
          background: #fff5f5;
          border: 1px solid #ffcdd2;
          border-radius: 8px;
          color: #c62828;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .import-success {
          padding: 12px 16px;
          background: #f0fff4;
          border: 1px solid #a5d6a7;
          border-radius: 8px;
          color: #2e7d32;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .extracted-fields {
          background: #f8f9ff;
          border: 1px solid #dce4ff;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .extracted-fields h3 {
          font-size: 15px;
          font-weight: 700;
          color: #2c5aa0;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }

        .fields-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .field-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .field-item label {
          font-size: 12px;
          font-weight: 600;
          color: #556;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .field-input {
          padding: 7px 10px;
          border: 1px solid #d0d8f0;
          border-radius: 6px;
          font-size: 13px;
          font-family: inherit;
          resize: vertical;
          background: white;
          min-height: 32px;
        }

        .field-input:focus {
          outline: none;
          border-color: #2c5aa0;
          box-shadow: 0 0 0 2px rgba(44, 90, 160, 0.1);
        }

        .apply-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .apply-btn {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .apply-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .apply-hint {
          font-size: 12px;
          color: #888;
        }

        .btn-success {
          background: #2e7d32;
          color: white;
          border: 2px solid #2e7d32;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn-success:hover:not(:disabled) {
          background: #1b5e20;
          border-color: #1b5e20;
        }

        @media (max-width: 768px) {
          .import-selectors { grid-template-columns: 1fr; }
          .fields-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
