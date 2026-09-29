import { safetyAlertSchema, type AffectedArea, type SafetyAlert, type SafetySource } from '@saraya/contracts';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { z } from 'zod';

import { WarningProviderUnavailableError, type WarningProvider } from './warning.provider';

const text = z.union([z.string(), z.number()]).transform(String);
const capAreaSchema = z.object({
  areaDesc: text,
  polygon: z.union([text, z.array(text)]).optional(),
  geocode: z.union([
    z.object({ valueName: text, value: text }),
    z.array(z.object({ valueName: text, value: text })),
  ]).optional(),
});
const capInfoSchema = z.object({
  language: text.optional(),
  category: z.unknown().optional(),
  event: text,
  severity: z.enum(['Extreme', 'Severe', 'Moderate', 'Minor', 'Unknown']),
  effective: text.optional(),
  onset: text.optional(),
  expires: text.optional(),
  senderName: text.optional(),
  headline: text.optional(),
  description: text,
  instruction: text.optional(),
  area: z.union([capAreaSchema, z.array(capAreaSchema)]),
});
const capAlertSchema = z.object({
  identifier: text,
  sender: text,
  sent: text,
  status: z.enum(['Actual', 'Exercise', 'System', 'Test', 'Draft']),
  msgType: z.enum(['Alert', 'Update', 'Cancel', 'Ack', 'Error']),
  scope: z.enum(['Public', 'Restricted', 'Private']),
  info: z.union([capInfoSchema, z.array(capInfoSchema)]),
});

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', removeNSPrefix: true });
const array = <T>(value: T | T[] | undefined): T[] => value === undefined ? [] : Array.isArray(value) ? value : [value];
const maximumFeedBytes = 2_000_000;
const maximumFeedEntries = 200;

function parsePolygon(value: string): [number, number][] | null {
  const positions = value.trim().split(/\s+/).map((pair) => {
    const [latitude, longitude] = pair.split(',').map(Number);
    return Number.isFinite(latitude) && Number.isFinite(longitude)
      ? [longitude!, latitude!] as [number, number]
      : null;
  });
  if (positions.some((position) => position === null) || positions.length < 3) return null;
  const ring = positions as [number, number][];
  const first = ring[0]!;
  const last = ring.at(-1)!;
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);
  return ring.length >= 4 ? ring : null;
}

function regionNames(area: z.infer<typeof capAreaSchema>) {
  const recognized = array(area.geocode)
    .filter(({ valueName }) => /^(region|ph_region|pagasa_region)$/i.test(valueName))
    .map(({ value }) => value.trim())
    .filter(Boolean);
  return recognized.length > 0 ? recognized : [area.areaDesc.trim()];
}

function mapSeverity(severity: z.infer<typeof capInfoSchema>['severity']) {
  if (severity === 'Extreme' || severity === 'Severe') return 'red' as const;
  if (severity === 'Moderate') return 'yellow' as const;
  return 'green' as const;
}

function selectInfo(infos: z.infer<typeof capInfoSchema>[]) {
  return infos.find(({ language }) => !language || /^en([_-]|$)/i.test(language)) ?? infos[0];
}

export function normalizePagasaCapAlert(raw: unknown, sourceUrl?: string): SafetyAlert | null {
  const alert = capAlertSchema.parse(raw);
  if (alert.status !== 'Actual' || alert.scope !== 'Public' || alert.msgType === 'Cancel') return null;
  const info = selectInfo(array(alert.info));
  if (!info) return null;
  const areas = array(info.area);
  const polygons = areas.flatMap(({ polygon }) => array(polygon).map(parsePolygon).filter((ring): ring is [number, number][] => Boolean(ring)));
  const affectedArea: AffectedArea | undefined = polygons.length > 0
    ? { type: 'MultiPolygon', coordinates: polygons.map((ring) => [ring]) }
    : undefined;
  const startsAt = info.onset ?? info.effective ?? alert.sent;
  const instruction = info.instruction?.trim() || info.description.trim();
  return safetyAlertSchema.parse({
    id: `pagasa-cap:${alert.identifier}`,
    alertType: 'weather',
    severity: mapSeverity(info.severity),
    title: info.headline?.trim() || info.event.trim(),
    summary: info.headline?.trim() || info.event.trim(),
    details: info.description.trim(),
    advice: [instruction],
    alternatives: [],
    affectedRegions: [...new Set(areas.flatMap(regionNames))],
    affectedAreaDescription: areas.map(({ areaDesc }) => areaDesc.trim()).join('; '),
    ...(affectedArea ? { affectedArea } : {}),
    startsAt: new Date(startsAt).toISOString(),
    endsAt: info.expires ? new Date(info.expires).toISOString() : null,
    source: {
      provider: 'pagasa-cap',
      name: info.senderName?.trim() || 'DOST-PAGASA',
      ...(sourceUrl ? { url: sourceUrl } : {}),
      isDemo: false,
    },
    createdAt: new Date(alert.sent).toISOString(),
    updatedAt: new Date(alert.sent).toISOString(),
  });
}

function linkUrls(entry: Record<string, unknown>) {
  return array(entry.link as Record<string, unknown> | Record<string, unknown>[] | undefined)
    .map((link) => typeof link.href === 'string' ? link.href : '')
    .filter(Boolean);
}

export class PagasaCapWarningProvider implements WarningProvider {
  readonly source: SafetySource;

  constructor(
    private readonly feedUrl: string,
    private readonly timeoutMs = 10_000,
    private readonly fetcher: typeof fetch = fetch,
  ) {
    this.source = { provider: 'pagasa-cap', name: 'DOST-PAGASA CAP feed', url: feedUrl, isDemo: false };
  }

  async getActiveWarnings(): Promise<SafetyAlert[]> {
    try {
      const feedXml = await this.fetchXml(this.feedUrl);
      const parsed = parser.parse(feedXml) as Record<string, unknown>;
      if (parsed.alert) return [normalizePagasaCapAlert(parsed.alert, this.feedUrl)].filter(Boolean) as SafetyAlert[];
      const feed = parsed.feed as Record<string, unknown> | undefined;
      if (!feed) throw new Error('Expected a CAP alert or Atom feed.');
      const entries = array(feed.entry as Record<string, unknown> | Record<string, unknown>[] | undefined);
      if (entries.length > maximumFeedEntries) throw new Error('CAP feed exceeds the supported entry limit.');
      const results: SafetyAlert[] = [];
      for (const entry of entries) {
        const embedded = entry.alert ?? (entry.content as Record<string, unknown> | undefined)?.alert;
        if (embedded) {
          const normalized = normalizePagasaCapAlert(embedded, this.feedUrl);
          if (normalized) results.push(normalized);
          continue;
        }
        const href = linkUrls(entry).find((url) => this.isAllowedAlertUrl(url));
        if (!href) continue;
        const resolvedHref = new URL(href, this.feedUrl).toString();
        const alertXml = await this.fetchXml(resolvedHref);
        const alertDocument = parser.parse(alertXml) as Record<string, unknown>;
        const normalized = normalizePagasaCapAlert(alertDocument.alert, resolvedHref);
        if (normalized) results.push(normalized);
      }
      return [...new Map(results.map((alert) => [alert.id, alert])).values()];
    } catch (error) {
      if (error instanceof WarningProviderUnavailableError) throw error;
      throw new WarningProviderUnavailableError('The PAGASA CAP warning feed is unavailable or malformed.');
    }
  }

  private isAllowedAlertUrl(value: string) {
    try {
      const url = new URL(value, this.feedUrl);
      const feed = new URL(this.feedUrl);
      return url.protocol === 'https:' && url.hostname === feed.hostname;
    } catch {
      return false;
    }
  }

  private async fetchXml(url: string) {
    const response = await this.fetcher(url, {
      headers: { Accept: 'application/atom+xml, application/cap+xml, application/xml, text/xml' },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) throw new Error(`Warning provider returned HTTP ${response.status}.`);
    const xml = await response.text();
    if (Buffer.byteLength(xml, 'utf8') > maximumFeedBytes) throw new Error('Warning provider response is too large.');
    if (/<!DOCTYPE/i.test(xml)) throw new Error('Warning provider response contains a forbidden document type.');
    if (XMLValidator.validate(xml) !== true) throw new Error('Warning provider returned invalid XML.');
    return xml;
  }
}
