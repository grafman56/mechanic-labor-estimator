import { findVerifiedVehicle } from './src/mdx.js';
import { findCatalogEntry } from './src/catalog.js';
import { manualSelectionOptions } from './src/catalog-selection.js';
import { tier1Jobs } from './src/tier1-jobs.js';
import { liveEstimateModel, supportsManualEstimate } from './src/live-estimate.js';
import { availableManuals, manualAvailabilityStatus } from './src/manual-availability.js';
import { loadMakeCatalog, loadManualCatalogIndex } from './src/manual-catalog.js';
import { manualOperationOptions } from './src/live-operations.js';
import { sourceScopeOptions } from './src/live-scopes.js';
import { jobAwarenessGroup, procedureContextDisplayGroups } from './src/procedure-evidence.js';
import { fetchProcedureEvidence } from './src/live-procedure-evidence.js';

const vinInput = document.querySelector('#vin');
const rateInput = document.querySelector('#labor-rate');
const estimate = document.querySelector('#estimate');
const catalogMake = document.querySelector('#catalog-make');
const catalogYear = document.querySelector('#catalog-year');
const catalogModel = document.querySelector('#catalog-model');
const catalogEngine = document.querySelector('#catalog-engine');
const catalogStatus = document.querySelector('#catalog-status');
const checkManual = document.querySelector('#check-manual');
const liveJob = document.querySelector('#live-job');
const liveOperation = document.querySelector('#live-operation');
const liveScope = document.querySelector('#live-scope');
const getLiveLabor = document.querySelector('#get-live-labor');
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
let selectedManual = null;
let liveOperations = [];

function renderUnavailable(vin) {
  if (supportsManualEstimate(selectedManual)) {
    estimate.innerHTML = `<div class="estimate-heading"><div><p class="eyebrow">Selected vehicle manual</p><h2>Ready for live labor lookup</h2><p>${selectedManual.year} ${selectedManual.make} ${selectedManual.model} · ${selectedManual.engine}</p></div></div><p class="job-note">VIN is optional here. Select a live repair job and choose Get live labor time to retrieve a source-backed estimate.</p>`;
    return;
  }
  estimate.innerHTML = `<div class="estimate-heading"><div><p class="eyebrow">Vehicle verification required</p><h2>No verified estimate available</h2><p>${vin ? `VIN ${vin.toUpperCase()} has no reviewed vehicle/job records yet.` : 'Enter a 17-character VIN or select a vehicle manual.'}</p></div></div><p class="job-note">This tool does not fall back to generic labor, parts, or access assumptions.</p>`;
}

function fillSelect(select, values) {
  select.replaceChildren(...values.map((value) => new Option(value, value)));
  select.disabled = values.length === 0;
}

function populateLiveRows() {
  const operation = liveOperations.find((candidate) => candidate.source_url === liveOperation.value);
  const rows = operation?.rows ?? [];
  liveScope.replaceChildren(...sourceScopeOptions(rows).map((option) => new Option(option.label, option.value)));
  liveScope.disabled = rows.length <= 1;
  liveScope.dataset.sourceRow = rows.length ? 'true' : '';
}

async function populateLiveScopes() {
  liveOperations = [];
  liveOperation.replaceChildren();
  liveOperation.disabled = true;
  liveScope.replaceChildren();
  liveScope.disabled = true;
  liveScope.dataset.sourceRow = '';
  if (!selectedManual) return;
  try {
    const params = new URLSearchParams({ url: selectedManual.manual_url, job: liveJob.value });
    const response = await fetch(`/api/live-job-rows?${params}`);
    const result = await response.json();
    if (!response.ok || !result.operations?.length) return;
    liveOperations = result.operations;
    liveOperation.replaceChildren(...manualOperationOptions(liveOperations).map((option) => new Option(option.label, option.value)));
    liveOperation.disabled = liveOperations.length <= 1;
    populateLiveRows();
  } catch (_) { /* A selected manual without live source rows has no estimate fallback. */ }
}

function populateLiveJobs() {
  liveJob.replaceChildren(...tier1Jobs.map((job) => new Option(job.label, job.id)));
  liveJob.disabled = false;
  populateLiveScopes();
}

async function loadCatalog() {
  try {
    const fetchJson = async (path) => {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    };
    const catalogIndex = await loadManualCatalogIndex(fetchJson);
    let catalog = [];
    fillSelect(catalogMake, catalogIndex.map((entry) => entry.make));
    const updateEngines = async () => {
      const candidates = catalog.filter((entry) => (
        entry.make === catalogMake.value
        && entry.year === Number(catalogYear.value)
        && entry.model === catalogModel.value
      ));
      catalogEngine.disabled = true;
      catalogStatus.textContent = 'Checking source labor availability…';
      const manuals = await availableManuals(candidates, async (entry) => {
        const response = await fetch(`/api/manual-availability?url=${encodeURIComponent(entry.manual_url)}`);
        return response.ok && (await response.json()).available;
      });
      fillSelect(catalogEngine, manuals.map((entry) => entry.engine));
      catalogEngine.dataset.manuals = JSON.stringify(manuals);
      const entry = findCatalogEntry(manuals, { engine: catalogEngine.value });
      selectedManual = entry;
      vinInput.value = '';
      checkManual.disabled = !entry;
      getLiveLabor.disabled = !entry;
      checkManual.dataset.url = entry?.manual_url ?? '';
      getLiveLabor.dataset.url = entry?.manual_url ?? '';
      populateLiveScopes();
      render();
      catalogStatus.textContent = manualAvailabilityStatus(candidates, manuals);
    };
    const updateModels = async () => {
      const { models } = manualSelectionOptions(catalog, {
        make: catalogMake.value,
        year: Number(catalogYear.value),
      });
      fillSelect(catalogModel, models);
      await updateEngines();
    };
    const updateYears = async () => {
      catalog = await loadMakeCatalog(fetchJson, catalogIndex, catalogMake.value);
      const { years } = manualSelectionOptions(catalog, { make: catalogMake.value });
      fillSelect(catalogYear, years);
      await updateModels();
    };
    catalogMake.addEventListener('change', updateYears);
    catalogYear.addEventListener('change', updateModels);
    catalogModel.addEventListener('change', updateEngines);
    catalogEngine.addEventListener('change', () => {
      selectedManual = findCatalogEntry(JSON.parse(catalogEngine.dataset.manuals || '[]'), { engine: catalogEngine.value });
      checkManual.disabled = !selectedManual;
      getLiveLabor.disabled = !selectedManual;
      checkManual.dataset.url = selectedManual?.manual_url ?? '';
      getLiveLabor.dataset.url = selectedManual?.manual_url ?? '';
      populateLiveScopes();
      render();
    });
    updateYears();
  } catch (error) {
    catalogYear.disabled = true;
    catalogStatus.textContent = 'Manual catalog could not be loaded.';
  }
}

function render() {
  renderUnavailable(vinInput.value.trim());
}

vinInput.addEventListener('input', () => {
  selectedManual = findVerifiedVehicle(vinInput.value);
  populateLiveScopes();
  render();
});
checkManual.addEventListener('click', async () => {
  catalogStatus.textContent = 'Checking live manual…';
  try {
    const response = await fetch(`/api/manual-metadata?url=${encodeURIComponent(checkManual.dataset.url)}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    catalogStatus.innerHTML = `Live LEMON manual found: <a href="${result.source_url}" target="_blank" rel="noreferrer">${result.title}</a>. Estimate coverage is separate.`;
  } catch (error) { catalogStatus.textContent = `Live manual check failed: ${error.message}`; }
});
liveJob.addEventListener('change', populateLiveScopes);
liveOperation.addEventListener('change', populateLiveRows);
getLiveLabor.addEventListener('click', async () => {
  catalogStatus.textContent = 'Looking up published labor time…';
  try {
    const params = new URLSearchParams({
      url: getLiveLabor.dataset.url,
      job: liveJob.value,
      scope: liveScope.dataset.sourceRow ? '' : liveScope.value,
      source_row: liveScope.dataset.sourceRow ? liveScope.value : '',
      source_operation_url: liveScope.dataset.sourceRow ? liveOperation.value : '',
    });
    const response = await fetch(`/api/live-job-labor?${params}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    if (result.status !== 'available') {
      catalogStatus.textContent = `No verified live estimate: ${result.reason}`;
      return;
    }
    const live = liveEstimateModel(result, selectedManual, rateInput.value);
    const evidence = await fetchProcedureEvidence(fetch, {
      url: getLiveLabor.dataset.url,
      job: liveJob.value,
      source_operation_url: liveOperation.value,
    });
    const awareness = jobAwarenessGroup(evidence);
    const contextGroups = awareness?.context ? procedureContextDisplayGroups(awareness.context.items) : [];
    const awarenessHtml = awareness ? `<details class="job-awareness"><summary><span>${awareness.heading}</span><small>${awareness.summary}</small></summary><div class="parts-grid job-awareness-body">${awareness.unavailable ? `<div class="parts-group procedure-unavailable"><h3>Procedure coverage</h3><p>${awareness.unavailable}</p><p><span>Labor availability and procedure awareness are separate source states.</span></p></div>` : `${awareness.evidenceGroups.map((group) => `<div class="parts-group"><h3>${group.heading}</h3><p>${group.items.map((item) => `<a href="${item.source_url}" target="_blank" rel="noreferrer">${item.label}</a><br><span>${item.reason}</span>`).join('<br>')}</p></div>`).join('')}${contextGroups.map((group) => `<div class="parts-group procedure-context"><h3>${group.heading} (${group.total})</h3><p>${group.visibleItems.map((item) => `<a href="${item.source_url}" target="_blank" rel="noreferrer">${item.reason}</a>`).join('<br>')}</p>${group.remainingItems.length ? `<details class="procedure-context-more"><summary>Show ${group.remainingItems.length} remaining source step${group.remainingItems.length === 1 ? '' : 's'}</summary><p>${group.remainingItems.map((item) => `<a href="${item.source_url}" target="_blank" rel="noreferrer">${item.reason}</a>`).join('<br>')}</p></details>` : ''}</div>`).join('')}${awareness.context ? `<div class="parts-group procedure-context-note"><p><span>${awareness.context.note}</span></p></div>` : ''}`}</div></details>` : '';
    const price = live.laborCost === null ? '' : ` · ${currency.format(live.laborCost)}`;
    catalogStatus.innerHTML = `Live source match: <a href="${live.sourceUrl}" target="_blank" rel="noreferrer">${live.operation} labor time</a> — ${live.laborHours} standard hr${price}.`;
    estimate.innerHTML = `<div class="estimate-heading"><div><p class="eyebrow">Selected vehicle and live source</p><h2>${live.operation}</h2><p>${live.vehicle}</p></div><div class="total"><span>Published baseline labor</span><strong>${live.laborHours} hr${price}</strong></div></div><div class="parts-grid"><div class="parts-group"><h3>Source</h3><p><a href="${live.sourceUrl}" target="_blank" rel="noreferrer">LEMON labor-times page</a></p><p>Published standard/book time for the selected source manual.</p></div></div>${awarenessHtml}<p class="job-note">Procedure additions are displayed only when the selected manual explicitly supports them; unavailable evidence creates no recommendation.</p>`;
  } catch (error) { catalogStatus.textContent = `Live labor lookup failed: ${error.message}`; }
});
populateLiveJobs();
loadCatalog();
render();
