"use strict";

var store = require("../../lib/det-store");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") {
      var list = await store.listResults();
      return res.status(200).json(list);
    }
    if (req.method === "POST") {
      var body = req.body;
      if (!body || typeof body !== "object") {
        return res.status(400).json({ error: "invalid body" });
      }
      var saved = await store.upsertResult(body);
      return res.status(200).json(saved);
    }
    return res.status(405).end();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e.message) });
  }
};
