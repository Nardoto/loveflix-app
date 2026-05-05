// 99-abort-stale.ts — utility: lista uploads multipart abertos no R2 e aborta os mais antigos
// que 24h. R2 pode acumular custo se ficarem órfãos depois de uploads que falharam.

import { S3Client, ListMultipartUploadsCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import { requireEnv } from './lib/config.ts';

const STALE_HOURS = 24;

async function main(): Promise<void> {
  const accountId = requireEnv('R2_ACCOUNT_ID');
  const bucket = process.env.R2_BUCKET_NAME || 'alluretv-media';
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    },
  });

  console.log(`Listing in-progress multipart uploads in ${bucket}…`);
  const r = await s3.send(new ListMultipartUploadsCommand({ Bucket: bucket }));
  const uploads = r.Uploads ?? [];
  console.log(`Found ${uploads.length} in-progress uploads`);

  const cutoff = Date.now() - STALE_HOURS * 60 * 60 * 1000;
  const stale = uploads.filter((u) => u.Initiated && u.Initiated.getTime() < cutoff);
  console.log(`Stale (>${STALE_HOURS}h): ${stale.length}`);

  for (const u of stale) {
    if (!u.Key || !u.UploadId) continue;
    console.log(`  abort ${u.Key} (started ${u.Initiated?.toISOString()})`);
    await s3.send(
      new AbortMultipartUploadCommand({ Bucket: bucket, Key: u.Key, UploadId: u.UploadId }),
    );
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
