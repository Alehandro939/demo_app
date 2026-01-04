import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    fetch('http://localhost:3000/api/register', {
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
          alert('New account created, login please.');
          navigate('/login');
        }
      })
      .catch(err => console.error(err));
  };

  return (
    <div>
      <h2>Înregistrare</h2>
      <form onSubmit={handleSubmit} action="http://localhost:3000/api/register" method="POST">
        <div>
          <label>Username:</label>
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
        <button type="submit">Register</button>
      </form>
      {error && <div className="error">{error}</div>}
    </div>
  );
}

export default Register;
