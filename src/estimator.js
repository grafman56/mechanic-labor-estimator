const jobs = [
  {
    id: 'brake-pads-rotors',
    name: 'Brake pads and rotors',
    category: 'Brakes',
    laborHours: { low: 1.5, high: 2.5 },
    parts: {
      required: ['Brake pads', 'Brake rotors', 'Brake hardware kit'],
      recommended: ['Brake fluid condition check', 'Brake cleaner', 'Caliper slide-pin lubricant'],
      inspect: ['Calipers and slide pins', 'Brake hoses', 'Wheel bearing play'],
    },
    notes: 'Per axle. Rust, seized hardware, and hydraulic diagnosis are not included.',
  },
  {
    id: 'alternator',
    name: 'Alternator replacement',
    category: 'Electrical',
    laborHours: { low: 1, high: 2.5 },
    parts: {
      required: ['Alternator'],
      recommended: ['Serpentine belt if worn or cracked', 'Battery and charging-system test'],
      inspect: ['Belt tensioner', 'Drive-belt pulleys', 'Battery terminals and cables'],
    },
    notes: 'Electrical diagnosis is not included. Access time varies substantially by vehicle.',
  },
  {
    id: 'starter',
    name: 'Starter replacement',
    category: 'Electrical',
    laborHours: { low: 1, high: 3 },
    parts: {
      required: ['Starter'],
      recommended: ['Battery and charging-system test'],
      inspect: ['Starter wiring and terminals', 'Battery cables', 'Flywheel/flexplate ring gear where accessible'],
    },
    notes: 'Electrical diagnosis and immobilizer issues are not included.',
  },
  {
    id: 'wheel-bearing',
    name: 'Wheel bearing / hub assembly',
    category: 'Suspension & steering',
    laborHours: { low: 1.5, high: 3.5 },
    parts: {
      required: ['Wheel bearing or hub assembly', 'New axle nut where specified'],
      recommended: ['Wheel alignment check if suspension geometry is disturbed'],
      inspect: ['ABS sensor and wiring', 'CV axle splines', 'Brake components'],
    },
    notes: 'Per corner. Corrosion, seized fasteners, and press-in bearing work can add time.',
  },
  {
    id: 'spark-plugs',
    name: 'Spark plug replacement',
    category: 'Maintenance',
    laborHours: { low: 0.8, high: 3 },
    parts: {
      required: ['Spark plugs'],
      recommended: ['Ignition boots if aged or damaged', 'Dielectric grease where specified'],
      inspect: ['Ignition coils', 'Valve-cover gasket for oil in plug wells'],
    },
    notes: 'Plugs are not universally accessible. Do not quote coil replacement unless it is diagnosed.',
  },
  {
    id: 'serpentine-belt',
    name: 'Serpentine belt replacement',
    category: 'Maintenance',
    laborHours: { low: 0.5, high: 1.5 },
    parts: {
      required: ['Serpentine belt'],
      recommended: ['Belt tensioner if weak or noisy', 'Idler pulley if noisy'],
      inspect: ['Accessory pulleys', 'Fluid leaks that could contaminate the belt'],
    },
    notes: 'Some vehicles require wheel-well or engine-mount access.',
  },
  {
    id: 'valve-cover-gasket',
    name: 'Valve-cover gasket replacement',
    category: 'Engine',
    laborHours: { low: 1.5, high: 5 },
    parts: {
      required: ['Valve-cover gasket set', 'Spark plug tube seals if included or required'],
      recommended: ['PCV valve if due and accessible'],
      inspect: ['Ignition components for oil contamination', 'Vacuum hoses', 'Valve cover for cracks or warpage'],
    },
    notes: 'Labor is engine- and bank-specific. Use the vehicle service manual before finalizing a quote.',
  },
  {
    id: 'front-struts',
    name: 'Front strut replacement',
    category: 'Suspension & steering',
    laborHours: { low: 2.5, high: 5 },
    parts: { required: ['Front struts or complete strut assemblies'], recommended: ['Strut mounts/bearings when replacing bare struts', 'Wheel alignment'], inspect: ['Sway-bar links', 'Control arms and bushings', 'Tires for uneven wear'] },
    notes: 'Both front corners. Alignment is recommended but priced separately.',
  },
  {
    id: 'oil-change', name: 'Engine oil and filter change', category: 'Maintenance', laborHours: { low: 0.3, high: 0.8 },
    parts: { required: ['Engine oil', 'Oil filter', 'Drain plug gasket where specified'], recommended: ['Tire-pressure check'], inspect: ['Fluid leaks', 'Oil drain plug threads'] }, notes: 'Oil capacity and specification are vehicle-specific.',
  },
  {
    id: 'brake-caliper', name: 'Brake caliper replacement', category: 'Brakes', laborHours: { low: 1, high: 2.5 },
    parts: { required: ['Brake caliper', 'Brake fluid'], recommended: ['Brake hose if damaged', 'Brake pads if contaminated'], inspect: ['Slide pins', 'Brake rotor condition', 'Flexible brake hose'] }, notes: 'Per caliper. Bleeding and hydraulic diagnosis are included only as applicable.',
  },
  {
    id: 'battery', name: 'Battery replacement', category: 'Electrical', laborHours: { low: 0.2, high: 1 },
    parts: { required: ['Battery'], recommended: ['Terminal cleaning/protectant'], inspect: ['Battery terminals', 'Hold-down hardware', 'Charging system'] }, notes: 'Programming, memory preservation, and battery registration may add work.',
  },
  {
    id: 'thermostat', name: 'Thermostat replacement', category: 'Cooling', laborHours: { low: 1, high: 4 },
    parts: { required: ['Thermostat', 'Thermostat gasket or seal', 'Coolant'], recommended: ['Coolant hose if aged and disturbed'], inspect: ['Water pump', 'Coolant leaks', 'Radiator cap'] }, notes: 'Cooling-system diagnosis and refill/bleed requirements vary by vehicle.',
  },
  {
    id: 'radiator', name: 'Radiator replacement', category: 'Cooling', laborHours: { low: 1.5, high: 4 },
    parts: { required: ['Radiator', 'Coolant'], recommended: ['Upper/lower radiator hoses if aged'], inspect: ['Cooling fans', 'Transmission cooler connections', 'Water pump'] }, notes: 'Pressure testing and transmission-fluid loss are separate considerations.',
  },
  {
    id: 'control-arm', name: 'Control arm replacement', category: 'Suspension & steering', laborHours: { low: 1.5, high: 4 },
    parts: { required: ['Control arm assembly or bushing'], recommended: ['Wheel alignment'], inspect: ['Ball joint', 'Sway-bar links', 'Other suspension bushings'] }, notes: 'Per side. Seized bolts and alignment are not included in the base range.',
  },
  {
    id: 'tie-rod-end', name: 'Outer tie-rod end replacement', category: 'Suspension & steering', laborHours: { low: 0.8, high: 2 },
    parts: { required: ['Outer tie-rod end'], recommended: ['Wheel alignment'], inspect: ['Inner tie rod', 'Steering rack boots', 'Front suspension wear'] }, notes: 'Per side. Alignment is required after steering-geometry work.',
  },
];

export function getJobs() {
  return jobs;
}

export function getJobById(id) {
  return jobs.find((job) => job.id === id);
}

export function searchJobs(query = '') {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return getJobs();

  return jobs.filter((job) => `${job.name} ${job.category}`.toLowerCase().includes(normalizedQuery));
}

export function getEstimateState(params, defaultRate = 125) {
  const selectedJob = getJobById(params.get('job')) ?? getJobs()[0];
  const requestedRate = Number(params.get('rate'));
  const laborRate = Number.isFinite(requestedRate) && requestedRate > 0 ? requestedRate : defaultRate;

  return { jobId: selectedJob.id, laborRate };
}

export function calculateEstimate(job, laborRate) {
  if (!job) throw new Error('A job is required');
  if (!Number.isFinite(laborRate) || laborRate <= 0) {
    throw new Error('Labor rate must be a positive number');
  }

  return {
    low: job.laborHours.low * laborRate,
    high: job.laborHours.high * laborRate,
  };
}
