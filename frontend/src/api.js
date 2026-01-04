export const VULN = {
  // FRONTEND sinks / behaviors
  XSS_SINK: (process.env.REACT_APP_VULN_XSS_SINK || "false") === "true", // folosești dangerouslySetInnerHTML când e true
  RAW_QUERY: (process.env.REACT_APP_VULN_RAW_QUERY || "false") === "true", // nu encode la query params
  OPEN_REDIRECT: (process.env.REACT_APP_VULN_OPEN_REDIRECT || "false") === "true",
  CSRF_FORMS: (process.env.REACT_APP_VULN_CSRF_FORMS || "false") === "true"
};

async function jsonFetch(url, options = {}) {
  const r = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });

  const ct = r.headers.get("content-type") || "";
  const body = ct.includes("application/json") ? await r.json() : await r.text();

  // păstrăm comportamentul tău: returnăm body, dar aruncăm error pe non-2xx
  if (!r.ok) {
    const msg = typeof body === "string" ? body : body?.error || "Request failed";
    throw new Error(msg);
  }

  return body;
}

export const API = {
  async register(email, password) {
    return jsonFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
  },

  async login(email, password) {
    return jsonFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
  },

  async getPosts() {
    return jsonFetch("/api/posts", { method: "GET" });
  },

  async searchPosts(q) {
    // Mod “vuln” = nu encode; util ca ZAP să injecteze mai direct (și să nu-i “strici” payloadurile)
    const qs = VULN.RAW_QUERY ? String(q ?? "") : encodeURIComponent(String(q ?? ""));
    return jsonFetch(`/api/posts/search?q=${qs}`, { method: "GET" });
  },

  async createPost(token, title, content) {
    return jsonFetch("/api/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ title, content })
    });
  },

  // dacă ai endpoint-ul /api/csrf în backend (în safe mode), îl poți folosi în pagini “secure”
  async getCsrfToken() {
    return jsonFetch("/api/csrf", { method: "GET" });
  },

  // helper pentru pagina /vuln sau chiar Search, ca să ai un parametru reflectat în UI
  // (Asta NU e request, e doar “payload carrier”)
  vulnEcho(x) {
    return `You sent: ${x}`;
  },

  redirectTo(nextUrl) {
    if (VULN.OPEN_REDIRECT) {
      window.location.href = nextUrl; // vulnerabil: acceptă absolute URLs
    } else {
      // safe: doar relative
      if (String(nextUrl || "").startsWith("/")) window.location.href = nextUrl;
      else alert("Blocked redirect");
    }
  }
};