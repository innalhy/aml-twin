import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const remoteRoot = "/home/debian/agents/twinaml-dev";
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const temporary = mkdtempSync(resolve(tmpdir(), "twinaml-dev-release-"));
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", ...options });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${command} failed; development release stopped`);
}

try {
  // Always build a same-origin, anonymous development client, regardless of local env files.
  run("npm", ["--prefix", "frontend", "run", "build", "--", "--outDir", "dist-dev"], {
    env: { ...process.env, VITE_API_URL: "", VITE_CLERK_PUBLISHABLE_KEY: "", VITE_APP_ENV: "development" },
  });
  run("npm", ["--prefix", "workers/api", "run", "build:node"]);
  const release = resolve(temporary, "release");
  mkdirSync(resolve(release, "workers/api/dist"), { recursive: true });
  cpSync(resolve(root, "workers/api/dist/server.mjs"), resolve(release, "workers/api/dist/server.mjs"));
  cpSync(resolve(root, "frontend/dist-dev"), resolve(release, "frontend/dist"), { recursive: true });
  const index = resolve(release, "frontend/dist/index.html");
  const html = readFileSync(index, "utf8");
  assert.ok(html.includes("</head>"), "Built frontend is missing its HTML head");
  writeFileSync(index, html.replace("</head>", `<meta name="robots" content="noindex,nofollow" /><meta name="twinaml-environment" content="development" /><meta name="twinaml-release" content="${stamp}" /></head>`));
  writeFileSync(resolve(release, "release.json"), JSON.stringify({ environment: "development", release: stamp, builtAt: new Date().toISOString() }) + "\n");
  const archive = resolve(temporary, "release.tar.gz");
  run("tar", ["-czf", archive, "-C", release, "."]);
  const ssh = ["-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes", "-o", "ConnectTimeout=12"];
  run("scp", [...ssh, archive, `ovh-ca:${remoteRoot}/releases/${stamp}.tar.gz`]);
  run("ssh", [...ssh, "ovh-ca", "python3", "-", stamp], { stdio: ["pipe", "inherit", "inherit"], input: String.raw`
import pathlib,sys,os,tarfile,sqlite3,subprocess,time,urllib.request,json
os.umask(0o077)
root=pathlib.Path('/home/debian/agents/twinaml-dev')
stamp=sys.argv[1]
assert stamp.isalnum(), 'Invalid release name'
settings=dict(line.split('=',1) for line in (root/'.env').read_text().splitlines() if line and not line.startswith('#'))
expected={'NODE_ENV':'development','TWINAML_DEV_MODE':'1','HOST':'127.0.0.1','PORT':'8081','TWINAML_DB':str(root/'data/investigation.sqlite'),'TWINAML_FRONTEND_ORIGIN':'https://dev-amltwin.spectrumvps.tech'}
assert all(settings.get(k)==v for k,v in expected.items()), 'Dev runtime configuration mismatch; inspect .env'
previous=(root/'current').resolve(strict=True)
assert previous.parent==root/'releases', 'Unexpected current release location'
release=root/'releases'/stamp
release.mkdir()
archive=root/'releases'/(stamp+'.tar.gz')
with tarfile.open(archive) as bundle: bundle.extractall(release,filter='data')
assert (release/'workers/api/dist/server.mjs').is_file() and (release/'frontend/dist/index.html').is_file(), 'Incomplete release'
archive.unlink()
database=root/'data/investigation.sqlite'
if database.exists():
 with sqlite3.connect(database) as source, sqlite3.connect(root/'backups'/('before-'+stamp+'.sqlite')) as target:
  source.backup(target)
def select(path):
 temporary=root/'current-next'
 temporary.unlink(missing_ok=True)
 temporary.symlink_to(path.relative_to(root))
 temporary.replace(root/'current')
select(release)
try:
 subprocess.run(['systemctl','--user','restart','twinaml-dev.service'],check=True)
 for attempt in range(30):
  try:
   with urllib.request.urlopen('http://127.0.0.1:8081/health',timeout=2) as response: assert json.load(response)['status']=='ok'
   with urllib.request.urlopen('http://127.0.0.1:8081/api/account',timeout=2) as response: assert json.load(response)['enabled']==False
   with urllib.request.urlopen('http://127.0.0.1:8081/',timeout=2) as response: assert ('name="twinaml-release" content="'+stamp+'"').encode() in response.read()
   break
  except Exception:
   if attempt==29: raise
   time.sleep(.2)
except Exception:
 select(previous)
 subprocess.run(['systemctl','--user','restart','twinaml-dev.service'],check=True)
 raise
print(json.dumps({'environment':'development','release':stamp,'health':'ok','previous_release':previous.name}))
` });
  console.log("Development release ready: https://dev-amltwin.spectrumvps.tech");
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
