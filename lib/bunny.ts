// Bunny Stream helpers
// Docs: https://docs.bunny.net/reference/api-overview

import crypto from 'crypto';

const LIBRARY_ID = process.env.BUNNY_LIBRARY_ID ?? '';
const API_KEY = process.env.BUNNY_API_KEY ?? '';
const PULL_ZONE = process.env.BUNNY_PULL_ZONE ?? ''; // e.g. "loveflix.b-cdn.net"
const SECURITY_KEY = process.env.BUNNY_SECURITY_KEY ?? '';

/**
 * Generates a signed playback URL valid for `expirySeconds`.
 * Use Bunny's "Token Authentication" feature on the Pull Zone.
 * https://docs.bunny.net/docs/cdn-token-authentication
 */
export function signedPlaybackUrl(videoGuid: string, expirySeconds = 3600): string {
  const expires = Math.floor(Date.now() / 1000) + expirySeconds;
  const path = `/${videoGuid}/playlist.m3u8`;
  const hash = crypto
    .createHash('sha256')
    .update(SECURITY_KEY + path + expires)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return `https://${PULL_ZONE}${path}?token=${hash}&expires=${expires}`;
}

/**
 * Creates a video entry on Bunny Stream and returns the video GUID.
 * The actual upload uses TUS (resumable) — frontend uploads directly.
 */
export async function createBunnyVideo(title: string): Promise<{ guid: string }> {
  const res = await fetch(`https://video.bunnycdn.com/library/${LIBRARY_ID}/videos`, {
    method: 'POST',
    headers: {
      AccessKey: API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Bunny createVideo failed: ${res.status}`);
  const data = await res.json();
  return { guid: data.guid };
}

/**
 * Generates an upload signature for direct browser upload (TUS).
 * https://docs.bunny.net/docs/stream-direct-upload
 */
export function uploadSignature(videoGuid: string, expirationTimestamp: number): string {
  return crypto
    .createHash('sha256')
    .update(LIBRARY_ID + API_KEY + expirationTimestamp + videoGuid)
    .digest('hex');
}

export const BUNNY_LIBRARY_ID = LIBRARY_ID;
