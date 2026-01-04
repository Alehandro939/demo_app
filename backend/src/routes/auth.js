const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../db");

const router = express.Router();

router.post("/register", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email/password required" });

  // Weak password allowed if VULN_AUTH_WEAK=true
  const weakAllowed = (process.env.VULN_AUTH_WEAK || "false") === "true";
  if (!weakAllowed) {
    if (password.length < 10) return res.status(400).json({ error: "Password too short (min 10)" });
  }

  const password_hash = await bcrypt.hash(password, 10);

  try {
    await query(
      "INSERT INTO users(email, password_hash) VALUES($1, $2)",
      [email, password_hash]
    );
    return res.json({ ok: true });
  } catch (e) {
    return res.status(409).json({ error: "User exists" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email/password required" });

  const { rows } = await query("SELECT email, password_hash FROM users WHERE email=$1", [email]);
  if (!rows[0]) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, rows[0].password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign(
    { email },
    process.env.JWT_SECRET || "dev_secret_change_me",
    { expiresIn: "2h" }
  );

  return res.json({ token });
});

module.exports = router;
