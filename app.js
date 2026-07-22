import { calculateEstimate, getJobById, getJobs } from './src/estimator.js';

const rateInput = document.querySelector('#labor-rate');
const jobSelect = document.querySelector('#job');
const estimate = document.querySelector('#estimate');
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

for (const job of getJobs()) {
  const option = document.createElement('option');
  option.value = job.id;
  option.textContent = `${job.category} — ${job.name}`;
  jobSelect.append(option);
}

function list(title, items) {
  return `<div class="parts-group"><h3>${title}</h3><ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul></div>`;
}

function render() {
  const job = getJobById(jobSelect.value);
  const laborRate = Number(rateInput.value);

  if (!Number.isFinite(laborRate) || laborRate <= 0) {
    estimate.innerHTML = '<p class="error">Enter a positive hourly labor rate.</p>';
    return;
  }

  const labor = calculateEstimate(job, laborRate);
  estimate.innerHTML = `
    <div class="estimate-heading">
      <div><p class="eyebrow">${job.category}</p><h2>${job.name}</h2></div>
      <div class="total"><span>Labor-only range</span><strong>${currency.format(labor.low)}–${currency.format(labor.high)}</strong></div>
    </div>
    <p class="hours">Base labor: <strong>${job.laborHours.low}–${job.laborHours.high} hours</strong> at ${currency.format(laborRate)}/hour.</p>
    <div class="parts-grid">
      ${list('Required for the job', job.parts.required)}
      ${list('Recommended while accessible', job.parts.recommended)}
      ${list('Inspect and authorize if needed', job.parts.inspect)}
    </div>
    <p class="job-note"><strong>Scope note:</strong> ${job.notes}</p>`;
}

rateInput.addEventListener('input', render);
jobSelect.addEventListener('change', render);
render();
