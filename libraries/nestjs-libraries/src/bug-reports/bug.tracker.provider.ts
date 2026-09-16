import { Injectable } from '@nestjs/common';

const GITHUB_API = 'https://api.github.com';

/**
 * The GitHub half of bug reporting: turns PostPls-scope reports into issues,
 * and optionally pokes a workflow that can act on them.
 *
 * Deliberately thin and generic — it knows nothing about what a bug report is,
 * only how to file an issue and fire a dispatch, so the service owns all the
 * policy.
 */
@Injectable()
export class BugTrackerProvider {
  get configured() {
    return !!process.env.POSTPLS_GITHUB_TOKEN;
  }

  get defaultRepository() {
    return process.env.POSTPLS_GITHUB_REPOSITORY || '';
  }

  private request(path: string, body: unknown) {
    return fetch(`${GITHUB_API}${path}`, {
      method: 'POST',
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${process.env.POSTPLS_GITHUB_TOKEN}`,
        'content-type': 'application/json',
        'x-github-api-version': '2022-11-28',
      },
      body: JSON.stringify(body),
    });
  }

  async createIssue(
    repository: string,
    issue: { title: string; body: string; labels: string[] }
  ) {
    const response = await this.request(`/repos/${repository}/issues`, issue);

    if (!response.ok) {
      const detail = await response.text();
      // 410 is GitHub's answer when Issues are disabled on the repository,
      // which is a setting problem rather than a bug — say so plainly.
      throw new Error(
        response.status === 410
          ? `Issues are disabled on ${repository}; enable them in the repository settings.`
          : `GitHub refused the issue (${response.status}): ${detail.slice(0, 300)}`
      );
    }

    const created = await response.json();
    return { url: created.html_url as string, number: created.number as number };
  }

  /**
   * Fires a repository_dispatch. A workflow listening for this event type is
   * what actually runs Claude Code — the host never holds an Anthropic key.
   */
  async dispatch(
    repository: string,
    eventType: string,
    clientPayload: Record<string, unknown>
  ) {
    const response = await this.request(`/repos/${repository}/dispatches`, {
      event_type: eventType,
      client_payload: clientPayload,
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `GitHub refused the dispatch (${response.status}): ${detail.slice(0, 300)}`
      );
    }
  }
}
