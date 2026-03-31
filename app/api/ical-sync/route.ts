import { NextResponse } from 'next/server';

interface ParsedEvent {
  uid: string;
  summary: string;
  description: string;
  start: string;
  end: string;
}

// ── iCal parser ────────────────────────────────────────────────────────────

function parseIcalDate(s: string): string {
  // 20260101 or 20260101T120000Z → 2026-01-01
  const clean = s.replace('Z', '').split('T')[0];
  if (clean.length === 8) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
  }
  return s;
}

function decodeText(s: string): string {
  return s
    .replace(/\\n/g, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function parseIcal(text: string): ParsedEvent[] {
  // Normalize line endings and unfold folded lines
  const raw = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const unfolded: string[] = [];
  for (const line of raw.split('\n')) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1);
    } else {
      unfolded.push(line);
    }
  }

  const events: ParsedEvent[] = [];
  let inEvent = false;
  let props: Record<string, string> = {};

  for (const line of unfolded) {
    const t = line.trim();
    if (t === 'BEGIN:VEVENT') {
      inEvent = true;
      props = {};
    } else if (t === 'END:VEVENT') {
      if (props.DTSTART && props.DTEND) {
        events.push({
          uid: props.UID || `auto_${Math.random().toString(36).slice(2)}`,
          summary: decodeText(props.SUMMARY || 'Réservation'),
          description: decodeText(props.DESCRIPTION || ''),
          start: parseIcalDate(props.DTSTART),
          end: parseIcalDate(props.DTEND),
        });
      }
      inEvent = false;
    } else if (inEvent) {
      const colonIdx = t.indexOf(':');
      if (colonIdx > 0) {
        const key = t.slice(0, colonIdx).split(';')[0].toUpperCase();
        const val = t.slice(colonIdx + 1);
        props[key] = val;
      }
    }
  }

  return events;
}

// ── SSRF protection ────────────────────────────────────────────────────────

function isPrivateHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(h)) return true;
  const parts = h.split('.').map(Number);
  if (parts.length === 4 && parts.every(p => !isNaN(p))) {
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
  }
  return false;
}

// ── Route ──────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, platform, logementId } = body;

    if (!url || typeof url !== 'string' || !logementId) {
      return NextResponse.json({ error: 'url et logementId sont requis' }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: "URL invalide" }, { status: 400 });
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'Seuls les protocoles http/https sont autorisés' }, { status: 400 });
    }

    if (isPrivateHostname(parsed.hostname)) {
      return NextResponse.json({ error: 'URL invalide' }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: { 'User-Agent': 'SideKick/1.0 Calendar Sync' },
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Erreur HTTP ${response.status} lors de la récupération du calendrier` }, { status: 502 });
    }

    const icalText = await response.text();

    if (!icalText.includes('BEGIN:VCALENDAR')) {
      return NextResponse.json({ error: "L'URL ne pointe pas vers un calendrier iCal valide (.ics)" }, { status: 400 });
    }

    const bookings = parseIcal(icalText);

    return NextResponse.json({
      success: true,
      bookings,
      platform: platform || 'Inconnu',
      logementId,
      syncedAt: new Date().toISOString(),
      total: bookings.length,
    });
  } catch (error: any) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      return NextResponse.json({ error: 'Délai dépassé lors de la récupération du calendrier' }, { status: 504 });
    }
    console.error('iCal sync error:', error);
    return NextResponse.json({ error: 'Erreur lors de la synchronisation' }, { status: 500 });
  }
}
