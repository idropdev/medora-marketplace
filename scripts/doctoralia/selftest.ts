/** Sanity checks for the dedupe helpers. Run: npx tsx scripts/doctoralia/selftest.ts */
import { normName, nameSimilarity, distanceMeters, parsePrice } from './load';

const cases: [string, unknown, unknown][] = [
  ['normName strips titles', normName('Dra. Viridiana Alderete Aguilar'), 'viridiana alderete aguilar'],
  ['normName folds accents', normName('Hospital Ángeles Ciudad Juárez'), 'hospital angeles ciudad juarez'],
  ['same person matches', nameSimilarity('Dr. Mario Alberto Valles Terrazas', 'Mario Valles Terrazas') >= 0.7, true],
  ['different orgs do not', nameSimilarity('Hospital Angeles', 'Clinica del Norte') < 0.3, true],
  ['doctor vs their hospital', nameSimilarity('Dra. Viridiana Alderete Aguilar', 'Hospital Angeles') < 0.3, true],
  ['distance ~111m', Math.abs(distanceMeters(31.714, -106.392, 31.715, -106.392) - 111) < 5, true],
  ['flat price', parsePrice('$1,500').mxn, 1500],
  ['from price', parsePrice('Desde $1,000').isFrom, true],
  ['free service', parsePrice('Servicio gratuito').mxn, 0],
  ['no price', parsePrice(null).mxn, null],

  // Clinic-vs-clinic: the same business spelled with and without accents must match.
  ['accented clinic matches', nameSimilarity('Hospital Ángeles Ciudad Juárez', 'Hospital Angeles Ciudad Juarez') >= 0.95, true],
  ['shortened clinic matches', nameSimilarity('Star Médica Ciudad Juárez', 'Star Medica Juarez') >= 0.65, true],
  ['unrelated dentists do not', nameSimilarity('Dentalia Juárez', 'Ortodoncia del Valle') < 0.3, true],
];

let failed = 0;
for (const [label, actual, expected] of cases) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${label}${ok ? '' : ` — got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`}`);
}
console.log(failed ? `\n${failed} failing` : '\nall passing');
process.exit(failed ? 1 : 0);
