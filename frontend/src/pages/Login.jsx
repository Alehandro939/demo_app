import React, { useState } from "react";
import { API } from "../api.js";

export default function Login({ onToken }) {
  const [email, setEmail] = useState("demo@local");
  const [password, setPassword] = useState("123456");
  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    const r = await API.login(email, password);
    if (r.token) {
      onToken(r.token);
      setMsg("Logged in.");
    } else {
      setMsg(r.error || "Error");
    }
  }

  return (
    <form onSubmit={submit}>
      <h2>Login</h2>
      <div>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      </div>
      <div>
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
      </div>
      <button type="submit">Login</button>
      <p>{msg}</p>
    </form>
  );
}
