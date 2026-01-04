const express = require("express");
const { query } = require("../db");
const { auth } = require("../middleware/auth");

const router = express.Router();

router.get("/", async (_req, res) => {
  const { rows } = await query("SELECT id, title, content, author_email, created_at FROM posts ORDER BY id DESC");
  res.json(rows);
});

// Controllable SQL Injection /api/posts/search?q=...
router.get("/search", async (req, res) => {
  const q = (req.query.q || "").toString();
  const vuln = (process.env.VULN_SQLI || "false") === "true";

  if (vuln) {
    // Direct concatenation vuln
    const sql = `SELECT id, title, content, author_email, created_at
                 FROM posts
                 WHERE title ILIKE '%${q}%'
                 ORDER BY id DESC`;
    const { rows } = await query(sql);
    return res.json({ mode: "vulnerable", rows });
  }

  const { rows } = await query(
    "SELECT id, title, content, author_email, created_at FROM posts WHERE title ILIKE $1 ORDER BY id DESC",
    [`%${q}%`]
  );
  return res.json({ mode: "safe", rows });
});

router.post("/", auth, async (req, res) => {
  const { title, content } = req.body || {};
  if (!title || !content) return res.status(400).json({ error: "title/content required" });

  const author_email = req.user.email;
  const { rows } = await query(
    "INSERT INTO posts(title, content, author_email) VALUES($1, $2, $3) RETURNING id",
    [title, content, author_email]
  );

  res.json({ id: rows[0].id });
});

module.exports = router;
