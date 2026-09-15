import { Injectable } from '@nestjs/common';
import { Organization, User } from '@prisma/client';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { BRAND_DEEP_LINK_SCHEME } from '@gitroom/helpers/branding/branding';

@Injectable()
export class MobilePairingService {
  /**
   * Mints the credential the Android app carries.
   *
   * It is the same JWT shape the browser gets in its auth cookie — the auth
   * middleware only trusts the `id` claim and re-resolves the user from the
   * database — so pairing grants the phone exactly the access the signed-in
   * browser already has, and nothing more. Revoking it means rotating
   * JWT_SECRET, which is why the UI treats the pairing code as a secret.
   */
  createPairing(user: User, org: Organization) {
    const token = AuthService.signJWT({ id: user.id });
    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';

    const params = new URLSearchParams({
      url: apiUrl,
      org: org.id,
      token,
    });

    return {
      apiUrl,
      organizationId: org.id,
      token,
      deepLink: `${BRAND_DEEP_LINK_SCHEME}://pair?${params.toString()}`,
    };
  }
}
