const requestIdPattern = /^[A-Za-z0-9._:-]{1,128}$/;

export function createRequestId(candidate?: string | null) {
  return candidate && requestIdPattern.test(candidate)
    ? candidate
    : crypto.randomUUID();
}

export function isTrustedMutationRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
