import { loadStaticLaborIndex, loadStaticMakeLaborCatalog, findStaticLaborRecord } from './src/static-catalog.js';
import { staticEstimateModel } from './src/static-estimate.js';

const make = document.querySelector('#make');
const vehicle = document.querySelector('#vehicle');
const job = document.querySelector('#job');
const status = document.querySelector('#status');
const result = document.querySelector('#result');
let index = [];
let records = [];

function option(label, value) {
  return new Option(label, value);
}

function unique(values) {
  return [...new Set(values)];
}

function vehicleLabel(record) {
  return `${record.year} ${record.make} ${record.model} · ${record.configuration}`;
}

function render(model) {
  result.replaceChildren();
  if (!model) return;
  const heading = document.createElement('h2');
  heading.textContent = model.heading;
  const identity = document.createElement('p');
  identity.textContent = model.vehicle;
  const checked = document.createElement('p');
  checked.className = 'muted';
  checked.textContent = `Source record checked ${new Date(model.checkedAt).toLocaleDateString()}.`;
  if (model.status === 'available') {
    const hours = document.createElement('strong');
    hours.className = 'hours';
    hours.textContent = `${model.hours} hr`;
    const row = document.createElement('p');
    row.textContent = `Published row: ${model.sourceRow}`;
    const link = document.createElement('a');
    link.href = model.sourceUrl;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = 'Open recorded labor source';
    const wrapper = document.createElement('div');
    wrapper.className = 'result-heading';
    const copy = document.createElement('div');
    copy.append(heading, identity);
    wrapper.append(copy, hours);
    result.append(wrapper, row, link, checked);
    return;
  }
  result.className = 'unavailable';
  const reason = document.createElement('p');
  reason.textContent = model.reason;
  result.append(heading, identity, reason, checked);
}

function selectedRecord() {
  return findStaticLaborRecord(records, { manualUrl: vehicle.value, jobId: job.value });
}

function refreshResult() {
  const record = selectedRecord();
  render(staticEstimateModel(record));
  if (!record) status.textContent = 'This vehicle and job do not have a bundled record.';
  else if (record.status === 'available') status.textContent = 'Exact bundled source record loaded.';
  else status.textContent = 'This bundled vehicle/job record is unavailable.';
}

function populateVehicles() {
  const vehicles = unique(records.map((record) => record.manual_url));
  vehicle.replaceChildren(...vehicles.map((manualUrl) => {
    const record = records.find((candidate) => candidate.manual_url === manualUrl);
    return option(vehicleLabel(record), manualUrl);
  }));
  vehicle.disabled = vehicles.length === 0;
  const jobs = unique(records.filter((record) => record.manual_url === vehicle.value).map((record) => record.job_id));
  job.replaceChildren(...jobs.map((jobId) => option(jobId.replaceAll('-', ' '), jobId)));
  job.disabled = jobs.length === 0;
  refreshResult();
}

async function loadMake() {
  records = await loadStaticMakeLaborCatalog(async (path) => {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }, index, make.value);
  populateVehicles();
}

async function start() {
  try {
    index = await loadStaticLaborIndex(async (path) => {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    });
    make.replaceChildren(...index.map((entry) => option(entry.make, entry.make)));
    make.disabled = index.length === 0;
    make.addEventListener('change', () => void loadMake());
    vehicle.addEventListener('change', populateVehicles);
    job.addEventListener('change', refreshResult);
    await loadMake();
  } catch {
    status.textContent = 'Bundled catalog could not be loaded.';
  }
}

void start();
