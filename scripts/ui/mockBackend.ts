/**
 * In-memory Convex backend for UI screenshots and manual QA.
 *
 * Runs the real functions in convex/ with convex-test and answers the Convex
 * browser client's WebSocket sync protocol through Playwright's
 * `page.routeWebSocket`, so the app can be exercised without a deployment.
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { convexTest } from 'convex-test';
import { makeFunctionReference } from 'convex/server';
import { jsonToConvex, convexToJson, type Value } from 'convex/values';
import type { Page, WebSocketRoute } from 'playwright';
import schema from '../../convex/schema';

const CONVEX_DIR = join(import.meta.dirname, '../../convex');

function loadModules(): Record<string, () => Promise<unknown>> {
  const modules: Record<string, () => Promise<unknown>> = {};
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|js)$/.test(entry) && !entry.endsWith('.d.ts') && entry !== 'tsconfig.json') {
        const key = './convex/' + relative(CONVEX_DIR, full).replaceAll('\\', '/');
        modules[key] = () => import(pathToFileURL(full).href);
      }
    }
  };
  walk(CONVEX_DIR);
  return modules;
}

export type Backend = ReturnType<typeof convexTest>;

export async function createSeededBackend(): Promise<Backend> {
  process.env.OPENROUTER_API_KEY = '';
  const t = convexTest(schema, loadModules());
  const run = (name: string) => t.mutation(makeFunctionReference<'mutation'>(name) as never, {} as never);
  await run('sampleData:addSampleSuppliers');
  await run('sampleData:addSampleVendor');
  await run('sampleData:addSampleGroupOrders');
  await run('sampleData:addSampleRatings').catch(() => undefined);
  await run('sampleData:addSampleFinancialRecords').catch(() => undefined);
  return t;
}

const u64 = (n: number) => {
  const bytes = Buffer.alloc(8);
  bytes.writeBigUInt64LE(BigInt(n));
  return bytes.toString('base64');
};

type ClientMessage =
  | { type: 'Connect' }
  | {
      type: 'ModifyQuerySet';
      newVersion: number;
      modifications: Array<
        { type: 'Add'; queryId: number; udfPath: string; args: Value[] } | { type: 'Remove'; queryId: number }
      >;
    }
  | { type: 'Mutation' | 'Action'; requestId: number; udfPath: string; args: Value[] }
  | { type: string };

/** Routes the page's Convex WebSocket to the in-memory backend. */
export async function attachBackend(page: Page, t: Backend, log: (line: string) => void = () => {}) {
  await page.routeWebSocket(/convex\.cloud/, (ws: WebSocketRoute) => {
    const queries = new Map<number, { udfPath: string; args: Value }>();
    let querySet = 0;
    let ts = 1;
    let version = { querySet: 0, identity: 0, ts: u64(0) };

    const runQuery = async (queryId: number) => {
      const q = queries.get(queryId)!;
      try {
        const value = await t.query(makeFunctionReference<'query'>(q.udfPath) as never, q.args as never);
        return {
          type: 'QueryUpdated',
          queryId,
          value: convexToJson((value ?? null) as Value),
          logLines: [],
          journal: null,
        };
      } catch (error) {
        log(`query ${q.udfPath} failed: ${(error as Error).message.split('\n')[0]}`);
        return {
          type: 'QueryFailed',
          queryId,
          errorMessage: String((error as Error).message),
          logLines: [],
          journal: null,
        };
      }
    };

    const transition = async (ids: number[], removed: number[] = []) => {
      const modifications = [
        ...(await Promise.all(ids.map(runQuery))),
        ...removed.map((queryId) => ({ type: 'QueryRemoved', queryId })),
      ];
      const endVersion = { querySet, identity: 0, ts: u64(++ts) };
      ws.send(JSON.stringify({ type: 'Transition', startVersion: version, endVersion, modifications }));
      version = endVersion;
    };

    let queue = Promise.resolve();
    ws.onMessage((raw) => {
      const message = JSON.parse(String(raw)) as ClientMessage;
      queue = queue.then(async () => {
        if (message.type === 'ModifyQuerySet' && 'modifications' in message) {
          const added: number[] = [];
          const removed: number[] = [];
          for (const mod of message.modifications) {
            if (mod.type === 'Add') {
              queries.set(mod.queryId, { udfPath: mod.udfPath, args: jsonToConvex(mod.args[0] ?? {}) });
              added.push(mod.queryId);
            } else {
              queries.delete(mod.queryId);
              removed.push(mod.queryId);
            }
          }
          querySet = message.newVersion;
          await transition(added, removed);
        } else if ((message.type === 'Mutation' || message.type === 'Action') && 'udfPath' in message) {
          const kind = message.type === 'Mutation' ? 'mutation' : 'action';
          const ref = makeFunctionReference<typeof kind>(message.udfPath) as never;
          const args = jsonToConvex(message.args[0] ?? {}) as never;
          try {
            const result = kind === 'mutation' ? await t.mutation(ref, args) : await t.action(ref, args);
            const response = {
              requestId: message.requestId,
              success: true,
              result: convexToJson((result ?? null) as Value),
              logLines: [],
            };
            if (kind === 'mutation') {
              ws.send(JSON.stringify({ type: 'MutationResponse', ...response, ts: u64(ts + 1) }));
            } else {
              ws.send(JSON.stringify({ type: 'ActionResponse', ...response }));
            }
          } catch (error) {
            log(`${kind} ${message.udfPath} failed: ${(error as Error).message.split('\n')[0]}`);
            ws.send(
              JSON.stringify({
                type: kind === 'mutation' ? 'MutationResponse' : 'ActionResponse',
                requestId: message.requestId,
                success: false,
                result: `Uncaught Error: ${(error as Error).message.split('\n')[0]}`,
                logLines: [],
              }),
            );
          }
          // Re-run every subscribed query so the UI sees the write.
          await transition([...queries.keys()]);
        }
      });
    });
  });
}
