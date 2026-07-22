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
    parts: {
      required: ['Front struts or complete strut assemblies'],
      recommended: ['Strut mounts/bearings when replacing bare struts', 'Wheel alignment'],
      inspect: ['Sway-bar links', 'Control arms and bushings', 'Tires for uneven wear'],
    },
    notes: 'Both front corners. Alignment is recommended but priced separately.',
  },
];

export function getJobs() {
  return jobs;
}

export function getJobById(id) {
  return jobs.find((job) => job.id === id);
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
