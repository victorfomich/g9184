"use strict";

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ ok: true });
};
