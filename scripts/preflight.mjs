#!/usr/bin/env node
/**
 * Comprueba las dependencias de SISTEMA (las que `npm install` NO trae).
 * Se ejecuta dentro de `npm run setup`, para que falten cosas se sepa aquí
 * y no en la primera generación de etiquetas.
 */
import { execFileSync } from 'node:child_process';

const REQUISITOS = [
  {
    bin: 'pdftotext',
    args: ['-v'],
    para: 'leer el PDF de pedido de SAP (generar etiquetas)',
    instalar: 'sudo apt-get install -y poppler-utils',
  },
  {
    bin: 'docker',
    args: ['--version'],
    para: 'levantar la Postgres del maestro',
    instalar: 'https://docs.docker.com/engine/install/',
  },
];

const falta = (r) => {
  try {
    execFileSync(r.bin, r.args, { stdio: 'ignore' });
    return false;
  } catch (err) {
    return err.code === 'ENOENT'; // sólo ENOENT = no está el binario
  }
};

const ausentes = REQUISITOS.filter(falta);

if (ausentes.length === 0) {
  console.log(`✓ Dependencias de sistema OK (${REQUISITOS.map((r) => r.bin).join(', ')})`);
  process.exit(0);
}

console.error('\n✖ Faltan dependencias de sistema:\n');
for (const r of ausentes) {
  console.error(`  · ${r.bin} — necesario para ${r.para}`);
  console.error(`    instalar:  ${r.instalar}\n`);
}
console.error('Instálalas y vuelve a ejecutar `npm run setup`.\n');
process.exit(1);
