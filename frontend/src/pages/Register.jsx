import React, { useState } from "react";
import { API } from "../api.js";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("123456");
  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    const r = await API.register(email, password);
    setMsg(r.ok ? "Registered." : (r.error || "Error"));
  }

  return (
    <form onSubmit={submit}>
      <h2>Register</h2>
      <div>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
      </div>
      <div>
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" />
      </div>
      <button type="submit">Register</button>
      <p>{msg}</p>
    </form>
  );
}
