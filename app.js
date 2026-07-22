import { getMdxJob, getMdxScope, mdxPilot } from './src/mdx.js';

const rateInput = document.querySelector('#labor-rate');
const jobSelect = document.querySelector('#job');
const estimate = document.querySelector('#estimate');
const scopeSelect = document.querySelector('#scope');
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

for (const [id, job] of Object.entries(mdxPilot.jobs)) jobSelect.add(new Option(job.name, id));
document.querySelector('label[for="job-search"]').style.display = 'none';
document.querySelector('#job-search').style.display = 'none';
const categoryLabel = document.querySelector('label[for="category"]');
categoryLabel.style.display = 'none';
document.querySelector('#category').style.display = 'none';

function render() {
  const job = getMdxJob(jobSelect.value);
  scopeSelect.replaceChildren();
  for (const [key, scope] of Object.entries(job.scopes)) scopeSelect.add(new Option(scope.label, key));
  const saved = scopeSelect.dataset.scope;
  const scope = getMdxScope(jobSelect.value, saved);
  scopeSelect.value = scope.key;
  scopeSelect.dataset.scope = scope.key;
  const rate = Number(rateInput.value);
  if (!Number.isFinite(rate) || rate <= 0) { estimate.innerHTML = '<p class="error">Enter a positive hourly labor rate.</p>'; return; }
  const access = job.accessRecommendations.length ? `<div class="parts-group"><h3>Access-aware recommendation</h3>${job.accessRecommendations.map((item) => `<p><strong>${item.job} — ${item.disposition}</strong><br>${item.reason}<br><em>${item.labor}</em><br><a href="${item.source}" target="_blank" rel="noreferrer">Procedure evidence</a></p>`).join('')}</div>` : '';
  estimate.innerHTML = `<div class="estimate-heading"><div><p class="eyebrow">Verified pilot vehicle</p><h2>${job.name}</h2><p>${mdxPilot.year} ${mdxPilot.make} ${mdxPilot.model} · ${mdxPilot.engine}</p></div><div class="total"><span>Published baseline labor</span><strong>${scope.laborHours} hr · ${currency.format(scope.laborHours * rate)}</strong></div></div><div class="parts-grid"><div class="parts-group"><h3>Shop service package</h3><ul>${job.policyIncluded.map((x) => `<li>${x}</li>`).join('')}</ul></div><div class="parts-group"><h3>Source</h3><p><a href="${job.source}" target="_blank" rel="noreferrer">LEMON labor-times page</a></p><p>Standard/book time for this decoded vehicle.</p></div>${access}</div><p class="job-note">${job.note}</p>`;
}
jobSelect.addEventListener('change', render);
scopeSelect.addEventListener('change', () => { scopeSelect.dataset.scope = scopeSelect.value; render(); });
rateInput.addEventListener('input', render);
render();
