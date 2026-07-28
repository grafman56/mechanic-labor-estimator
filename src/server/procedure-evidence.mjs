import { findExactOperationLinks, validateManualUrl } from './manual-lookup.mjs';
import { TIER1_JOB_ALIASES } from './live-job-rows.mjs';

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_CONTEXT_STEPS = 24;
const MDX_MANUAL_URL = 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/';
const MDX_VALVE_COVER_URL = `${MDX_MANUAL_URL}Parts%20and%20Labor/Engine%2C%20Cooling%20and%20Exhaust/Engine/Valve%20Cover%20Gasket/`;
const MDX_WATER_PUMP_URL = `${MDX_MANUAL_URL}Parts%20and%20Labor/Engine%2C%20Cooling%20and%20Exhaust/Engine/Water%20Pump/`;
const CURATED_PROCEDURES = new Map([
  [`${MDX_MANUAL_URL}|valve-cover-gasket|${MDX_VALVE_COVER_URL}`, {
    evidenceUrl: `${MDX_MANUAL_URL}Repair%20and%20Diagnosis/Engine%2C%20Cooling%20and%20Exhaust/Engine/Cylinder%20Head%20Assembly/Valve%20Cover/Service%20and%20Repair/Cylinder%20Head%20Cover%20Installation/`,
    contextUrls: [
      `${MDX_MANUAL_URL}Repair%20and%20Diagnosis/Engine%2C%20Cooling%20and%20Exhaust/Engine/Cylinder%20Head%20Assembly/Valve%20Cover/Service%20and%20Repair/Cylinder%20Head%20Cover%20Removal/`,
      `${MDX_MANUAL_URL}Repair%20and%20Diagnosis/Engine%2C%20Cooling%20and%20Exhaust/Engine/Cylinder%20Head%20Assembly/Valve%20Cover/Service%20and%20Repair/Cylinder%20Head%20Cover%20Installation/`,
    ],
    keywords: [['remove', 'intake manifold'], ['remove', 'six ignition coils'], ['install', 'six ignition coils'], ['install', 'intake manifold']],
  }],
  [`${MDX_MANUAL_URL}|water-pump|${MDX_WATER_PUMP_URL}`, {
    evidenceUrl: `${MDX_MANUAL_URL}Repair%20and%20Diagnosis/Engine%2C%20Cooling%20and%20Exhaust/Engine/Water%20Pump/Service%20and%20Repair/Water%20Pump%20Replacement/`,
    contextUrls: [`${MDX_MANUAL_URL}Repair%20and%20Diagnosis/Engine%2C%20Cooling%20and%20Exhaust/Engine/Water%20Pump/Service%20and%20Repair/Water%20Pump%20Replacement/`],
    keywords: [['drain', 'engine coolant'], ['remove', 'timing belt'], ['remove', 'timing belt adjuster'], ['remove', 'water pump']],
  }],
]);

async function defaultRequestText(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'MechanicLaborPlanner/0.1 personal-use lookup' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Source request failed with HTTP ${response.status}.`);
  return response.text();
}

function plainText(html) {
  return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+([.,])/g, '$1').replace(/\s+/g, ' ').trim();
}

function sentences(html) {
  return plainText(html).match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
}

function titleCase(value) {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

function extractEvidence(sourceUrl, html) {
  const text = plainText(html);
  const items = [];
  for (const match of text.matchAll(/install the .+? with a new (.+?) in the reverse order of removal\./gi)) {
    items.push({ kind: 'required', label: titleCase(match[1]), reason: match[0], source_url: sourceUrl });
  }
  for (const match of text.matchAll(/(?:visually )?check the (.+?) for damage\. Replace if necessary\./gi)) {
    items.push({ kind: 'replace-if-removed', label: titleCase(match[1]), reason: match[0], source_url: sourceUrl });
  }
  for (const match of text.matchAll(/inspect the (.+?)\. Replace any .+? that is damaged or deteriorated\./gi)) {
    items.push({ kind: 'inspect', label: titleCase(match[1]), reason: match[0], source_url: sourceUrl });
  }
  return items;
}

function contextKind(sentence) {
  const verb = sentence.match(/^(remove|disconnect|release|detach|unfasten|support|lower|drain|evacuate|recover|install|reinstall)\b/i)?.[1].toLocaleLowerCase();
  if (['install', 'reinstall'].includes(verb)) return 'reinstallation';
  if (['drain', 'evacuate', 'recover'].includes(verb)) return 'drain-handling';
  return 'removal-access';
}

function extractContext(sourceUrl, html, keywordRules = null) {
  return sentences(html)
    .filter((sentence) => {
      if (keywordRules) return keywordRules.some((terms) => terms.every((term) => sentence.toLocaleLowerCase().includes(term.toLocaleLowerCase())));
      return /^(remove|disconnect|release|detach|unfasten|support|lower|drain|evacuate|recover|install|reinstall)\b/i.test(sentence);
    })
    .map((reason) => ({ kind: contextKind(reason), reason, source_url: sourceUrl }));
}

function procedureUrls(manualUrl, sourceOperationUrl, html) {
  const operationPath = sourceOperationUrl.slice(manualUrl.length);
  if (!operationPath.startsWith('Parts%20and%20Labor/')) return [];
  const repairUrl = new URL(operationPath.replace('Parts%20and%20Labor/', 'Repair%20and%20Diagnosis/'), manualUrl).href;
  const urls = [];
  for (const match of String(html).matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>/gi)) {
    const url = new URL(match[2], repairUrl);
    const decodedPath = decodeURIComponent(url.pathname).toLocaleLowerCase();
    const leaf = decodeURIComponent(url.pathname.split('/').filter(Boolean).at(-1) ?? '').toLocaleLowerCase();
    if (url.origin !== new URL(repairUrl).origin || !url.pathname.startsWith(new URL(repairUrl).pathname)) continue;
    if (!decodedPath.includes('/service and repair/')) continue;
    if (!['replacement', 'removal and installation', 'remove and install'].some((term) => leaf.includes(term))) continue;
    if (!urls.includes(url.href)) urls.push(url.href);
    if (urls.length === 3) break;
  }
  return { repairUrl, urls };
}

function unavailable(reason) {
  return { status: 'unavailable', reason };
}

export async function lookupJobProcedureEvidence(manualUrlValue, jobId, { source_operation_url: sourceOperationUrl } = {}, { requestText = defaultRequestText } = {}) {
  const manualUrl = validateManualUrl(manualUrlValue);
  if (!manualUrl) throw new Error('Unsupported manual URL');
  const aliases = TIER1_JOB_ALIASES[jobId];
  if (!aliases) throw new Error('Unsupported repair job');
  if (!sourceOperationUrl) return unavailable('An exact selected source operation is required for procedure evidence.');
  const partsLaborUrl = new URL('Parts%20and%20Labor/', manualUrl).href;
  let candidates;
  try {
    candidates = findExactOperationLinks(await requestText(partsLaborUrl), aliases, partsLaborUrl);
  } catch {
    return unavailable('Source Parts and Labor page is unavailable.');
  }
  if (!candidates.some((candidate) => candidate.source_url === sourceOperationUrl)) {
    return unavailable('Selected source operation is unavailable for this manual.');
  }
  const curated = CURATED_PROCEDURES.get(`${manualUrl}|${jobId}|${sourceOperationUrl}`);
  try {
    if (curated) {
      const evidence = extractEvidence(curated.evidenceUrl, await requestText(curated.evidenceUrl));
      const contextSteps = [];
      for (const contextUrl of curated.contextUrls) {
        for (const step of extractContext(contextUrl, await requestText(contextUrl), curated.keywords)) {
          if (!contextSteps.some((existing) => existing.kind === step.kind && existing.reason === step.reason)) contextSteps.push(step);
        }
      }
      if (!evidence.length && !contextSteps.length) return unavailable('No explicit procedure evidence was found.');
      return { status: 'available', items: evidence, ...(contextSteps.length ? { context_steps: contextSteps } : {}) };
    }
    const { repairUrl, urls } = procedureUrls(manualUrl, sourceOperationUrl, await requestText(new URL(sourceOperationUrl.slice(manualUrl.length).replace('Parts%20and%20Labor/', 'Repair%20and%20Diagnosis/'), manualUrl).href));
    if (!urls.length) return unavailable('No matching source repair procedure was found for this exact manual operation.');
    const contextSteps = [];
    for (const url of urls) {
      for (const step of extractContext(url, await requestText(url))) {
        if (!contextSteps.some((existing) => existing.kind === step.kind && existing.reason === step.reason)) contextSteps.push(step);
        if (contextSteps.length === MAX_CONTEXT_STEPS) return { status: 'available', items: [], context_steps: contextSteps };
      }
    }
    return contextSteps.length ? { status: 'available', items: [], context_steps: contextSteps } : unavailable('No matching source repair procedure was found for this exact manual operation.');
  } catch {
    return unavailable('Procedure source page is unavailable.');
  }
}
