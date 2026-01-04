const express = require('express');
const session = require('express-session');
const cors = require('cors');
const { Pool } = require('pg');

const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const csurf = require('csurf');
const sanitizeHtml = require('sanitize-html');
const serveIndex = require('serve-index');
const path = require('path');
const fs = require('fs');

const app = express();

/**
 * Creates a PostgreSQL connection pool using environment-based configuration.
 * Defaults are suitable for local development and CI containers.
 */
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'demo',
  password: process.env.DB_PASSWORD || 'demo',
  database: process.env.DB_NAME || 'demoapp'
});

/**
 * Feature flags used to enable or disable intentionally introduced vulnerabilities.
 * These flags allow controlled security testing in CI/CD pipelines (safe vs. vuln modes).
 */
const VULN_SQLI = (process.env.VULN_SQLI || 'false') === 'true';
const VULN_XSS = (process.env.VULN_XSS || 'false') === 'true';
const VULN_CSRF = (process.env.VULN_CSRF || 'false') === 'true';
const VULN_COOKIE_FLAGS = (process.env.VULN_COOKIE_FLAGS || 'false') === 'true';
const VULN_HEADERS = (process.env.VULN_HEADERS || 'false') === 'true';
const VULN_DEBUG_ROUTES = (process.env.VULN_DEBUG_ROUTES || 'false') === 'true';

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/**
 * Enables CORS for the frontend origin.
 * In a real system this should be stricter (allowlist + environments).
 */
app.use(cors({ origin: 'http://localhost:8080', credentials: true }));

/**
 * Parses cookies for session handling and CSRF protection (when enabled).
 */
app.use(cookieParser());

/**
 * Configures session management.
 * When VULN_COOKIE_FLAGS is enabled, cookie security flags are intentionally weakened.
 */
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    cookie: VULN_COOKIE_FLAGS
      ? { httpOnly: false, secure: false, sameSite: false }
      : { httpOnly: true, secure: false, sameSite: 'lax' }
  })
);

/**
 * Configures security headers.
 * When VULN_HEADERS is enabled, security headers are reduced for demonstration purposes.
 */
if (!VULN_HEADERS) {
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'frame-ancestors': ["'none'"],
          'form-action': ["'self'"]
        }
      },
      frameguard: { action: 'deny' }
    })
  );
} else {
  app.use((req, res, next) => {
    res.setHeader('X-Powered-By', 'Express (Vulnerable Mode)');
    next();
  });
}

/**
 * Conditionally enables CSRF protection.
 * When VULN_CSRF is enabled, CSRF protection is disabled intentionally.
 */
let csrfProtection = null;
if (!VULN_CSRF) {
  csrfProtection = csurf();
  app.use(csrfProtection);

  /**
   * Returns a CSRF token for the client when running in safe mode.
   */
  app.get('/api/csrf', (req, res) => {
    return res.json({ csrfToken: req.csrfToken() });
  });
}

/**
 * Sanitizes user-provided HTML input to mitigate XSS attacks.
 * When VULN_XSS is enabled, sanitization is skipped intentionally.
 *
 * @param {*} html User-provided content
 * @returns {string} Sanitized or raw HTML string
 */
function maybeSanitize(html) {
  if (VULN_XSS) return html;

  return sanitizeHtml(html, {
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'],
    allowedAttributes: { a: ['href', 'title', 'target'] }
  });
}

/**
 * Conditionally applies CSRF protection to state-changing routes.
 * When CSRF vulnerability mode is enabled, the handler is returned unmodified.
 *
 * @param {Function} handler Express route handler
 * @returns {Function} Wrapped or original handler
 */
function withCsrfIfEnabled(handler) {
  if (VULN_CSRF) return handler;
  return (req, res, next) => handler(req, res, next);
}

/**
 * Registers a new user.
 * Supports optional SQL Injection vulnerability for testing purposes.
 */
app.post(
  '/api/register',
  withCsrfIfEnabled(async (req, res) => {
    const { username, password } = req.body;
    try {
      if (VULN_SQLI) {
        await pool.query(
          "INSERT INTO users (username, password) VALUES ('" +
            username +
            "', '" +
            password +
            "')"
        );
      } else {
        await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [
          username,
          password
        ]);
      }
      return res.status(201).json({ message: 'User created' });
    } catch (err) {
      return res.status(500).json({ error: 'Registering error' });
    }
  })
);

/**
 * Authenticates a user using credentials provided in the request body.
 * Supports optional SQL Injection and XSS demonstrations for security testing.
 */
app.post(
  '/api/login',
  withCsrfIfEnabled(async (req, res) => {
    const { username, password } = req.body;
    try {
      let result;
      if (VULN_SQLI) {
        result = await pool.query(
          "SELECT * FROM users WHERE username = '" +
            username +
            "' AND password = '" +
            password +
            "'"
        );
      } else {
        result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [
          username,
          password
        ]);
      }

      if (result.rows.length > 0) {
        req.session.user = { id: result.rows[0].id, username: result.rows[0].username };
        return res.json({ message: 'Login failed' });
      }

      const msg = VULN_XSS
        ? 'Login failed for user <b>' + username + '</b>'
        : 'Login failed for user: ' + String(username);

      return res.status(401).json({ error: msg });
    } catch (err) {
      return res.status(500).json({ error: 'Login error' });
    }
  })
);

/**
 * Logs out the current user by destroying the session.
 */
app.post(
  '/api/logout',
  withCsrfIfEnabled((req, res) => {
    req.session.destroy(() => {});
    res.clearCookie('connect.sid');
    return res.json({ message: 'Logout' });
  })
);

/**
 * Returns the currently authenticated user session details.
 */
app.get('/api/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }
  return res.json({ user: req.session.user });
});

/**
 * Returns the list of posts.
 */
app.get('/api/posts', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, title, content, author, to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at FROM posts ORDER BY id DESC"
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Receiving posts error' });
  }
});

/**
 * Searches posts by title.
 * When VULN_SQLI is enabled, performs an intentionally unsafe string concatenation query.
 */
app.get('/api/posts/search', async (req, res) => {
  const q = String(req.query.q || '');

  if (process.env.VULN_SQLI === 'true') {
    const sql = "SELECT id, title, content, author FROM posts WHERE title ILIKE '%" + q + "%'";
    try {
      const r = await pool.query(sql);
      return res.json(r.rows);
    } catch (e) {
      return res.status(500).send(e.message);
    }
  }

  try {
    const r = await pool.query('SELECT id, title, content, author FROM posts WHERE title ILIKE $1', [
      `%${q}%`
    ]);
    return res.json(r.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Search error' });
  }
});

/**
 * Returns a single post and its comments.
 *
 * @param {string} id Post ID (path param)
 */
app.get('/api/posts/:id', async (req, res) => {
  const postId = Number(req.params.id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ error: 'Invalid post id' });
  }

  try {
    const postResult = await pool.query(
      "SELECT id, title, content, author, to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at FROM posts WHERE id = $1",
      [postId]
    );
    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: 'Non-existent posts' });
    }

    const commentsResult = await pool.query(
      "SELECT id, content, author, to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at FROM comments WHERE post_id = $1 ORDER BY id ASC",
      [postId]
    );

    return res.json({ post: postResult.rows[0], comments: commentsResult.rows });
  } catch (err) {
    console.error('POST DETAIL ERROR:', err);
    return res.status(500).json({ error: 'Error fetching post' });
  }
});

/**
 * Creates a new post for the authenticated user.
 * When VULN_XSS is disabled, post fields are sanitized before persistence.
 */
app.post(
  '/api/posts',
  withCsrfIfEnabled(async (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let { title, content } = req.body;
    title = maybeSanitize(title);
    content = maybeSanitize(content);

    try {
      if (VULN_SQLI) {
        await pool.query(
          "INSERT INTO posts (title, content, author) VALUES ('" +
            title +
            "', '" +
            content +
            "', '" +
            req.session.user.username +
            "')"
        );
      } else {
        await pool.query('INSERT INTO posts (title, content, author) VALUES ($1, $2, $3)', [
          title,
          content,
          req.session.user.username
        ]);
      }

      return res.status(201).json({ message: 'Post created' });
    } catch (err) {
      return res.status(500).json({ error: 'Post creation error' });
    }
  })
);

/**
 * Creates a new comment on a post for the authenticated user.
 * When VULN_XSS is disabled, comment content is sanitized before persistence.
 */
app.post(
  '/api/posts/:id/comments',
  withCsrfIfEnabled(async (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const postId = req.params.id;
    let { content } = req.body;
    content = maybeSanitize(content);

    try {
      if (VULN_SQLI) {
        await pool.query(
          "INSERT INTO comments (post_id, content, author) VALUES (" +
            postId +
            ", '" +
            content +
            "', '" +
            req.session.user.username +
            "')"
        );
      } else {
        await pool.query('INSERT INTO comments (post_id, content, author) VALUES ($1, $2, $3)', [
          postId,
          content,
          req.session.user.username
        ]);
      }

      return res.status(201).json({ message: 'Comment added' });
    } catch (err) {
      return res.status(500).json({ error: 'Comment adding error' });
    }
  })
);

/**
 * Debug and information disclosure endpoints.
 * These routes are only enabled when the debug vulnerability flag is active.
 */
if (VULN_DEBUG_ROUTES) {
  /**
   * Exposes process environment variables (for demonstration only).
   */
  app.get('/debug/env', (req, res) => {
    return res.type('text').send(JSON.stringify(process.env, null, 2));
  });

  /**
   * Enables directory listing of backend files (for demonstration only).
   */
  const rootDir = path.resolve(__dirname);
  app.use('/debug/files', express.static(rootDir), serveIndex(rootDir, { icons: true }));

  /**
   * Demonstrates local file inclusion/path traversal risk (for demonstration only).
   */
  app.get('/debug/readfile', (req, res) => {
    const f = req.query.file || 'index.js';
    const targetPath = path.join(__dirname, f);
    fs.readFile(targetPath, 'utf8', (err, data) => {
      if (err) return res.status(404).send('File not found');
      return res.type('text').send(data);
    });
  });
}

/**
 * Escapes special characters to prevent HTML injection.
 *
 * @param {string} s Input string
 * @returns {string} Escaped HTML-safe string
 */
function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/**
 * Renders a shareable search HTML page.
 * When VULN_XSS is enabled, user input is reflected unsafely into HTML (demonstration).
 * When VULN_SQLI is enabled, SQL is constructed via string concatenation (demonstration).
 */
app.get('/search-share', async (req, res) => {
  const q = String(req.query.q || '');

  const localVulnXss = (process.env.VULN_XSS || 'false') === 'true';
  const localVulnSqli = (process.env.VULN_SQLI || 'false') === 'true';

  try {
    let rows = [];

    if (localVulnSqli) {
      if (/pg_sleep|sleep|\bOR\b|\bAND\b|--|;|\/\*|\*\/|'|"/i.test(q)) {
        await pool.query('SELECT pg_sleep(3)');
      }

      const sql =
        "SELECT id, title, content, author " +
        "FROM posts " +
        "WHERE title ILIKE '%" +
        q +
        "%' OR content ILIKE '%" +
        q +
        "%' " +
        'ORDER BY id DESC LIMIT 20';

      const r = await pool.query(sql);
      rows = r.rows;
    } else {
      const r = await pool.query(
        "SELECT id, title, content, author " +
          'FROM posts WHERE title ILIKE $1 OR content ILIKE $1 ' +
          'ORDER BY id DESC LIMIT 20',
        [`%${q}%`]
      );
      rows = r.rows;
    }

    const qOut = localVulnXss ? q : escapeHtml(q);

    const items = rows
      .map((p) => {
        const title = localVulnXss ? p.title : escapeHtml(p.title);
        const snippet = localVulnXss ? p.content : escapeHtml(p.content);
        return `
          <article style="padding:12px;border:1px solid #e5e7eb;border-radius:12px;margin:12px 0;background:#fff">
            <h3 style="margin:0 0 8px 0;font-size:18px">${title}</h3>
            <div style="color:#374151">${snippet?.slice(0, 140) || ''}...</div>
          </article>
        `;
      })
      .join('');

    return res
      .status(200)
      .type('html')
      .send(`
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8"/>
            <meta name="viewport" content="width=device-width, initial-scale=1"/>
            <title>Share Search</title>
          </head>
          <body style="margin:0;font-family:ui-sans-serif,system-ui;background:#f3f4f6;color:#111827">
            <div style="max-width:900px;margin:0 auto;padding:24px">
              <header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
                <h2 style="margin:0">Demo Vulnerable Blog</h2>
                <nav style="display:flex;gap:12px">
                  <a href="/" style="color:#2563eb;text-decoration:none">Home</a>
                  <a href="/search-share?q=react" style="color:#2563eb;text-decoration:none">Share: react</a>
                  <a href="/search-share?q=security" style="color:#2563eb;text-decoration:none">Share: security</a>
                </nav>
              </header>

              <div style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:16px">
                <h3 style="margin:0 0 10px 0">Search results</h3>
                <p style="margin:0 0 14px 0">Results for: <strong>${qOut}</strong></p>

                <form method="GET" action="/search-share" style="display:flex;gap:8px;margin-bottom:16px">
                  <input name="q" value="${escapeHtml(q)}" placeholder="Search..." style="flex:1;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px"/>
                  <button type="submit" style="padding:10px 14px;border:0;border-radius:10px;background:#111827;color:#fff;cursor:pointer">
                    Search
                  </button>
                </form>

                ${items || `<p style="color:#6b7280">No result.</p>`}
              </div>

              <footer style="margin-top:16px;color:#6b7280;font-size:12px">
                Mode: ${localVulnXss ? 'VULN_XSS' : 'SAFE_XSS'} / ${
                  localVulnSqli ? 'VULN_SQLI' : 'SAFE_SQLI'
                }
              </footer>
            </div>
          </body>
        </html>
      `);
  } catch (e) {
    if ((process.env.VULN_SQLI || 'false') === 'true') {
      return res.status(500).send(String(e.message || e));
    }
    return res.status(500).send('Search error');
  }
});

/**
 * Starts the Express application server.
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server started on port ' + PORT);
  console.log('[toggles]', {
    VULN_SQLI,
    VULN_XSS,
    VULN_CSRF,
    VULN_COOKIE_FLAGS,
    VULN_HEADERS,
    VULN_DEBUG_ROUTES
  });
});
