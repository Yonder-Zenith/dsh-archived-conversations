/**
 * Host half of the archived-conversations bundle.
 *
 * The browser panel cannot read session-persistence sizes or remove session
 * log directories through Client services, so this half exposes two
 * authenticated connection routes:
 *
 * - GET  /api/archived-conversations        archived session log sizes
 * - POST /api/archived-conversations/delete move one archived session's log
 *                                           directory to the DSH trash folder
 *
 * DSH has no first-party session-deletion API (the persistence seam has no
 * delete). Deletion is therefore an explicit file move under $DSH_HOME: the
 * whole session directory leaves the persistence root, the archive id is
 * dropped through the registry, and the browser refreshes its session list.
 * The moved directory stays recoverable in $DSH_HOME/session-trash.
 */
import { mkdir, readdir, rename } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';

export const inject = ['connection', 'sessions', 'sessionPersistence', 'sessionQuery', 'workspaceRegistry'];

const LIST_PATH = '/api/archived-conversations';
const DELETE_PATH = '/api/archived-conversations/delete';
const LOG_FILE = /^session(?:\.[^.]+)?\.jsonl(?:\.zstd)?$/u;

/**
 * Serialize one route result.
 * @param value - JSON value.
 * @param status - HTTP status.
 * @returns JSON response.
 */
function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

/**
 * Describe a thrown value without leaking a stack.
 * @param error - thrown value.
 * @returns message.
 */
function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Resolve the DSH home and the directories this feature owns.
 * @returns paths, or null when neither environment variable is available.
 */
function dshPaths() {
  const home = process.env.DSH_HOME !== undefined && process.env.DSH_HOME !== ''
    ? resolve(process.env.DSH_HOME)
    : process.env.DSH_PROFILE_DIR !== undefined && process.env.DSH_PROFILE_DIR !== ''
      ? resolve(process.env.DSH_PROFILE_DIR, '..', '..')
      : null;
  if (home === null) return null;
  return {
    home,
    root: join(home, 'sessions'),
    trash: join(home, 'session-trash'),
  };
}

/**
 * One archive id list from the authoritative registry.
 * @param ctx - Host context.
 * @returns archived session ids as strings.
 */
function archivedIds(ctx) {
  return (ctx.workspaceRegistry.archivedSessionIds ?? []).map(String);
}

/**
 * Turn an arbitrary session id into one safe trash-directory segment.
 * @param value - session id.
 * @returns a bounded filesystem-safe segment.
 */
function safeSegment(value) {
  const safe = value.replace(/[^A-Za-z0-9_-]/gu, '_').slice(0, 120);
  return safe === '' ? 'session' : safe;
}

/**
 * Find the session-owned directory under the persistence root. The JSONL
 * backend names the directory with the injectively escaped session id; the
 * shipped ids are already safe segments, so an exact match is the common path.
 * The walk stops at the project/session depth and accepts only a directory
 * that actually contains a canonical log file.
 * @param root - persistence root.
 * @param sessionId - session identity.
 * @returns matching absolute directories.
 */
async function findSessionDirectories(root, sessionId) {
  const matches = [];
  const visit = async (dir, depth) => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const full = join(dir, entry.name);
      if (entry.name === sessionId) {
        let files;
        try {
          files = await readdir(full);
        } catch {
          continue;
        }
        if (files.some((name) => LOG_FILE.test(name))) matches.push(full);
        continue;
      }
      if (depth < 1) await visit(full, depth + 1);
    }
  };
  await visit(root, 0);
  return matches;
}

/**
 * List archived sessions with the selected log generation's byte size.
 * @param ctx - Host context.
 * @param request - authenticated route request.
 * @returns JSON response.
 */
async function listArchived(ctx, request) {
  try {
    if (ctx.sessionPersistence === undefined) {
      return json({ error: 'session persistence is unavailable' }, 500);
    }
    const archived = archivedIds(ctx);
    const snapshots = archived.length === 0
      ? []
      : await ctx.sessionPersistence.list({ signal: request.signal });
    const byId = new Map();
    for (const snapshot of snapshots) byId.set(String(snapshot.header.id), snapshot);
    const sessions = archived.map((id) => {
      const snapshot = byId.get(id);
      return {
        id,
        sizeBytes: snapshot?.sizeBytes ?? null,
        eventCount: snapshot?.eventCount ?? null,
        formatStatus: snapshot?.formatStatus ?? null,
      };
    });
    const totalBytes = sessions.reduce(
      (sum, session) => sum + (typeof session.sizeBytes === 'number' ? session.sizeBytes : 0),
      0,
    );
    return json({ sessions, totalBytes });
  } catch (error) {
    return json({ error: messageOf(error) }, 500);
  }
}

/**
 * Move one archived session's log directory to the DSH trash folder and drop
 * its archive id. The session must still be archived and not live; a missing
 * stored log only clears the stale archive id.
 * @param ctx - Host context.
 * @param request - authenticated route request.
 * @returns JSON response.
 */
async function deleteArchived(ctx, request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid JSON body' }, 400);
  }
  const sessionId = body !== null && typeof body === 'object' && typeof body.sessionId === 'string'
    ? body.sessionId
    : '';
  if (sessionId === '' || sessionId.length > 200) {
    return json({ error: 'sessionId is required' }, 400);
  }

  try {
    if (!archivedIds(ctx).includes(sessionId)) {
      return json({ error: 'session is not archived' }, 409);
    }
    if (ctx.sessions.get(sessionId) !== undefined) {
      return json({ error: 'session is active; archive it before deleting' }, 409);
    }
    if (ctx.sessionPersistence === undefined) {
      return json({ error: 'session persistence is unavailable' }, 500);
    }
    try {
      const lineage = await ctx.sessionQuery.traceSession(sessionId, request.signal);
      if (lineage.descendants.length > 0) {
        return json({ error: 'session has descendant sessions; delete them first' }, 409);
      }
    } catch (error) {
      // Deleting a parent without proving its subtree absent would orphan the
      // children; refuse when lineage cannot be resolved.
      return json({ error: `could not verify session descendants: ${messageOf(error)}` }, 409);
    }

    const snapshot = await ctx.sessionPersistence.stat(sessionId, { signal: request.signal });
    if (snapshot === undefined) {
      await ctx.workspaceRegistry.unarchiveSession(sessionId);
      return json({
        deleted: true,
        missing: true,
        sizeBytes: null,
        eventCount: null,
        unarchived: true,
      });
    }

    const paths = dshPaths();
    if (paths === null) return json({ error: 'DSH_HOME is not available' }, 500);
    const directories = await findSessionDirectories(paths.root, sessionId);
    if (directories.length === 0) {
      return json({ error: `session log directory not found under ${paths.root}` }, 404);
    }
    if (directories.length > 1) {
      return json({ error: 'multiple session log directories matched this id' }, 409);
    }
    const source = directories[0];
    const inside = relative(paths.root, source);
    if (inside.startsWith('..') || isAbsolute(inside)) {
      return json({ error: 'session log directory escaped the persistence root' }, 500);
    }

    await mkdir(paths.trash, { recursive: true });
    const target = join(
      paths.trash,
      `${safeSegment(sessionId)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    await rename(source, target);

    let unarchived = true;
    let warning = null;
    try {
      await ctx.workspaceRegistry.unarchiveSession(sessionId);
    } catch (error) {
      unarchived = false;
      warning = messageOf(error);
    }
    return json({
      deleted: true,
      missing: false,
      sizeBytes: snapshot.sizeBytes ?? null,
      eventCount: snapshot.eventCount ?? null,
      trashedTo: target,
      unarchived,
      ...(warning === null ? {} : { warning }),
    });
  } catch (error) {
    return json({ error: messageOf(error) }, 500);
  }
}

/**
 * Register the authenticated size and trash routes.
 * @param ctx - Host context.
 */
export function apply(ctx) {
  ctx.effect(() => {
    const disposers = [
      ctx.connection.fetch.register({
        path: LIST_PATH,
        methods: ['GET'],
        requestBody: 'buffered',
        fetch: (request) => listArchived(ctx, request),
      }),
      ctx.connection.fetch.register({
        path: DELETE_PATH,
        methods: ['POST'],
        requestBody: 'buffered',
        fetch: (request) => deleteArchived(ctx, request),
      }),
    ];
    return () => {
      for (const dispose of disposers) void dispose();
    };
  }, 'archived-conversations: routes');
}
