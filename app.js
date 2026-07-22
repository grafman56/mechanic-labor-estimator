import { calculateEstimate, getEstimateState, getJobById, getJobs, searchJobs } from './src/estimator.js';

const rateInput = document.querySelector('#labor-rate');
const jobSelect = document.querySelector('#job');
const searchInput = document.querySelector('#job-search');
const categorySelect = document.querySelector('#category');
const copyButton = document.querySelector('#copy-link');
const estimate = document.querySelector('#estimate');
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const sharedState = getEstimateState(new URLSearchParams(location.search));

rateInput.value = sharedState.laborRate;

for (const category of [...new Set(getJobs().map((job) => job.category))].sort()) {
  categorySelect.add(new Option(category, category));
}

function filteredJobs() {
  return searchJobs(searchInput.value).filter((job) => !categorySelect.value || job.category === categorySelect.value);
}

function populateJobs(preferredId) {
  const jobs = filteredJobs();
  jobSelect.replaceChildren();
  for (const job of jobs) jobSelect.add(new Option(`${job.category} — ${job.name}`, job.id));
  jobSelect.disabled = jobs.length === 0;
  if (jobs.length) jobSelect.value = jobs.some((job) => job.id === preferredId) ? preferredId : jobs[0].id;
  return jobs.length > 0;
}

function syncUrl() {
  const rate = Number(rateInput.value);
  if (!jobSelect.value || !Number.isFinite(rate) || rate <= 0) return;
  const url = new URL(location.href);
  url.search = new URLSearchParams({ job: jobSelect.value, rate: String(rate) });
  history.replaceState({}, '', url);
}

function list(title, items) {
  return `<div class="parts-group"><h3>${title}</h3><ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul></div>`;
}

function render() {
  const job = getJobById(jobSelect.value);
  const laborRate = Number(rateInput.value);
  if (!job) {
    estimate.innerHTML = '<p class="error">No jobs match those filters.</p>';
    return;
  }
  if (!Number.isFinite(laborRate) || laborRate <= 0) {
    estimate.innerHTML = '<p class="error">Enter a positive hourly labor rate.</p>';
    return;
  }
  const labor = calculateEstimate(job, laborRate);
  estimate.innerHTML = `<div class="estimate-heading"><div><p class="eyebrow">${job.category}</p><h2>${job.name}</h2></div><div class="total"><span>Labor-only range</span><strong>${currency.format(labor.low)}–${currency.format(labor.high)}</strong></div></div><p class="hours">Base labor: <strong>${job.laborHours.low}–${job.laborHours.high} hours</strong> at ${currency.format(laborRate)}/hour.</p><div class="parts-grid">${list('Required for the job', job.parts.required)}${list('Recommended while accessible', job.parts.recommended)}${list('Inspect and authorize if needed', job.parts.inspect)}</div><p class="job-note"><strong>Scope note:</strong> ${job.notes}</p>`;
  syncUrl();
}

function refreshJobs() {
  populateJobs(jobSelect.value || sharedState.jobId);
  render();
}

copyButton.addEventListener('click', async () => {
  syncUrl();
  try {
    await navigator.clipboard.writeText(location.href);
    copyButton.textContent = 'Link copied';
  } catch {
    copyButton.textContent = 'Copy unavailable';
  }
  setTimeout(() => { copyButton.textContent = 'Copy estimate link'; }, 1800);
});
rateInput.addEventListener('input', render);
jobSelect.addEventListener('change', render);
searchInput.addEventListener('input', refreshJobs);
categorySelect.addEventListener('change', refreshJobs);
populateJobs(sharedState.jobId);
render();
