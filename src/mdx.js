export const mdxPilot = {
  vin: '2HNYD18836H516598',
  year: 2006,
  make: 'Acura',
  model: 'MDX Touring',
  engine: 'J35A5 3.5L V6',
  manual_url: 'https://lemon-manuals.la/Acura/2006/MDX%20V6-3.5L/',
};

export function findVerifiedVehicle(vin) {
  return String(vin).trim().toUpperCase() === mdxPilot.vin ? mdxPilot : null;
}
