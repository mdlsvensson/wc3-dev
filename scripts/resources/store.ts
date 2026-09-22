import { AwsClient } from 'aws4fetch';
import { dirname, join } from 'jsr:@std/path@^1';

export interface AssetStore {
  readonly label: string;
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
}

/** Keys are content-addressed, so every object can be cached forever. */
export const CACHE_CONTROL = 'public, max-age=31536000, immutable';

export function localStore(root: string): AssetStore {
  return {
    label: `local folder ${root}`,
    async put(key, bytes) {
      const path = join(root, ...key.split('/'));
      await Deno.mkdir(dirname(path), { recursive: true });
      await Deno.writeFile(path, bytes);
    },
  };
}

export function dryRunStore(log: (line: string) => void = console.log): AssetStore {
  return {
    label: 'dry run',
    put(key, bytes, contentType) {
      log(`would upload ${key} (${bytes.length} bytes, ${contentType})`);
      return Promise.resolve();
    },
  };
}

/** An S3-compatible bucket (Cloudflare R2 recommended) configured through ASSET_STORE_* variables. */
export function s3StoreFromEnv(env: Pick<Deno.Env, 'get'> = Deno.env): AssetStore {
  const required = (name: string) => {
    const value = env.get(name);
    if (!value) throw new Error(`${name} is not set.`);
    return value;
  };
  const endpoint = required('ASSET_STORE_ENDPOINT').replace(/\/+$/, '');
  const bucket = required('ASSET_STORE_BUCKET');
  const client = new AwsClient({
    accessKeyId: required('ASSET_STORE_ACCESS_KEY_ID'),
    secretAccessKey: required('ASSET_STORE_SECRET_ACCESS_KEY'),
    service: 's3',
    region: env.get('ASSET_STORE_REGION') ?? 'auto',
  });
  return {
    label: `bucket ${bucket}`,
    async put(key, bytes, contentType) {
      const url = `${endpoint}/${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
      const response = await client.fetch(url, {
        method: 'PUT',
        body: new Uint8Array(bytes),
        headers: { 'Content-Type': contentType, 'Cache-Control': CACHE_CONTROL },
      });
      if (!response.ok) throw new Error(`Upload of ${key} failed: ${response.status} ${await response.text()}`);
    },
  };
}
