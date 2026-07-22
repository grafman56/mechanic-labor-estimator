import { findVerifiedVehicle, getMdxJob, getMdxScope } from './src/mdx.js';
import { catalogOptions, findCatalogEntry } from './src/catalog.js';

const vinInput = document.querySelector('#vin');
const rateInput = document.querySelector('#labor-rate');
const jobSelect = document.querySelector('#job');
const estimate = document.querySelector('#estimate');
const scopeSelect = document.querySelector('#scope');
const catalogYear = document.querySelector('#catalog-year');
const catalogModel = document.querySelector('#catalog-model');
const catalogEngine = document.querySelector('#catalog-engine');
const catalogStatus = document.querySelector('#catalog-status');
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

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
    const updateEngines = () => {
      fillSelect(catalogEngine, catalogOptions(catalog, 'engine', { year: Number(catalogYear.value), model: catalogModel.value }));
      const entry = findCatalogEntry(catalog, { year: Number(catalogYear.value), model: catalogModel.value, engine: catalogEngine.value });
      catalogStatus.innerHTML = entry ? `LEMON manual available: <a href="${entry.manual_url}" target="_blank" rel="noreferrer">open matching manual</a>. Estimate coverage is separate.` : 'No matching manual found.';
    };
    catalogYear.addEventListener('change', updateModels);
    catalogModel.addEventListener('change', updateEngines);
    catalogEngine.addEventListener('change', updateEngines);
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
loadCatalog();
render();
