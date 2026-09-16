import {
  SyncBundle,
  SYNC_BUNDLE_FILE_NAME,
  parseSyncBundle,
} from '@gitroom/helpers/sync/sync.bundle';
import { BRAND_DRIVE_FOLDER } from '@gitroom/helpers/branding/branding';
import { GoogleDriveAuth } from '@postpls/native/plugins';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

/**
 * The offline path. Reads and writes the very same bundle the host writes, so
 * edits made while the desktop was off are waiting for it when it wakes up.
 */
export class DriveTransport {
  private folderId: string | null = null;
  private fileId: string | null = null;

  private async authorized(path: string, init: RequestInit = {}) {
    const { accessToken } = await GoogleDriveAuth.getAccessToken();

    return fetch(path, {
      ...init,
      headers: {
        authorization: `Bearer ${accessToken}`,
        ...(init.headers || {}),
      },
    });
  }

  private async ensureFolder() {
    if (this.folderId) {
      return this.folderId;
    }

    const query = encodeURIComponent(
      `name = '${BRAND_DRIVE_FOLDER}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    );
    const response = await this.authorized(
      `${DRIVE_API}/files?q=${query}&fields=files(id)&pageSize=1`
    );
    const { files } = await response.json();

    if (files?.length) {
      this.folderId = files[0].id;
      return this.folderId!;
    }

    const created = await this.authorized(`${DRIVE_API}/files?fields=id`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: BRAND_DRIVE_FOLDER,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    this.folderId = (await created.json()).id;
    return this.folderId!;
  }

  private async ensureFileId() {
    if (this.fileId) {
      return this.fileId;
    }

    const folderId = await this.ensureFolder();
    const query = encodeURIComponent(
      `name = '${SYNC_BUNDLE_FILE_NAME}' and '${folderId}' in parents and trashed = false`
    );
    const response = await this.authorized(
      `${DRIVE_API}/files?q=${query}&fields=files(id)&pageSize=1`
    );
    const { files } = await response.json();

    this.fileId = files?.length ? files[0].id : null;
    return this.fileId;
  }

  async pull(): Promise<SyncBundle | null> {
    const fileId = await this.ensureFileId();
    if (!fileId) {
      return null;
    }

    const response = await this.authorized(
      `${DRIVE_API}/files/${fileId}?alt=media`
    );

    return response.ok ? parseSyncBundle(await response.text()) : null;
  }

  async push(bundle: SyncBundle): Promise<void> {
    const body = JSON.stringify(bundle, null, 2);
    const fileId = await this.ensureFileId();

    if (fileId) {
      await this.authorized(
        `${DRIVE_UPLOAD_API}/files/${fileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body,
        }
      );
      return;
    }

    // Multipart so the metadata (name, parent folder) and the content land in
    // one request — Drive has no way to create a placed file otherwise.
    const folderId = await this.ensureFolder();
    const boundary = `postpls-${Date.now()}`;
    const multipart =
      `--${boundary}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify({
        name: SYNC_BUNDLE_FILE_NAME,
        parents: [folderId],
      })}\r\n` +
      `--${boundary}\r\ncontent-type: application/json\r\n\r\n${body}\r\n` +
      `--${boundary}--`;

    const created = await this.authorized(
      `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id`,
      {
        method: 'POST',
        headers: { 'content-type': `multipart/related; boundary=${boundary}` },
        body: multipart,
      }
    );

    this.fileId = (await created.json()).id;
  }
}
