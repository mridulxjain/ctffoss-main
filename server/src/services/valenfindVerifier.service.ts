import { config } from '../config/index';

export interface ValenfindVerificationResult {
  valid: boolean;
  valenfindTeamId?: string;
  valenfindTeamSlug?: string;
  valenfindTeamName?: string;
  errorCode?: string;
  error?: string;
}

type VerifierFunction = (flag: string) => Promise<ValenfindVerificationResult>;

let mockVerifierFn: VerifierFunction | null = null;

/**
 * Service responsible for communicating with Valenfind to independently verify
 * submitted challenge flags via an authenticated server-to-server API.
 */
export const valenfindVerifierService = {
  /**
   * Sets a mock verifier implementation for testing environments.
   */
  setMockVerifier(fn: VerifierFunction | null): void {
    mockVerifierFn = fn;
  },

  /**
   * Clears any active mock verifier.
   */
  clearMockVerifier(): void {
    mockVerifierFn = null;
  },

  /**
   * Verifies a submitted flag against Valenfind.
   *
   * @param flag The raw flag string submitted by the participant
   * @returns Verification result including associated Valenfind team identity
   * @throws Error with code 'VERIFIER_UNAVAILABLE' if Valenfind cannot be reached
   * @throws Error with code 'VERIFIER_MISCONFIGURED' if internal credentials are rejected
   */
  async verifyFlag(flag: string): Promise<ValenfindVerificationResult> {
    if (!flag || typeof flag !== 'string' || !flag.trim()) {
      return {
        valid: false,
        errorCode: 'INVALID_FLAG_FORMAT',
        error: 'Flag string cannot be empty',
      };
    }

    // 1. If mock verifier is configured (e.g., in unit/integration tests), use it
    if (mockVerifierFn) {
      return mockVerifierFn(flag.trim());
    }

    // 2. Otherwise invoke the live server-to-server endpoint
    const url = `${config.valenfindUrl.replace(/\/+$/, '')}/api/v1/cards/verify-flag`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': config.valenfindVerifySecret,
        },
        body: JSON.stringify({ flag: flag.trim() }),
        signal: AbortSignal.timeout(5000),
      });

      if (response.status === 401 || response.status === 403) {
        const err = new Error('Valenfind internal verification secret was rejected or misconfigured.');
        (err as any).code = 'VERIFIER_MISCONFIGURED';
        throw err;
      }

      const body = (await response.json()) as {
        success?: boolean;
        data?: {
          valid?: boolean;
          valenfindTeamId?: string;
          valenfindTeamSlug?: string;
          valenfindTeamName?: string;
        };
        error?: {
          code?: string;
          message?: string;
        };
      };

      if (response.status === 200 && body.success && body.data?.valid) {
        return {
          valid: true,
          valenfindTeamId: body.data.valenfindTeamId,
          valenfindTeamSlug: body.data.valenfindTeamSlug,
          valenfindTeamName: body.data.valenfindTeamName,
        };
      }

      return {
        valid: false,
        errorCode: body.error?.code || 'INVALID_FLAG',
        error: body.error?.message || 'Flag is invalid or was not issued.',
      };
    } catch (err: any) {
      if (err.code === 'VERIFIER_MISCONFIGURED') {
        throw err;
      }

      const networkError = new Error(
        `Failed to communicate with Valenfind verification service at ${url}: ${err.message || 'Connection failed'}`
      );
      (networkError as any).code = 'VERIFIER_UNAVAILABLE';
      throw networkError;
    }
  },
};
