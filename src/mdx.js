const sourceBase = 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/Parts%20and%20Labor';

const jobs = {
  'front-struts': {
    name: 'Front struts',
    source: `${sourceBase}/Steering%20and%20Suspension/Suspension/Suspension%20Strut%20%2F%20Shock%20Absorber/Labor%20Times/`,
    scopes: {
      left: { label: 'Front left', laborHours: 1.0 },
      right: { label: 'Front right', laborHours: 1.0 },
      both: { label: 'Both front struts', laborHours: 1.9 },
    },
    policyIncluded: ['Both front struts', 'Alignment recommendation'],
    accessRecommendations: [],
    note: 'LEMON standard labor: 1.0 hour one side; 1.9 hours both sides. Alignment is not included in the published strut operation.',
  },
  'valve-cover-gasket': {
    name: 'Valve-cover gasket',
    source: `${sourceBase}/Engine%2C%20Cooling%20and%20Exhaust/Engine/Valve%20Cover%20Gasket/Labor%20Times/`,
    scopes: {
      front: { label: 'Front bank', laborHours: 1.3 },
      rear: { label: 'Rear bank', laborHours: 1.3 },
      both: { label: 'Both banks', laborHours: 2.5 },
    },
    policyIncluded: ['Gasket(s) for selected bank scope'],
    accessRecommendations: [],
    note: 'LEMON standard labor: 1.3 hours one bank; 2.5 hours both banks.',
  },
  'timing-service': {
    name: 'Timing-belt service package',
    source: `${sourceBase}/Maintenance/Timing%20Belt/Labor%20Times/`,
    scopes: { default: { label: 'Full timing service', laborHours: 5.1 } },
    policyIncluded: ['Timing belt', 'Water pump', 'Timing tensioner and idlers', 'Required coolant'],
    accessRecommendations: [],
    note: 'LEMON standard labor: timing belt 4.6 hours plus water pump 0.5 hour. Camshaft seals are conditional: add 0.4 hour for one or 0.5 for both if required.',
  },
};

export const mdxPilot = {
  vin: '2HNYD18836H516598', year: 2006, make: 'Acura', model: 'MDX Touring', engine: 'J35A5 3.5L V6', manual_url: 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/', jobs,
};

export function getMdxJob(id) { return jobs[id]; }

export function findVerifiedVehicle(vin) {
  return String(vin).trim().toUpperCase() === mdxPilot.vin ? mdxPilot : null;
}

export function getMdxScope(id, scopeKey) {
  const job = getMdxJob(id);
  const key = scopeKey && job.scopes[scopeKey] ? scopeKey : (job.scopes.both ? 'both' : 'default');
  return { key, ...job.scopes[key] };
}
