import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Login({ setUser }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setError('');
          setUser({ username });
          navigate('/');
        }
      })
      .catch(err => console.error(err));
  };

  return (
    <div>
      <h2>Login page</h2>
      <form onSubmit={handleSubmit} action="http://localhost:3000/api/login" method="POST">
        <div>
          <label>User:</label>
          <input 
            type="text" 
            name="username"
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required 
          />
        </div>
        <div>
          <label>Password:</label>
          <input 
            type="password" 
            name="password"
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
        </div>
        <button type="submit">Login</button>
      </form>
      {error && (
        <div className="error" dangerouslySetInnerHTML={{ __html: error }} />
      )}
      <p><Link to="/register">Create account</Link></p>
    </div>
  );
}

export default Login;
