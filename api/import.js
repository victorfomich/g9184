"use strict";

var store = require("../lib/det-store");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).end();
  try {
    var data = req.body && req.body.data;
    if (!data || !data.results || typeof data.results !== "object") {
      return res.status(400).json({ error: "invalid format" });
    }
    var out = await store.importMerge(data);
    return res.status(200).json(out);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e.message) });
  }
};
