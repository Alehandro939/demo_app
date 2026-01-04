import React, { useState } from "react";
import { API } from "../api.js";

export default function NewPost({ token }) {
  const [title, setTitle] = useState("New post");
  const [content, setContent] = useState('HTML Text: <b>bold</b> and <i>italic</i>');
  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    if (!token) return setMsg("Login first.");

    const r = await API.createPost(token, title, content);
    setMsg(r.id ? `Created post #${r.id}` : (r.error || "Error"));
  }

  return (
    <form onSubmit={submit}>
      <h2>New Post</h2>
      <div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="title" />
      </div>
      <div>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} style={{ width: "100%" }} />
      </div>
      <button type="submit">Create</button>
      <p>{msg}</p>
    </form>
  );
}
