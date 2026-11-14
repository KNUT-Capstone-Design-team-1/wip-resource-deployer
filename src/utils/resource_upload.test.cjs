const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const syncFs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

// Exercise the real publisher without credentials or network access.
function loadModule(name, directory, cache = new Map()) {
  const filename = path.join(__dirname, `${name}.ts`);
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = new Module(filename, module);
  cache.set(filename, mod);
  mod.filename = filename;
  mod.require = function (specifier) {
    if (specifier === "@google-cloud/storage")
      return {
        Storage: class {
          constructor() {
            throw Error("Tests must explicitly supply fake storage");
          }
        },
      };
    if (specifier === "./paths") return { RESOURCE_DIRECTORY: directory };
    if (specifier === "./logger") return { info() {}, error() {}, debug() {} };
    if (specifier.startsWith("./"))
      return loadModule(specifier.slice(2), directory, cache);
    return require(specifier);
  };
  const output = ts.transpileModule(syncFs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2016,
      esModuleInterop: true,
    },
    reportDiagnostics: true,
  });
  assert.equal(output.diagnostics.length, 0);
  mod._compile(output.outputText, filename);
  return mod.exports;
}

function fakeStorage() {
  const objects = new Map();
  const saves = [];
  let sequence = 0;
  const storage = {
    objects,
    saves,
    failPath: undefined,
    beforeSave: undefined,
    bucket(name) {
      assert.equal(name, "wip-bucket");
      return {
        file(name) {
          return {
            async getMetadata() {
              if (!objects.has(name))
                throw Object.assign(Error("missing"), { code: 404 });
              return [{ generation: objects.get(name).generation }];
            },
            async download(options) {
              assert.equal(options.decompress, false);
              return [objects.get(name).body];
            },
            async save(body, options) {
              await storage.beforeSave?.(name);
              if (name === storage.failPath)
                throw Object.assign(Error("upload failed"), { code: 503 });
              const expected = options.preconditionOpts?.ifGenerationMatch;
              const current = objects.get(name)?.generation || 0;
              if (
                expected !== undefined &&
                String(expected) !== String(current)
              ) {
                throw Object.assign(Error("generation changed"), { code: 412 });
              }
              assert.equal(options.gzip, false);
              assert.equal(options.metadata.contentEncoding, undefined);
              assert.equal(options.validation, "crc32c");
              const object = {
                body: Buffer.from(body),
                metadata: options.metadata,
                generation: String(++sequence),
              };
              saves.push(name);
              objects.set(name, object);
            },
          };
        },
      };
    },
  };
  return storage;
}

async function fixture(t) {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "wip-resource-upload-"),
  );
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const cache = new Map();
  const uploader = loadModule("resource_upload", directory, cache);
  const builder = loadModule("resource_pages", directory, cache);
  const rows = [{ ITEM_SEQ: "1", name: "\uC54C\uC57D" }];
  await fs.writeFile(
    path.join(directory, "pill_data.json"),
    JSON.stringify({ resources: rows }),
  );
  await builder.createPillDataPages(rows, directory);
  return { directory, uploader, storage: fakeStorage(), cache };
}

test("snapshot uploads pages, immutable manifest and original before latest; metadata and backup are automatic", async (t) => {
  const { directory, uploader, storage } = await fixture(t);
  await uploader.uploadPillDataResources(directory, storage, "wip-bucket");
  assert.equal(storage.saves.length, 7);
  assert.equal(storage.saves.at(-2), "pill_data.json");
  assert.equal(storage.saves.at(-1), "resource-pages/latest.json");
  assert.equal(
    storage.objects.get("resource-pages/latest.json").metadata.cacheControl,
    "no-store",
  );
  for (const name of storage.saves.slice(0, 4)) {
    assert.equal(
      storage.objects.get(name).metadata.contentType,
      "application/octet-stream",
    );
  }
  const histories = await fs.readdir(path.join(directory, "backups"), {
    recursive: true,
  });
  assert(histories.some((name) => name.endsWith("pill_data.json")));
  assert(histories.some((name) => name.endsWith("latest.json")));
});

test("page upload failure leaves latest unchanged and preserves local files", async (t) => {
  const { directory, uploader, storage } = await fixture(t);
  const first = JSON.parse(
    await fs.readFile(
      path.join(directory, "resource-pages/latest.json"),
      "utf8",
    ),
  );
  storage.failPath = first.tables.pill_data.pages["5000"][0].files.br.path;
  await assert.rejects(
    uploader.uploadPillDataResources(directory, storage),
    /upload failed/,
  );
  assert.equal(storage.objects.has("resource-pages/latest.json"), false);
  assert.equal(storage.objects.has("pill_data.json"), false);
  await fs.access(path.join(directory, "pill_data.json"));
  await fs.access(path.join(directory, "backups"));
});

test("successful reruns reuse identical immutable objects", async (t) => {
  const { directory, uploader, storage } = await fixture(t);
  await uploader.uploadPillDataResources(directory, storage);
  const initialCount = storage.saves.length;
  await uploader.uploadPillDataResources(directory, storage);
  assert.deepEqual(storage.saves.slice(initialCount), [
    "pill_data.json",
    "resource-pages/latest.json",
  ]);
});

test("a concurrent publisher cannot be overwritten at latest", async (t) => {
  const { directory, uploader, storage } = await fixture(t);
  const other = Buffer.from("another snapshot");
  storage.beforeSave = (name) => {
    if (name === "resource-pages/latest.json")
      storage.objects.set(name, { body: other, generation: "999" });
  };
  await assert.rejects(
    uploader.uploadPillDataResources(directory, storage),
    /generation changed/,
  );
  assert.deepEqual(
    storage.objects.get("resource-pages/latest.json").body,
    other,
  );
});

test("stale original data and corrupt local pages fail before writes to GCS", async (t) => {
  const { directory, uploader, storage } = await fixture(t);
  const raw = path.join(directory, "pill_data.json");
  const original = await fs.readFile(raw);
  await fs.writeFile(raw, JSON.stringify({ resources: [{ ITEM_SEQ: "2" }] }));
  await assert.rejects(
    uploader.uploadPillDataResources(directory, storage),
    /does not match/,
  );
  await fs.writeFile(raw, original);
  const manifest = JSON.parse(
    await fs.readFile(
      path.join(directory, "resource-pages/latest.json"),
      "utf8",
    ),
  );
  const page = manifest.tables.pill_data.pages["5000"][0].files.gzip.path;
  await fs.writeFile(path.join(directory, page), "corrupt");
  await assert.rejects(
    uploader.uploadPillDataResources(directory, storage),
    /checksum mismatch/,
  );
  assert.equal(storage.saves.length, 0);
});

test("ordinary resources back up locally and upload with no-store; failed uploads keep the backup", async (t) => {
  const { directory, uploader, storage } = await fixture(t);
  const name = "nearby_pharmacies.json";
  const content = JSON.stringify({ resources: [{ id: 1 }] });
  await fs.writeFile(path.join(directory, name), content);
  storage.failPath = name;
  await assert.rejects(
    uploader.uploadResourceFile(name, directory, storage),
    /upload failed/,
  );
  const backups = await fs.readdir(path.join(directory, "backups"), {
    recursive: true,
  });
  const backup = backups.find((file) => file.endsWith(name));
  assert(backup);
  assert.equal(
    await fs.readFile(path.join(directory, "backups", backup), "utf8"),
    content,
  );
  storage.failPath = undefined;
  await uploader.uploadResourceFile(name, directory, storage);
  assert.equal(storage.objects.get(name).metadata.cacheControl, "no-store");
});

test("all-resources retry uploads public JSON and excludes backups, reports and SQL", async (t) => {
  const { directory, uploader, storage } = await fixture(t);
  for (const name of [
    "mark_images",
    "narcotics",
    "cannabis",
    "psychotropics",
    "prohibited_list",
    "nearby_pharmacies",
    "functional_food_classification",
    "health_functional_food_raw_material",
  ]) {
    await fs.writeFile(
      path.join(directory, name + ".json"),
      JSON.stringify({ resources: [] }),
    );
  }
  await fs.writeFile(path.join(directory, "report.json"), "{}");
  await fs.writeFile(path.join(directory, "unified_search.sql"), "SELECT 1;");
  await uploader.uploadAllResources(directory, storage);
  assert.equal(
    [...storage.objects.keys()].filter((name) => !name.includes("/")).length,
    9,
  );
  assert(
    !storage.saves.some(
      (name) =>
        name.includes("backups") ||
        name.includes("report") ||
        name.endsWith(".sql"),
    ),
  );
});

test("backup helper preserves the old resource before replacement", async (t) => {
  const { directory, cache } = await fixture(t);
  const { backupResourceFile } = loadModule(
    "resource_backup",
    directory,
    cache,
  );
  const target = path.join(directory, "narcotics.json");
  await fs.writeFile(target, "old");
  const backup = await backupResourceFile("narcotics.json", directory);
  await fs.writeFile(target, "new");
  assert.equal(await fs.readFile(backup, "utf8"), "old");
});
