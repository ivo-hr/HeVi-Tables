import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const executableExtension = process.platform === "win32" ? ".cmd" : "";
const supabaseBinary = join(
  repositoryRoot,
  "node_modules",
  ".bin",
  `supabase${executableExtension}`
);
const nextBinary = join(
  repositoryRoot,
  "node_modules",
  ".bin",
  `next${executableExtension}`
);

function fail(message) {
  process.stderr.write(`\nLocal development could not start:\n${message}\n\n`);
  process.exit(1);
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    ...options
  });
}

function parseEnvironment(output) {
  const values = {};

  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, name, rawValue] = match;
    const value = rawValue.trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      try {
        values[name] = JSON.parse(value);
        continue;
      } catch {
        // Fall through to a conservative quote removal.
      }
    }
    values[name] = value.replace(/^['"]|['"]$/g, "");
  }

  return values;
}

if (!existsSync(supabaseBinary) || !existsSync(nextBinary)) {
  fail("Run `npm install` first.");
}

const dockerCheck = run("docker", ["info"]);
if (dockerCheck.error?.code === "ENOENT") {
  fail(
    "Docker was not found. Install Docker Engine/Desktop or another Docker-compatible runtime."
  );
}
if (dockerCheck.status !== 0) {
  fail("Docker is installed but is not running or is not accessible to this user.");
}

process.stdout.write("Starting the local Supabase stack…\n");
const startResult = run(supabaseBinary, ["start"], { stdio: "inherit" });
if (startResult.status !== 0) {
  fail("Supabase did not start. Review the Docker output above.");
}

const statusResult = run(supabaseBinary, ["status", "--output", "env"]);
if (statusResult.status !== 0) {
  fail("Supabase started, but its local credentials could not be read.");
}

const local = parseEnvironment(statusResult.stdout);
const apiUrl = local.API_URL;
const anonymousKey = local.ANON_KEY ?? local.PUBLISHABLE_KEY;

if (!apiUrl || !anonymousKey) {
  fail(
    "The Supabase CLI did not return API_URL and ANON_KEY/PUBLISHABLE_KEY."
  );
}

const nextEnvironment = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: apiUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: anonymousKey,
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  HEALTHCHECK_SECRET: "local-development-only"
};

process.stdout.write(
  [
    "",
    "Local services are ready:",
    "  App:             http://localhost:3000",
    `  Supabase API:    ${apiUrl}`,
    `  Supabase Studio: ${local.STUDIO_URL ?? "http://localhost:54323"}`,
    `  Development mail:${local.INBUCKET_URL ? ` ${local.INBUCKET_URL}` : " run `npm run db:status` to view"}`,
    "",
    "Supabase will keep running when Next.js stops.",
    "Use `npm run db:stop` when you are finished.",
    ""
  ].join("\n")
);

const nextArguments = ["dev", ...process.argv.slice(2)];
const nextProcess = spawn(nextBinary, nextArguments, {
  cwd: repositoryRoot,
  env: nextEnvironment,
  stdio: "inherit"
});

nextProcess.on("error", (error) => {
  fail(`Next.js could not start: ${error.message}`);
});

nextProcess.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});
