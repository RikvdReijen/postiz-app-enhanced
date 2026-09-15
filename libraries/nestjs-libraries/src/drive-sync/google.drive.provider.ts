import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { BRAND_DRIVE_FOLDER } from '@gitroom/helpers/branding/branding';
import { SYNC_BUNDLE_FILE_NAME } from '@gitroom/helpers/sync/sync.bundle';

/**
 * Only `drive.file` — PostPls can see the files it created and nothing else in
 * the user's Drive. The email scope is just so the settings screen can show
 * which account the bundle is going to.
 */
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
];

export const driveSyncRedirectUri = () =>
  `${process.env.FRONTEND_URL}/settings/drive-sync`;

const makeClient = (redirectUri = driveSyncRedirectUri()) =>
  new google.auth.OAuth2({
    clientId: process.env.GOOGLE_DRIVE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    redirectUri,
  });

const authorized = (refreshToken: string) => {
  const client = makeClient();
  client.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: 'v3', auth: client });
};

@Injectable()
export class GoogleDriveProvider {
  get configured() {
    return (
      !!process.env.GOOGLE_DRIVE_CLIENT_ID &&
      !!process.env.GOOGLE_DRIVE_CLIENT_SECRET
    );
  }

  generateAuthUrl(state: string) {
    return makeClient().generateAuthUrl({
      access_type: 'offline',
      // Without this Google only hands back a refresh token the very first time
      // an account authorizes, and reconnecting would silently produce a
      // sync that dies as soon as the access token expires.
      prompt: 'consent',
      state,
      scope: SCOPES,
    });
  }

  async exchangeCode(code: string) {
    const client = makeClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const { data } = await google
      .oauth2({ version: 'v2', auth: client })
      .userinfo.get();

    return {
      refreshToken: tokens.refresh_token!,
      email: data.email!,
    };
  }

  /** The folder is visible in the user's Drive on purpose, so it can be shared. */
  async findOrCreateFolder(refreshToken: string) {
    const drive = authorized(refreshToken);
    const { data } = await drive.files.list({
      q: `name = '${BRAND_DRIVE_FOLDER}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id)',
      pageSize: 1,
    });

    if (data.files?.length) {
      return data.files[0].id!;
    }

    const created = await drive.files.create({
      requestBody: {
        name: BRAND_DRIVE_FOLDER,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });

    return created.data.id!;
  }

  async findBundle(refreshToken: string, folderId: string) {
    const drive = authorized(refreshToken);
    const { data } = await drive.files.list({
      q: `name = '${SYNC_BUNDLE_FILE_NAME}' and '${folderId}' in parents and trashed = false`,
      fields: 'files(id)',
      pageSize: 1,
    });

    return data.files?.length ? data.files[0].id! : null;
  }

  async readBundle(refreshToken: string, fileId: string) {
    const drive = authorized(refreshToken);
    const { data } = await drive.files.get({ fileId, alt: 'media' });

    // `alt: media` hands back the parsed body when Drive reports JSON, so
    // normalise to the raw string the bundle parser expects.
    return typeof data === 'string' ? data : JSON.stringify(data);
  }

  async writeBundle(
    refreshToken: string,
    folderId: string,
    fileId: string | null,
    body: string
  ) {
    const drive = authorized(refreshToken);
    const media = { mimeType: 'application/json', body };

    if (fileId) {
      const { data } = await drive.files.update({ fileId, media, fields: 'id' });
      return data.id!;
    }

    const { data } = await drive.files.create({
      requestBody: {
        name: SYNC_BUNDLE_FILE_NAME,
        parents: [folderId],
        mimeType: 'application/json',
      },
      media,
      fields: 'id',
    });

    return data.id!;
  }
}
