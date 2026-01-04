import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './Header';
import Home from './Home';
import Login from './Login';
import Register from './Register';
import PostDetail from './PostDetail';
import Search from './Search';

function App() {
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    fetch('http://localhost:3000/api/me', { credentials: 'include' })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Not logged in');
      })
      .then(data => {
        setUser(data.user);
      })
      .catch(() => {
        /**
         * Unauthenticated
         */
      });
  }, []);

  return (
    <BrowserRouter>
      <Header user={user} setUser={setUser} />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/posts/:id" element={<PostDetail user={user} />} />
          <Route path="/search" element={<Search />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
