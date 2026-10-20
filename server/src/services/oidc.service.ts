import { URL } from 'url';
import { config } from '../config/index';
import { signToken, verifyJwtToken } from '../utils/crypto';

export interface OidcTransactionState {
  state: string;
  nonce: string;
  codeVerifier: string;
  createdAt: number;
}

export interface OidcVerifiedClaims {
  sub: string;
  email?: string;
  email_verified?: boolean;
  userinfoSubMismatch?: boolean;
  preferred_username?: string;
  name?: string;
  picture?: string;
  member?: boolean;
  role?: string | string[] | null;
  roles?: string | string[] | null;
  groups?: string | string[] | null;
}

export type OidcMockHandler = (params: {
  currentUrl: URL;
  expectedState: string;
  expectedNonce: string;
  codeVerifier: string;
}) => Promise<OidcVerifiedClaims>;

let clientConfigPromise: Promise<any> | null = null;
let mockHandler: OidcMockHandler | null = null;

async function getClientLib() {
  return await import('openid-client');
}

export const oidcService = {
  /**
   * Discovers and caches the OpenID Connect provider configuration.
   */
  async getProviderConfig(): Promise<any> {
    if (mockHandler) {
      return {
        issuer: config.oidcIssuer,
        authorization_endpoint: `${config.oidcIssuer}/auth`,
        token_endpoint: `${config.oidcIssuer}/token`,
      };
    }

    if (!clientConfigPromise) {
      clientConfigPromise = (async () => {
        const oidc = await getClientLib();
        const issuerUrl = new URL(config.oidcIssuer);
        return await oidc.discovery(
          issuerUrl,
          config.oidcClientId,
          config.oidcClientSecret
        );
      })();
    }
    return await clientConfigPromise;
  },

  /**
   * Generates authorization URL, PKCE challenge, state, and nonce.
   */
  async createAuthorizationRequest(): Promise<{
    authorizationUrl: string;
    transaction: OidcTransactionState;
    signedTxCookie: string;
  }> {
    const oidc = await getClientLib();
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();

    const providerConfig = await this.getProviderConfig();

    let authorizationUrl: string;
    if (mockHandler) {
      const url = new URL(`${config.oidcIssuer}/auth`);
      url.searchParams.set('client_id', config.oidcClientId);
      url.searchParams.set('redirect_uri', config.oidcRedirectUri);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('scope', config.oidcScopes);
      url.searchParams.set('state', state);
      url.searchParams.set('nonce', nonce);
      url.searchParams.set('code_challenge', codeChallenge);
      url.searchParams.set('code_challenge_method', 'S256');
      authorizationUrl = url.toString();
    } else {
      const url = oidc.buildAuthorizationUrl(providerConfig, {
        redirect_uri: config.oidcRedirectUri,
        scope: config.oidcScopes,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state,
        nonce,
      });
      authorizationUrl = url.toString();
    }

    const transaction: OidcTransactionState = {
      state,
      nonce,
      codeVerifier,
      createdAt: Date.now(),
    };

    // Encapsulate transaction state in a signed, tamper-proof token
    const signedTxCookie = signToken(transaction, '10m');

    return {
      authorizationUrl,
      transaction,
      signedTxCookie,
    };
  },

  /**
   * Decodes and validates the transaction cookie bound to the initiating browser.
   */
  verifyTransactionCookie(signedCookie?: string | null): OidcTransactionState | null {
    if (!signedCookie) return null;
    const payload = verifyJwtToken<OidcTransactionState>(signedCookie);
    if (!payload || !payload.state || !payload.codeVerifier) {
      return null;
    }
    return payload;
  },

  /**
   * Processes the OIDC authorization callback, validates PKCE, state, nonce, and claims.
   */
  async processCallback(params: {
    callbackUrl: URL;
    transaction: OidcTransactionState;
  }): Promise<OidcVerifiedClaims> {
    const { callbackUrl, transaction } = params;

    // Check if provider returned an error in the query
    const errorParam = callbackUrl.searchParams.get('error');
    if (errorParam) {
      const errorDesc = callbackUrl.searchParams.get('error_description') || errorParam;
      const err = new Error(`OIDC provider returned error: ${errorDesc}`);
      (err as any).code = 'OIDC_CALLBACK_ERROR';
      (err as any).oidcError = errorParam;
      throw err;
    }

    const returnedState = callbackUrl.searchParams.get('state');
    if (!returnedState || returnedState !== transaction.state) {
      const err = new Error('Invalid or mismatched state parameter');
      (err as any).code = 'INVALID_STATE';
      throw err;
    }

    // Use mock handler in test environment if configured
    if (mockHandler) {
      return await mockHandler({
        currentUrl: callbackUrl,
        expectedState: transaction.state,
        expectedNonce: transaction.nonce,
        codeVerifier: transaction.codeVerifier,
      });
    }

    const oidc = await getClientLib();
    const providerConfig = await this.getProviderConfig();

    try {
      const tokens = await oidc.authorizationCodeGrant(providerConfig, callbackUrl, {
        pkceCodeVerifier: transaction.codeVerifier,
        expectedState: transaction.state,
        expectedNonce: transaction.nonce,
      });

      const claims = tokens.claims();
      if (!claims || !claims.sub) {
        const err = new Error('ID token is missing the required "sub" claim');
        (err as any).code = 'INVALID_CLAIMS';
        throw err;
      }

      let userinfoClaims: any = {};
      let userinfoSubMismatch = false;
      if (tokens.access_token && providerConfig.userinfo_endpoint) {
        try {
          const fetched = await oidc.fetchUserInfo(providerConfig, tokens.access_token, claims.sub);
          if (fetched) {
            // Security requirement: Ensure UserInfo belongs to the same validated OIDC subject as the ID token
            if (fetched.sub && fetched.sub !== claims.sub) {
              console.warn(
                `⚠️  [OIDC_CALLBACK:USERINFO_MISMATCH] UserInfo sub ("${fetched.sub}") does not match ID token sub ("${claims.sub}"). Rejecting UserInfo claims.`
              );
              userinfoSubMismatch = true;
            } else {
              userinfoClaims = fetched;
            }
          }
        } catch {
          // Fallback cleanly to ID token claims if userinfo is not available
        }
      }

      const merged = { ...claims, ...userinfoClaims };

      return {
        sub: merged.sub,
        email: merged.email as string | undefined,
        email_verified: merged.email_verified as boolean | undefined,
        userinfoSubMismatch,
        preferred_username: merged.preferred_username as string | undefined,
        name: merged.name as string | undefined,
        picture: merged.picture as string | undefined,
        member: merged.member as boolean | undefined,
        role: (merged.role ?? merged.roles ?? merged.groups) as string | string[] | null | undefined,
        roles: merged.roles as string | string[] | null | undefined,
        groups: merged.groups as string | string[] | null | undefined,
      };
    } catch (err: any) {
      if (err.code) throw err;
      const wrapped = new Error('OIDC authorization code grant failed');
      (wrapped as any).code = 'OIDC_GRANT_FAILED';
      (wrapped as any).originalMessage = err.message;
      throw wrapped;
    }
  },

  /**
   * Testing hook to mock callback verification without contacting production provider.
   */
  setMockHandler(handler: OidcMockHandler | null): void {
    mockHandler = handler;
  },

  clearMockHandler(): void {
    mockHandler = null;
    clientConfigPromise = null;
  },
};
