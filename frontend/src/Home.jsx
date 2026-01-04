import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Home({ user }) {
  const [posts, setPosts] = React.useState([]);
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const navigate = useNavigate();

  React.useEffect(() => {
    fetch('http://localhost:3000/api/posts', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setPosts(data));
  }, []);

  const handleNewPost = (e) => {
    e.preventDefault();
    if (!user) {
      alert('You need to login to post.');
      return;
    }
    fetch('http://localhost:3000/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title, content })
    })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Error creating the post');
      })
      .then(() => {
        /**
         * Reload post list after creating
         */
        return fetch('http://localhost:3000/api/posts', { credentials: 'include' });
      })
      .then(res => res.json())
      .then(data => {
        setPosts(data);
        setTitle('');
        setContent('');
      })
      .catch(err => console.error(err));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const query = e.target.elements.query.value;
    navigate(`/search?query=${encodeURIComponent(query)}`);
  };

  return (
    <div>
      <h2>Recent posts</h2>
      <form onSubmit={handleSearch}>
        <input type="text" name="query" placeholder="Search..." />
        <button type="submit">Search</button>
      </form>

      {user && (
        <form id="newPostForm" onSubmit={handleNewPost} action="http://localhost:3000/api/posts" method="POST">
          <h3>Create a new post</h3>
          <input 
            type="text" 
            placeholder="Title" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            required 
          />
          <textarea 
            placeholder="Content" 
            value={content} 
            onChange={(e) => setContent(e.target.value)} 
            required 
          />
          <button type="submit">Publish</button>
        </form>
      )}

      <div>
        {posts.map(post => (
          <div key={post.id} className="post">
            <h3>
              <Link to={`/posts/${post.id}`}>{post.title}</Link>
            </h3>
            <div><em>by {post.author} at {post.created_at}</em></div>
            <p dangerouslySetInnerHTML={{ __html: post.content }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;
