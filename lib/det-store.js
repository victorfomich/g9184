"use strict";

var path = require("path");
var fs = require("fs").promises;
var crypto = require("crypto");

var supabaseCfg = require("./supabase-config");

function getCredentials() {
  return {
    url: String(supabaseCfg.SUPABASE_URL || "").trim(),
    key: String(supabaseCfg.SUPABASE_SERVICE_ROLE_KEY || "").trim(),
  };
}

function useSupabase() {
  var c = getCredentials();
  return !!(c.url && c.key);
}

function getSupabase() {
  var c = getCredentials();
  var mod = require("@supabase/supabase-js");
  return mod.createClient(c.url, c.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

var ROOT = path.join(__dirname, "..");
var DATA_FILE = path.join(ROOT, "data", "results.json");

function randomId() {
  return crypto.randomUUID();
}

async function readFileDb() {
  try {
    var raw = await fs.readFile(DATA_FILE, "utf8");
    var data = JSON.parse(raw);
    if (!data.results || typeof data.results !== "object") data.results = {};
    return data;
  } catch (e) {
    return { results: {} };
  }
}

async function writeFileDb(data) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

async function listResults() {
  if (useSupabase()) {
    var supabase = getSupabase();
    var out = await supabase
      .from("det_results")
      .select("payload")
      .order("updated_at", { ascending: false });
    if (out.error) throw out.error;
    return (out.data || []).map(function (row) {
      return row.payload;
    });
  }
  var db = await readFileDb();
  return Object.keys(db.results)
    .map(function (k) {
      return db.results[k];
    })
    .sort(function (a, b) {
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
}

async function getResult(id) {
  if (!id) return null;
  if (useSupabase()) {
    var supabase = getSupabase();
    var out = await supabase.from("det_results").select("payload").eq("id", id).maybeSingle();
    if (out.error) throw out.error;
    return out.data ? out.data.payload : null;
  }
  var db = await readFileDb();
  return db.results[id] || null;
}

async function upsertResult(body) {
  if (!body || typeof body !== "object") throw new Error("invalid body");
  if (!body.id) body.id = randomId();
  body.updatedAt = Date.now();

  if (useSupabase()) {
    var supabase = getSupabase();
    var row = {
      id: body.id,
      payload: body,
      updated_at: body.updatedAt,
    };
    var out = await supabase.from("det_results").upsert(row, { onConflict: "id" });
    if (out.error) throw out.error;
    return body;
  }

  var db = await readFileDb();
  db.results[body.id] = body;
  await writeFileDb(db);
  return body;
}

async function deleteResult(id) {
  if (useSupabase()) {
    var supabase = getSupabase();
    var out = await supabase.from("det_results").delete().eq("id", id).select("id");
    if (out.error) throw out.error;
    if (!out.data || !out.data.length) {
      var err = new Error("not found");
      err.statusCode = 404;
      throw err;
    }
    return;
  }
  var db = await readFileDb();
  if (!db.results[id]) {
    var e = new Error("not found");
    e.statusCode = 404;
    throw e;
  }
  delete db.results[id];
  await writeFileDb(db);
}

async function exportAll() {
  if (useSupabase()) {
    var supabase = getSupabase();
    var out = await supabase.from("det_results").select("id, payload");
    if (out.error) throw out.error;
    var results = {};
    (out.data || []).forEach(function (row) {
      results[row.id] = row.payload;
    });
    return { results: results };
  }
  return readFileDb();
}

async function importMerge(data) {
  if (!data || !data.results || typeof data.results !== "object") {
    throw new Error("invalid format");
  }
  var now = Date.now();
  if (useSupabase()) {
    var supabase = getSupabase();
    var rows = Object.keys(data.results).map(function (k) {
      var r = data.results[k];
      r.updatedAt = now;
      return { id: k, payload: r, updated_at: r.updatedAt };
    });
    if (rows.length) {
      var out = await supabase.from("det_results").upsert(rows, { onConflict: "id" });
      if (out.error) throw out.error;
    }
    var list = await listResults();
    return { ok: true, count: list.length };
  }
  var db = await readFileDb();
  Object.keys(data.results).forEach(function (k) {
    data.results[k].updatedAt = now;
    db.results[k] = data.results[k];
  });
  await writeFileDb(db);
  return { ok: true, count: Object.keys(db.results).length };
}

module.exports = {
  useSupabase: useSupabase,
  listResults: listResults,
  getResult: getResult,
  upsertResult: upsertResult,
  deleteResult: deleteResult,
  exportAll: exportAll,
  importMerge: importMerge,
};
