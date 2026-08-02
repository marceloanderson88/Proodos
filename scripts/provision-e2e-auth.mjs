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
  const publicKey = requiredEnvironmentVariable("SUPABASE_LOCAL_PUBLIC_KEY");
  const email = requiredEnvironmentVariable("E2E_TEST_EMAIL");
  const password = requiredEnvironmentVariable("E2E_TEST_PASSWORD");
  const supabase = createClient(supabaseUrl, adminKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  for (const userId of syntheticUserIds) {
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      password,
    });
    if (error) {
      throw new Error(
        `Falha ao provisionar usuário sintético ${userId}: ${error.name} (${error.status ?? "sem status"})`,
      );
    }
    if (data.user.id !== userId || !data.user.email_confirmed_at) {
      throw new Error(
        `Usuário sintético ${userId} não foi confirmado corretamente.`,
      );
    }
  }

  const publicClient = createClient(supabaseUrl, publicKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  const { data: signInData, error: signInError } =
    await publicClient.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(
      `Credenciais sintéticas não criaram sessão: ${signInError.name} (${signInError.status ?? "sem status"})`,
    );
  }
  if (signInData.user.id !== syntheticUserIds[0] || !signInData.session) {
    throw new Error(
      "A sessão sintética não corresponde ao usuário E2E esperado.",
    );
  }
  await publicClient.auth.signOut({ scope: "local" });

  console.log(
    `${syntheticUserIds.length} usuários sintéticos provisionados e login local verificado.`,
  );
}

await provisionSyntheticPasswords();
