import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const binaryExtensions = new Set([
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".pdf",
  ".png",
  ".webp",
  ".woff",
  ".woff2",
]);

const signatures = [
  {
    name: "private key",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  { name: "Supabase secret key", pattern: /\bsb_secret_[A-Za-z0-9_-]{16,}/ },
  { name: "GitHub token", pattern: /\bgh[opsu]_[A-Za-z0-9]{20,}/ },
  { name: "Google API key", pattern: /\bAIza[0-9A-Za-z_-]{30,}/ },
  {
    name: "assigned server secret",
    pattern:
      /(?:SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|GOOGLE_PRIVATE_KEY)[ \t]*=[ \t]*["']?[^\s"'#][^\s"']*/,
  },
];

function trackedFiles() {
  return execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { encoding: "utf8" },
  )
    .split("\0")
    .filter(Boolean);
}

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function hasServiceRoleJwt(content) {
  const candidates =
    content.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) ?? [];
  return candidates.some((candidate) => {
    try {
      const payload = JSON.parse(
        Buffer.from(candidate.split(".")[1] ?? "", "base64url").toString(
          "utf8",
        ),
      );
      return payload.role === "service_role";
    } catch {
      return false;
    }
  });
}

const includeBundle = process.argv.includes("--bundle");
const files = [
  ...trackedFiles(),
  ...(includeBundle ? [...walk(".next/server"), ...walk(".next/static")] : []),
];
const findings = [];

for (const file of new Set(files)) {
  if (binaryExtensions.has(extname(file).toLowerCase())) continue;
  if (!existsSync(file) || statSync(file).size > 2_000_000) continue;
  const content = readFileSync(file, "utf8");
  for (const signature of signatures) {
    if (signature.pattern.test(content))
      findings.push(`${file}: ${signature.name}`);
  }
  if (hasServiceRoleJwt(content)) findings.push(`${file}: service-role JWT`);
}

if (findings.length > 0) {
  console.error("Possíveis segredos encontrados:\n" + findings.join("\n"));
  process.exit(1);
}

console.log(
  `Scan concluído em ${files.length} arquivos sem segredos elevados.`,
);
