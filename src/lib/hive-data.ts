import { hiveOptOutSchema, type HiveSnapshot, hiveSnapshotSchema, validateDataFile } from './hive-schema';
import { assertNoOptOuts, hiveView } from './hive';
import realSnapshot from '../data/hive-activity.json';
import fixtureSnapshot from '../data/_fixtures/hive-activity.json';
import optOutRegister from '../data/hive-optout.json';

// Read through globalThis, as src/content.config.ts does, so this type-checks without Node or Deno typings.
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

// The fixture renders only in `deno task build:test`, never in production builds.
const [snapshotFile, snapshotData] = env.RESOURCE_FIXTURES
  ? ['src/data/_fixtures/hive-activity.json', fixtureSnapshot]
  : ['src/data/hive-activity.json', realSnapshot];

let snapshot: HiveSnapshot | undefined;

/** The validated snapshot; throws when it or the opt-out register is invalid, or it lists an opted-out entry. */
function loadSnapshot(): HiveSnapshot {
  if (snapshot) return snapshot;
  const parsed = validateDataFile(hiveSnapshotSchema, snapshotData, snapshotFile);
  assertNoOptOuts(parsed, validateDataFile(hiveOptOutSchema, optOutRegister, 'src/data/hive-optout.json'), snapshotFile);
  return (snapshot = parsed);
}

/** What the Hive views show, with ages computed at build time. */
export function getHiveView(limit?: number): ReturnType<typeof hiveView> {
  return hiveView(loadSnapshot(), new Date(), limit);
}
