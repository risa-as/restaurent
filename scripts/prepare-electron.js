/**
 * Copies the assets that Next.js standalone output doesn't include automatically:
 *   .next/static  →  .next/standalone/.next/static
 *   public/       →  .next/standalone/public
 *   .env          →  .next/standalone/.env   (if present)
 */

const { cpSync, existsSync } = require('fs');
const { join } = require('path');

const root = join(__dirname, '..');
const standalone = join(root, '.next', 'standalone');

if (!existsSync(standalone)) {
  console.error('ERROR: .next/standalone not found. Run `next build` first.');
  process.exit(1);
}

function copy(src, dest, label) {
  if (!existsSync(src)) { console.warn(`SKIP: ${label} not found`); return; }
  cpSync(src, dest, { recursive: true });
  console.log(`COPY: ${label}`);
}

copy(
  join(root, '.next', 'static'),
  join(standalone, '.next', 'static'),
  '.next/static → standalone/.next/static',
);

copy(
  join(root, 'public'),
  join(standalone, 'public'),
  'public/ → standalone/public',
);

// Include .env for runtime secrets (never commit this file)
copy(
  join(root, '.env'),
  join(standalone, '.env'),
  '.env → standalone/.env',
);

console.log('\nElectron resources ready. Run `electron-builder` to package.\n');
