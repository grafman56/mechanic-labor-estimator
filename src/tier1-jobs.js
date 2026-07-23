export const tier1Jobs = [
  { id: 'front-struts', label: 'Front struts', aliases: ['Suspension Strut / Shock Absorber'], scopes: ['left', 'right', 'both'] },
  { id: 'rear-struts-shocks', label: 'Rear struts / shocks', aliases: ['Suspension Strut / Shock Absorber'], scopes: ['left', 'right', 'both'] },
  { id: 'alternator', label: 'Alternator', aliases: ['Alternator'], scopes: ['standard'] },
  { id: 'starter', label: 'Starter', aliases: ['Starter Motor'], scopes: ['standard'] },
  { id: 'radiator', label: 'Radiator', aliases: ['Radiator'], scopes: ['standard'] },
  { id: 'wheel-bearing-hub', label: 'Wheel bearing / hub', aliases: ['Wheel Bearing'], scopes: ['front-one', 'front-both', 'hub-one', 'hub-both'] },
  { id: 'serpentine-belt', label: 'Serpentine belt', aliases: ['Drive Belt'], scopes: ['standard'] },
  { id: 'spark-plugs', label: 'Spark plugs', aliases: ['Spark Plug'], scopes: ['standard'] },
  { id: 'engine-air-filter', label: 'Engine air filter', aliases: ['Air Filter Element'], scopes: ['standard'] },
  { id: 'valve-cover-gasket', label: 'Valve-cover gasket', aliases: ['Valve Cover Gasket'], scopes: ['front', 'rear', 'both'] },
  { id: 'timing-belt', label: 'Timing belt', aliases: ['Timing Belt'], scopes: ['standard'] },
  { id: 'water-pump', label: 'Water pump', aliases: ['Water Pump'], scopes: ['standard'] },
];

export function findTier1Job(id) {
  return tier1Jobs.find((job) => job.id === id) ?? null;
}
