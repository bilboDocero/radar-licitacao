declare module '#auth-utils' {
  interface User {
    id: string;
    email: string;
    name: string;
    roles: string[];
  }
  interface SecureSessionData {
    sid?: string;
    oauth?: { verifier: string; state: string; nonce: string; expiresAt: number };
  }
}
export {};
