import { createClient } from "@supabase/supabase-js";

const syntheticUserIds = [
  "90000000-0000-4000-8000-000000000001",
  "90000000-0000-4000-8000-000000000002",
];

function requiredEnvironmentVariable(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Variável obrigatória ausente: ${name}`);
  }
  return value;
}

function assertLocalSupabaseUrl(rawUrl) {
  const url = new URL(rawUrl);
  if (
    url.protocol !== "http:" ||
    !["127.0.0.1", "localhost"].includes(url.hostname)
  ) {
    throw new Error(
      "O provisionamento E2E só pode executar contra o Supabase local.",
    );
  }
  return url.origin;
}

async function provisionSyntheticPasswords() {
  const supabaseUrl = assertLocalSupabaseUrl(
    requiredEnvironmentVariable("SUPABASE_LOCAL_URL"),
  );
  const adminKey = requiredEnvironmentVariable("SUPABASE_LOCAL_ADMIN_KEY");
  const password = requiredEnvironmentVariable("E2E_TEST_PASSWORD");
  const supabase = createClient(supabaseUrl, adminKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const userId of syntheticUserIds) {
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      password,
    });
    if (error) {
      throw new Error(
        `Falha ao provisionar usuário sintético ${userId}: ${error.message}`,
      );
    }
    if (data.user.id !== userId || !data.user.email_confirmed_at) {
      throw new Error(
        `Usuário sintético ${userId} não foi confirmado corretamente.`,
      );
    }
  }

  console.log(
    `${syntheticUserIds.length} usuários sintéticos provisionados no Supabase local.`,
  );
}

await provisionSyntheticPasswords();
