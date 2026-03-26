"use strict";

var path = require("path");
var express = require("express");

var store = require("./lib/det-store");

var ROOT = __dirname;
var app = express();

app.use(express.json({ limit: "32mb" }));

app.get("/api/health", function (req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: true });
});

app.get("/api/export", async function (req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    var db = await store.exportAll();
    res.json(db);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.get("/api/results", async function (req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    var list = await store.listResults();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.get("/api/results/:id", async function (req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    var r = await store.getResult(req.params.id);
    if (!r) return res.status(404).json({ error: "not found" });
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/results", async function (req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    var body = req.body;
    if (!body || typeof body !== "object") {
      return res.status(400).json({ error: "invalid body" });
    }
    var saved = await store.upsertResult(body);
    res.json(saved);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.delete("/api/results/:id", async function (req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    await store.deleteResult(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    if (e.statusCode === 404) return res.status(404).json({ error: "not found" });
    res.status(500).json({ error: String(e.message) });
  }
});

app.post("/api/import", async function (req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    var data = req.body && req.body.data;
    if (!data || !data.results || typeof data.results !== "object") {
      return res.status(400).json({ error: "invalid format" });
    }
    var out = await store.importMerge(data);
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

function sendHtml(name) {
  return function (req, res) {
    res.sendFile(path.join(ROOT, name));
  };
}

app.get("/index.html", function (req, res) {
  res.redirect(301, "/");
});
app.get("/certificate.html", function (req, res) {
  res.redirect(301, "/certificate");
});
app.get("/admin.html", function (req, res) {
  res.redirect(301, "/admin");
});

app.get("/", sendHtml("index.html"));
app.get("/certificate", sendHtml("certificate.html"));
app.get("/admin", sendHtml("admin.html"));

app.use(express.static(ROOT, { index: false }));

app.use(function (req, res) {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "not found" });
  }
  res.status(404).send("Not found");
});

var PORT = Number(process.env.PORT) || 3333;
app.listen(PORT, function () {
  var backend = store.useSupabase() ? "Supabase" : "data/results.json";
  console.log("DET server http://localhost:" + PORT + " (данные: " + backend + ")");
});
