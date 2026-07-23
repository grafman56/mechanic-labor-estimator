import { findVerifiedVehicle, getMdxJob, getMdxScope } from './src/mdx.js';
import { catalogOptions, findCatalogEntry } from './src/catalog.js';
import { tier1Jobs } from './src/tier1-jobs.js';
import { liveEstimateModel } from './src/live-estimate.js';
import { availableManuals } from './src/manual-availability.js';

const vinInput = document.querySelector('#vin');
const rateInput = document.querySelector('#labor-rate');
const jobSelect = document.querySelector('#job');
const estimate = document.querySelector('#estimate');
const scopeSelect = document.querySelector('#scope');
const catalogYear = document.querySelector('#catalog-year');
const catalogModel = document.querySelector('#catalog-model');
const catalogEngine = document.querySelector('#catalog-engine');
const catalogStatus = document.querySelector('#catalog-status');
const checkManual = document.querySelector('#check-manual');
const liveJob = document.querySelector('#live-job');
const getLiveLabor = document.querySelector('#get-live-labor');
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
let selectedManual = null;

for (const selector of ['label[for="job-search"]', '#job-search', 'label[for="category"]', '#category']) {
  document.querySelector(selector).style.display = 'none';
}

function setJobControlsEnabled(enabled) {
  jobSelect.disabled = !enabled;
  scopeSelect.disabled = !enabled;
}

function populateJobs(vehicle) {
  if (jobSelect.dataset.vehicleVin === vehicle.vin) return;
  jobSelect.replaceChildren();
  for (const [id, job] of Object.entries(vehicle.jobs)) jobSelect.add(new Option(job.name, id));
  jobSelect.dataset.vehicleVin = vehicle.vin;
  scopeSelect.dataset.scope = '';
}

function renderUnavailable(vin) {
  setJobControlsEnabled(false);
  estimate.innerHTML = `<div class="estimate-heading"><div><p class="eyebrow">Vehicle verification required</p><h2>No verified estimate available</h2><p>${vin ? `VIN ${vin.toUpperCase()} has no reviewed vehicle/job records yet.` : 'Enter a 17-character VIN to select a reviewed vehicle record.'}</p></div></div><p class="job-note">This tool does not fall back to generic labor, parts, or access assumptions.</p>`;
}

function fillSelect(select, values) {
  select.replaceChildren(...values.map((value) => new Option(value, value)));
  select.disabled = values.length === 0;
}

function populateLiveJobs() {
  liveJob.replaceChildren(...tier1Jobs.map((job) => new Option(job.label, job.id)));
  liveJob.disabled = false;
}

async function loadCatalog() {
  try {
    const response = await fetch('./data/lemon-acura-catalog.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const catalog = await response.json();
    fillSelect(catalogYear, catalogOptions(catalog, 'year'));
    const updateModels = () => {
      fillSelect(catalogModel, catalogOptions(catalog, 'model', { year: Number(catalogYear.value) }));
      updateEngines();
    };
    const updateEngines = async () => {
      const candidates = catalog.filter((entry) => entry.year === Number(catalogYear.value) && entry.model === catalogModel.value);
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
      checkManual.disabled = !entry;
      getLiveLabor.disabled = !entry;
      checkManual.dataset.url = entry?.manual_url ?? '';
      getLiveLabor.dataset.url = entry?.manual_url ?? '';
      catalogStatus.innerHTML = entry ? `LEMON labor data available: <a href="${entry.manual_url}" target="_blank" rel="noreferrer">open matching manual</a>.` : 'No source manual with labor data is available for this selection.';
    };
    catalogYear.addEventListener('change', updateModels);
    catalogModel.addEventListener('change', updateEngines);
    catalogEngine.addEventListener('change', () => {
      selectedManual = findCatalogEntry(JSON.parse(catalogEngine.dataset.manuals || '[]'), { engine: catalogEngine.value });
      checkManual.disabled = !selectedManual;
      getLiveLabor.disabled = !selectedManual;
      checkManual.dataset.url = selectedManual?.manual_url ?? '';
      getLiveLabor.dataset.url = selectedManual?.manual_url ?? '';
    });
    updateModels();
  } catch (error) {
    catalogYear.disabled = true;
    catalogStatus.textContent = 'Manual catalog could not be loaded.';
  }
}

function render() {
  const vehicle = findVerifiedVehicle(vinInput.value);
  if (!vehicle) { renderUnavailable(vinInput.value.trim()); return; }
  populateJobs(vehicle);
  setJobControlsEnabled(true);
  const job = getMdxJob(jobSelect.value);
  scopeSelect.replaceChildren();
  for (const [key, scope] of Object.entries(job.scopes)) scopeSelect.add(new Option(scope.label, key));
  const scope = getMdxScope(jobSelect.value, scopeSelect.dataset.scope);
  scopeSelect.value = scope.key;
  scopeSelect.dataset.scope = scope.key;
  const rate = Number(rateInput.value);
  if (!Number.isFinite(rate) || rate <= 0) { estimate.innerHTML = '<p class="error">Enter a positive hourly labor rate.</p>'; return; }
  const access = job.accessRecommendations.length ? `<div class="parts-group"><h3>Access-aware recommendation</h3>${job.accessRecommendations.map((item) => `<p><strong>${item.job} — ${item.disposition}</strong><br>${item.reason}<br><em>${item.labor}</em><br><a href="${item.source}" target="_blank" rel="noreferrer">Procedure evidence</a></p>`).join('')}</div>` : '';
  estimate.innerHTML = `<div class="estimate-heading"><div><p class="eyebrow">Verified vehicle record</p><h2>${job.name}</h2><p>${vehicle.year} ${vehicle.make} ${vehicle.model} · ${vehicle.engine}</p></div><div class="total"><span>Published baseline labor</span><strong>${scope.laborHours} hr · ${currency.format(scope.laborHours * rate)}</strong></div></div><div class="parts-grid"><div class="parts-group"><h3>Shop service package</h3><ul>${job.policyIncluded.map((x) => `<li>${x}</li>`).join('')}</ul></div><div class="parts-group"><h3>Source</h3><p><a href="${job.source}" target="_blank" rel="noreferrer">LEMON labor-times page</a></p><p>Standard/book time for this decoded vehicle.</p></div>${access}</div><p class="job-note">${job.note}</p>`;
}

jobSelect.addEventListener('change', render);
scopeSelect.addEventListener('change', () => { scopeSelect.dataset.scope = scopeSelect.value; render(); });
rateInput.addEventListener('input', render);
vinInput.addEventListener('input', render);
checkManual.addEventListener('click', async () => {
  catalogStatus.textContent = 'Checking live manual…';
  try {
    const response = await fetch(`/api/manual-metadata?url=${encodeURIComponent(checkManual.dataset.url)}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    catalogStatus.innerHTML = `Live LEMON manual found: <a href="${result.source_url}" target="_blank" rel="noreferrer">${result.title}</a>. Estimate coverage is separate.`;
  } catch (error) { catalogStatus.textContent = `Live manual check failed: ${error.message}`; }
});
getLiveLabor.addEventListener('click', async () => {
  catalogStatus.textContent = 'Looking up published labor time…';
  try {
    const params = new URLSearchParams({ url: getLiveLabor.dataset.url, job: liveJob.value });
    const response = await fetch(`/api/live-job-labor?${params}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    if (result.status !== 'available') {
      catalogStatus.textContent = `No verified live estimate: ${result.reason}`;
      return;
    }
    const live = liveEstimateModel(result, selectedManual, rateInput.value);
    const price = live.laborCost === null ? '' : ` · ${currency.format(live.laborCost)}`;
    catalogStatus.innerHTML = `Live source match: <a href="${live.sourceUrl}" target="_blank" rel="noreferrer">${live.operation} labor time</a> — ${live.laborHours} standard hr${price}.`;
    estimate.innerHTML = `<div class="estimate-heading"><div><p class="eyebrow">Selected vehicle and live source</p><h2>${live.operation}</h2><p>${live.vehicle}</p></div><div class="total"><span>Published baseline labor</span><strong>${live.laborHours} hr${price}</strong></div></div><div class="parts-grid"><div class="parts-group"><h3>Source</h3><p><a href="${live.sourceUrl}" target="_blank" rel="noreferrer">LEMON labor-times page</a></p><p>Published standard/book time for the selected source manual.</p></div></div><p class="job-note">Vehicle/model selection can produce an estimate only when the selected manual exposes one exact operation and one unambiguous Replace labor time.</p>`;
  } catch (error) { catalogStatus.textContent = `Live labor lookup failed: ${error.message}`; }
});
populateLiveJobs();
loadCatalog();
render();
