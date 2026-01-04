import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Header({ user, setUser }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    fetch('/api/logout', {
      method: 'POST',
      credentials: 'include'
    }).then(() => {
      setUser(null);
      navigate('/');
    });
  };

  return (
    <header>
      <div className="container header-bar">
        <h1>Demo Vulnerable Blog</h1>
        <nav>
          {user ? (
            <>
              <span>Welcome, <strong>{user.username}</strong>! </span>
              <button onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/search?query=react">Trending</Link>
              <span> | </span>
              <a href="/search-share?q=react">Share search</a>
              <span> | </span>
              <Link to="/login">Log In</Link>
              <span> | </span>
              <Link to="/register">Register</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;
