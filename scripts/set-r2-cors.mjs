// One-shot: configure CORS no bucket R2 pra o browser conseguir fazer
// multipart PUT via presigned URLs. Sem isso o admin/stories/new bate
// "blocked by CORS policy" mesmo com o presign sendo válido.
//
// Permite:
//   • origins: alluretv.net (prod) + *.vercel.app (preview) +
//     localhost:3000/3001 (dev). Outras origens continuam bloqueadas.
//   • methods: PUT (upload de chunks) + GET/HEAD (preview de cover no
//     editor) + DELETE (admin apagar story).
//   • expose ETag — o useMultipartUpload precisa ler esse header pra
//     completar o multipart no /api/upload/complete.
//
// Run com:  node scripts/set-r2-cors.mjs
// Idempotente — sobrescreve a config CORS existente do bucket.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

// Carrega .env.local sem dotenv.
try {
  const lines = readFileSync(resolve(root, '.env.local'), 'utf8').split(/\r?\n/);
  for (const l of lines) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
} catch {
  /* OK */
}

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_BUCKET_NAME ?? 'alluretv-media';

if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.error('✗ R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY missing in .env.local');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
});

const corsRules = [
  {
    AllowedOrigins: [
      'https://alluretv.net',
      'https://www.alluretv.net',
      'https://*.vercel.app',
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
    AllowedHeaders: ['*'],
    // ETag é o que o multipart precisa ler do response da PUT pra
    // mandar no /complete. Sem expor ele, fetch/XHR no browser não
    // conseguem ver o header.
    ExposeHeaders: ['ETag', 'x-amz-version-id'],
    MaxAgeSeconds: 3600,
  },
];

console.log(`• Aplicando CORS no bucket "${BUCKET}"...`);
await s3.send(
  new PutBucketCorsCommand({
    Bucket: BUCKET,
    CORSConfiguration: { CORSRules: corsRules },
  }),
);
console.log('  ✓ CORS gravado.');

console.log('• Verificando...');
const got = await s3.send(new GetBucketCorsCommand({ Bucket: BUCKET }));
console.log(JSON.stringify(got.CORSRules, null, 2));
console.log('\n✓ Pronto. Tenta o upload de novo.');
