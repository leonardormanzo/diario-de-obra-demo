// Regenera relatorio-ia/exemplo/rdos.json a partir da obra fictícia. Uso: node scripts/exportar-exemplo-ia.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { paraFormatoIA } from '../demo/obra-ficticia.mjs';

const destino = fileURLToPath(new URL('../relatorio-ia/exemplo/rdos.json', import.meta.url));
writeFileSync(destino, JSON.stringify(paraFormatoIA(), null, 2) + '\n');
console.log(`Escrito: ${destino}`);
