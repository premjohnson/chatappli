export interface JwtPayload {
  userId: string;
  tokenVersion: number;
  iat: number;
  exp: number;
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return null;
    }

    const decoded = JSON.parse(atob(payload));

    return decoded as JwtPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(
  token: string,
  clockSkewSeconds = 30
): boolean {
  const payload = decodeToken(token);

  if (!payload) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);

  return payload.exp <= now + clockSkewSeconds;
}