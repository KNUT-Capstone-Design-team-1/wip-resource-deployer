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
    events: [],
    failPath: undefined,
    beforeSave: undefined,
    bucket(name) {
      assert.equal(name, "wip-bucket");
      return {
        async getFiles({ prefix }) {
          return [
            [...objects.keys()]
              .filter((key) => key.startsWith(prefix))
              .map((key) => this.file(key)),
          ];
        },
        file(name) {
          return {
            name,
            async copy(target) {
              storage.events.push("copy:" + name);
              if (storage.failCopy) throw Error("copy failed");
              objects.set(target.name, {
                ...objects.get(name),
                body: Buffer.from(objects.get(name).body),
              });
            },
            async getMetadata() {
              if (!objects.has(name))
                throw Object.assign(Error("missing"), { code: 404 });
              return [{ generation: objects.get(name).generation }];
            },
            async download(options) {
              assert.equal(options.decompress, false);
              storage.events.push("download:" + name);
              if (name === storage.failDownload) throw Error("download failed");
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
              storage.events.push("save:" + name);
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
  assert.equal(storage.saves.at(-2), "resources/pill_data.json");
  assert.equal(storage.saves.at(-1), "resources/resource-pages/latest.json");
  assert.equal(
    storage.objects.get("resources/resource-pages/latest.json").metadata
      .cacheControl,
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
  storage.failPath =
    "resources/" + first.tables.pill_data.pages["5000"][0].files.br.path;
  await assert.rejects(
    uploader.uploadPillDataResources(directory, storage),
    /upload failed/,
  );
  assert.equal(
    storage.objects.has("resources/resource-pages/latest.json"),
    false,
  );
  assert.equal(storage.objects.has("resources/pill_data.json"), false);
  await fs.access(path.join(directory, "pill_data.json"));
  await fs.access(path.join(directory, "backups"));
});

test("successful reruns overwrite every snapshot object", async (t) => {
  const { directory, uploader, storage } = await fixture(t);
  await uploader.uploadPillDataResources(directory, storage);
  const initialSaves = [...storage.saves];
  await uploader.uploadPillDataResources(directory, storage);
  assert.deepEqual(storage.saves.slice(initialSaves.length), initialSaves);
});

test("existing snapshot contents are replaced by local files", async (t) => {
  const { directory, uploader, storage } = await fixture(t);
  await uploader.uploadPillDataResources(directory, storage);
  for (const object of storage.objects.values()) {
    object.body = Buffer.from("old contents");
  }
  await uploader.uploadPillDataResources(directory, storage);
  for (const [name, object] of storage.objects) {
    if (!name.startsWith("resources/")) continue;
    const relative = name.slice("resources/".length);
    const localPath = relative.startsWith("resource-pages/manifests/")
      ? "resource-pages/latest.json"
      : relative;
    assert.deepEqual(
      object.body,
      await fs.readFile(path.join(directory, localPath)),
    );
  }
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
  storage.failPath = "resources/" + name;
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
  assert.equal(
    storage.objects.get("resources/" + name).metadata.cacheControl,
    "no-store",
  );
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
    [...storage.objects.keys()].filter((name) =>
      /^resources\/[^/]+$/.test(name),
    ).length,
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

test("rotation archives current, copies published resources, then publishes new data", async (t) => {
  const { directory, uploader, storage } = await fixture(t);
  const name = "narcotics.json";
  const old = Buffer.from("previous backup");
  const published = Buffer.from("published resource");
  storage.objects.set("current/" + name, { body: old });
  storage.objects.set("resources/" + name, { body: published });
  storage.objects.set("current/cannabis.json", {
    body: Buffer.from("unrelated"),
  });
  await fs.writeFile(
    path.join(directory, name),
    JSON.stringify({ resources: [1] }),
  );
  await uploader.uploadResourceFile(name, directory, storage);
  const archives = await fs.readdir(
    path.join(directory, "backups/gcs-current"),
  );
  assert.deepEqual(
    await fs.readFile(
      path.join(directory, "backups/gcs-current", archives[0], name),
    ),
    old,
  );
  assert.deepEqual(storage.objects.get("current/" + name).body, published);
  assert.deepEqual(
    storage.objects.get("resources/" + name).body,
    await fs.readFile(path.join(directory, name)),
  );
  assert.equal(
    storage.objects.get("current/cannabis.json").body.toString(),
    "unrelated",
  );
  const events = storage.events;
  assert(
    events.indexOf("download:current/" + name) <
      events.indexOf("copy:resources/" + name),
  );
  assert(
    events.indexOf("copy:resources/" + name) <
      events.indexOf("save:resources/" + name),
  );
});

test("failed current download or remote copy prevents publication", async (t) => {
  for (const failure of ["download", "copy"]) {
    const { directory, uploader, storage } = await fixture(t);
    const name = "narcotics.json";
    storage.objects.set("current/" + name, { body: Buffer.from("backup") });
    storage.objects.set("resources/" + name, {
      body: Buffer.from("published"),
    });
    await fs.writeFile(
      path.join(directory, name),
      JSON.stringify({ resources: [] }),
    );
    if (failure === "download") storage.failDownload = "current/" + name;
    else storage.failCopy = true;
    await assert.rejects(
      uploader.uploadResourceFile(name, directory, storage),
      /failed/,
    );
    assert.equal(storage.saves.length, 0);
    assert.equal(
      storage.objects.get("resources/" + name).body.toString(),
      "published",
    );
    assert.equal(
      storage.objects.get("current/" + name).body.toString(),
      "backup",
    );
  }
});

test("pill snapshot rotation preserves pages, manifest and original together", async (t) => {
  const { directory, uploader, storage } = await fixture(t);
  await uploader.uploadPillDataResources(directory, storage);
  const previous = new Map(
    [...storage.objects].map(([name, object]) => [
      name,
      Buffer.from(object.body),
    ]),
  );
  await uploader.uploadPillDataResources(directory, storage);
  for (const [name, body] of previous) {
    assert.deepEqual(
      storage.objects.get(name.replace(/^resources\//, "current/")).body,
      body,
    );
  }
  await uploader.uploadPillDataResources(directory, storage);
  const archives = await fs.readdir(
    path.join(directory, "backups/gcs-current"),
  );
  for (const [name, body] of previous) {
    assert.deepEqual(
      await fs.readFile(
        path.join(
          directory,
          "backups/gcs-current",
          archives[0],
          name.slice("resources/".length),
        ),
      ),
      body,
    );
  }
});

test("functional pages split at 5000, preserve pill pages, and publish all tables together", async (t) => {
  const { directory, uploader, storage, cache } = await fixture(t);
  const builder = loadModule("resource_pages", directory, cache);
  const products = Array.from({ length: 5001 }, (_, i) => ({
    PRDLST_REPORT_NO: String(i),
    PRDLST_NM: "??",
  }));
  const tables = {
    functional_food_classification: [],
    health_functional_food_raw_material: products,
  };
  for (const [name, rows] of Object.entries(tables)) {
    await fs.writeFile(
      path.join(directory, name + ".json"),
      JSON.stringify({ resources: rows }),
    );
  }
  await builder.createResourcePages(tables, directory);
  const readManifest = async () =>
    JSON.parse(
      await fs.readFile(
        path.join(directory, "resource-pages/latest.json"),
        "utf8",
      ),
    );
  const manifest = await readManifest();
  assert.equal(Object.keys(manifest.tables).length, 3);
  assert.deepEqual(
    manifest.tables.functional_food_classification.pages["5000"],
    [],
  );
  const pages =
    manifest.tables.health_functional_food_raw_material.pages["5000"];
  assert.equal(pages.length, 2);
  for (const [i, page] of pages.entries()) {
    const identity = await fs.readFile(
      path.join(directory, page.files.identity.path),
    );
    const data = JSON.parse(identity);
    assert.equal(data.resource.length, i === 0 ? 5000 : 1);
    assert.equal(data.current, i * 5000);
    assert.equal(data.total, 5001);
    assert.equal(data.totalPage, 2);
    const zlib = require("node:zlib");
    for (const [encoding, decode] of Object.entries({
      br: zlib.brotliDecompressSync,
      gzip: zlib.gunzipSync,
      deflate: zlib.inflateSync,
    })) {
      assert.deepEqual(
        decode(
          await fs.readFile(path.join(directory, page.files[encoding].path)),
        ),
        identity,
      );
    }
  }
  const pillRows = JSON.parse(
    await fs.readFile(path.join(directory, "pill_data.json"), "utf8"),
  ).resources;
  await builder.createPillDataPages(pillRows, directory);
  assert.deepEqual((await readManifest()).tables, manifest.tables);
  await uploader.uploadPagedResources(directory, storage);
  assert.equal(storage.saves.at(-1), "resources/resource-pages/latest.json");
  for (const name of Object.keys(manifest.tables))
    assert(storage.objects.has("resources/" + name + ".json"));
  const previous = new Map(
    [...storage.objects].map(([name, obj]) => [name, Buffer.from(obj.body)]),
  );
  await uploader.uploadPagedResources(directory, storage);
  for (const [name, body] of previous)
    assert.deepEqual(
      storage.objects.get(name.replace(/^resources\//, "current/")).body,
      body,
    );
  await fs.writeFile(
    path.join(directory, "health_functional_food_raw_material.json"),
    JSON.stringify({ resources: [] }),
  );
  storage.saves.length = 0;
  await assert.rejects(
    uploader.uploadPagedResources(directory, storage),
    /does not match/,
  );
  assert.equal(storage.saves.length, 0);
});

test("functional-only publication does not back up or upload pill files", async (t) => {
  const { directory, uploader, storage, cache } = await fixture(t);
  await uploader.uploadPillDataResources(directory, storage);
  const pillOriginal = storage.objects.get("resources/pill_data.json");
  const backupsBefore = (
    await fs.readdir(path.join(directory, "backups"), { recursive: true })
  ).filter((name) => name.endsWith("pill_data.json"));
  const tables = {
    functional_food_classification: [{ id: 1 }],
    health_functional_food_raw_material: [{ PRDLST_REPORT_NO: "1" }],
  };
  for (const [name, rows] of Object.entries(tables))
    await fs.writeFile(
      path.join(directory, name + ".json"),
      JSON.stringify({ resources: rows }),
    );
  await loadModule("resource_pages", directory, cache).createResourcePages(
    tables,
    directory,
  );
  // Retained pill data is verified against GCS, independent of local originals.
  await fs.unlink(path.join(directory, "pill_data.json"));
  storage.events.length = 0;
  storage.saves.length = 0;
  await uploader.uploadFunctionalFoodResources(directory, storage);
  assert.equal(storage.objects.get("resources/pill_data.json"), pillOriginal);
  assert(
    !storage.saves.some(
      (name) =>
        name.endsWith("pill_data.json") ||
        name.includes("resource-pages/pill_data/"),
    ),
  );
  assert(
    !storage.events.some(
      (event) =>
        event.startsWith("copy:") &&
        (event.endsWith("pill_data.json") ||
          event.includes("resource-pages/pill_data/")),
    ),
  );
  const backupsAfter = (
    await fs.readdir(path.join(directory, "backups"), { recursive: true })
  ).filter((name) => name.endsWith("pill_data.json"));
  assert.deepEqual(backupsAfter, backupsBefore);
  assert(
    storage.saves.includes(
      "resources/health_functional_food_raw_material.json",
    ),
  );
  const manifest = JSON.parse(
    storage.objects.get("resources/resource-pages/latest.json").body,
  );
  assert(manifest.tables.pill_data);
  assert(manifest.tables.health_functional_food_raw_material);
  const pillPage = manifest.tables.pill_data.pages["5000"][0].files.br.path;
  storage.objects.get("resources/" + pillPage).body = Buffer.from("corrupt");
  storage.saves.length = 0;
  await assert.rejects(
    uploader.uploadFunctionalFoodResources(directory, storage),
    /Retained resource page/,
  );
  assert.equal(storage.saves.length, 0);
});
