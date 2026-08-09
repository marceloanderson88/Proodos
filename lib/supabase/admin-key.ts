type AdminKeyInput = {
  appEnv: string | undefined;
  localAdminKey: string | undefined;
  secretKey: string | undefined;
  supabaseUrl: string;
};

function isLocalSupabaseUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "http:" &&
      (url.hostname === "127.0.0.1" || url.hostname === "localhost")
    );
  } catch {
    return false;
  }
}

export function resolveSupabaseAdminKey({
  appEnv,
  localAdminKey,
  secretKey,
  supabaseUrl,
}: AdminKeyInput) {
  const configuredSecret = secretKey?.trim();
  if (configuredSecret) return configuredSecret;

  const ephemeralLocalKey = localAdminKey?.trim();
  if (
    appEnv === "test" &&
    ephemeralLocalKey &&
    isLocalSupabaseUrl(supabaseUrl)
  ) {
    return ephemeralLocalKey;
  }

  throw new Error("SUPABASE_SECRET_KEY_NOT_CONFIGURED");
}
