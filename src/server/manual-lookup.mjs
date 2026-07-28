const MANUAL_HOST = 'lemon-manuals.la';
const REQUEST_TIMEOUT_MS = 30_000;

export function validateManualUrl(value) {
  if (typeof value !== 'string' || !value) return null;
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.hostname !== MANUAL_HOST || url.username || url.password || url.search || url.hash) return null;
  if (url.href !== value) return null;
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length !== 3 || !/^\d{4}$/.test(segments[1]) || !url.pathname.endsWith('/')) return null;
  try {
    if (segments.some((segment) => decodeURIComponent(segment).includes('/'))) return null;
  } catch {
    return null;
  }
  return url.href;
}

function extractTitle(html) {
  return String(html).match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1].replace(/\s+/g, ' ').trim() ?? '';
}

async function defaultRequestText(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'MechanicLaborPlanner/0.1 personal-use lookup' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Source request failed with HTTP ${response.status}.`);
  return response.text();
}

export async function manualMetadata(value, { requestText = defaultRequestText } = {}) {
  const manualUrl = validateManualUrl(value);
  if (!manualUrl) throw new Error('Unsupported manual URL');
  return { source_url: manualUrl, title: extractTitle(await requestText(manualUrl)) };
}

export async function manualAvailability(value, { requestText = defaultRequestText } = {}) {
  const manualUrl = validateManualUrl(value);
  if (!manualUrl) throw new Error('Unsupported manual URL');
  try {
    await requestText(new URL('Parts%20and%20Labor/', manualUrl).href);
    return true;
  } catch {
    return false;
  }
}

function decodeHtml(value) {
  return value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
}

export function findExactOperationLinks(html, aliases, partsLaborUrl) {
  const base = new URL(partsLaborUrl);
  const expected = new Set(aliases.map((alias) => alias.toLocaleLowerCase()));
  const links = [];
  for (const match of String(html).matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi)) {
    const title = decodeHtml(match[3].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
    if (!expected.has(title.toLocaleLowerCase())) continue;
    const sourceUrl = new URL(match[2], base);
    if (sourceUrl.origin !== base.origin || !sourceUrl.pathname.startsWith(base.pathname) || !sourceUrl.pathname.endsWith('/')) continue;
    links.push({ title, source_url: sourceUrl.href });
  }
  return links;
}
