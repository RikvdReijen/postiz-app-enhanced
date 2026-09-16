import { readJson, writeJson } from '@postpls/state/storage';
import { Pairing } from '@postpls/state/pairing';

const QUEUE_KEY = 'postpls.bugReports';

export interface QueuedBugReport {
  id: string;
  title: string;
  description: string;
  scope: 'POSTPLS' | 'UPSTREAM';
  route: string;
  platform: string;
  appVersion?: string;
  diagnostics?: string;
  createdAt: string;
}

/**
 * Reports are queued locally first.
 *
 * The moment you most want to report a bug is the moment something is broken,
 * which is often the moment the host is unreachable — so nothing here depends
 * on the host being up.
 */
export const loadQueue = () => readJson<QueuedBugReport[]>(QUEUE_KEY, []);

export const queueReport = async (report: QueuedBugReport) => {
  const queue = await loadQueue();
  const next = [...queue, report];
  await writeJson(QUEUE_KEY, next);
  return next;
};

export const removeFromQueue = async (id: string) => {
  const queue = await loadQueue();
  const next = queue.filter((report) => report.id !== id);
  await writeJson(QUEUE_KEY, next);
  return next;
};

/**
 * Sends whatever is queued. Called after a successful sync, since that is the
 * moment the host is known to be reachable.
 */
export const flushQueue = async (pairing: Pairing) => {
  const queue = await loadQueue();
  if (!queue.length) {
    return { sent: 0, remaining: 0 };
  }

  let sent = 0;
  for (const report of queue) {
    try {
      const response = await fetch(`${pairing.apiUrl}/bug-reports`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          auth: pairing.token,
          showorg: pairing.organizationId,
        },
        body: JSON.stringify({
          title: report.title,
          description: report.description,
          scope: report.scope,
          route: report.route,
          platform: report.platform,
          appVersion: report.appVersion,
          diagnostics: report.diagnostics,
        }),
      });

      if (response.ok) {
        await removeFromQueue(report.id);
        sent++;
      }
    } catch (err) {
      // Leave it queued; the next sync tries again.
      break;
    }
  }

  return { sent, remaining: (await loadQueue()).length };
};
