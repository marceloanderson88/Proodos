export const DEFAULT_AUTH_DESTINATION = "/o";

function isInvitationAcceptancePath(value: string) {
  return (
    value === "/convites/aceitar" || value.startsWith("/convites/aceitar?")
  );
}

export function getSafeAuthDestination(value: string | null | undefined) {
  const allowed =
    value === "/o" ||
    value?.startsWith("/o/") ||
    (value ? isInvitationAcceptancePath(value) : false);
  if (!value || !allowed || value.startsWith("//")) {
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
  if (value && isInvitationAcceptancePath(value) && !value.startsWith("//")) {
    try {
      const url = new URL(value, "https://proodos.invalid");
      if (url.origin === "https://proodos.invalid") {
        return `${url.pathname}${url.search}`;
      }
    } catch {
      return DEFAULT_AUTH_DESTINATION;
    }
  }
  return getSafeAuthDestination(value);
}
