import React, { useEffect, useMemo, useState } from "react";
import { API } from "../api.js";
import DOMPurify from "dompurify";

function getVulnXssFlag() {
  // În build static, nu avem env runtime real; pentru demo îl controlăm prin querystring: ?xss=true/false
  const p = new URLSearchParams(window.location.search);
  const v = p.get("xss");
  return v === "true";
}

export default function Posts() {
  const [posts, setPosts] = useState([]);
  const [q, setQ] = useState("");
  const [searchMode, setSearchMode] = useState("");
  const vulnXss = useMemo(() => getVulnXssFlag(), []);

  useEffect(() => {
    API.getPosts().then(setPosts);
  }, []);

  async function search() {
    const r = await API.searchPosts(q);
    if (r.rows) {
      setSearchMode(r.mode);
      setPosts(r.rows);
    } else {
      setSearchMode("");
      setPosts(r);
    }
  }

  return (
    <div>
      <h2>Posts</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search title..." />
        <button onClick={search}>Search</button>
      </div>

      {searchMode && <p>Search mode: <b>{searchMode}</b></p>}
      <p>
        XSS mode: <b>{vulnXss ? "vulnerable" : "safe"}</b>{" "}
        (controll with <code>?xss=true</code> pr <code>?xss=false</code>)
      </p>

      <ul style={{ paddingLeft: 18 }}>
        {posts.map((p) => (
          <li key={p.id} style={{ marginBottom: 18 }}>
            <div><b>{p.title}</b> <small>({p.author_email})</small></div>

            {vulnXss ? (
              <div dangerouslySetInnerHTML={{ __html: p.content }} />
            ) : (
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(p.content) }} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
