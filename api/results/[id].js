"use strict";

var store = require("../../lib/det-store");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  var id = req.query.id;
  if (!id) return res.status(400).json({ error: "missing id" });
  try {
    if (req.method === "GET") {
      var r = await store.getResult(id);
      if (!r) return res.status(404).json({ error: "not found" });
      return res.status(200).json(r);
    }
    if (req.method === "DELETE") {
      await store.deleteResult(id);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).end();
  } catch (e) {
    if (e.statusCode === 404) return res.status(404).json({ error: "not found" });
    console.error(e);
    return res.status(500).json({ error: String(e.message) });
  }
};
