export const DEFAULT_AUTH_DESTINATION = "/o/sertao-maker/dashboard";

export function getSafeAuthDestination(value: string | null | undefined) {
  if (!value || !value.startsWith("/o/") || value.startsWith("//")) {
    return DEFAULT_AUTH_DESTINATION;
  }

  try {
    const url = new URL(value, "https://proodos.invalid");
    if (url.origin !== "https://proodos.invalid") {
      return DEFAULT_AUTH_DESTINATION;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_AUTH_DESTINATION;
  }
}

export function getSafeCallbackDestination(value: string | null | undefined) {
  if (value === "/redefinir-senha") return value;
  return getSafeAuthDestination(value);
}
