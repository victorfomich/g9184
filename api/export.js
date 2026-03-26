"use strict";

var store = require("../lib/det-store");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).end();
  try {
    var db = await store.exportAll();
    return res.status(200).json(db);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e.message) });
  }
};
