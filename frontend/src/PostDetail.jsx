import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function PostDetail({ user }) {
  const { id } = useParams();
  const [postData, setPostData] = useState(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`http://localhost:3000/api/posts/${id}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setPostData(data);
        }
      });
  }, [id]);

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!user) {
      alert('You need to be logged in to comment.');
      return;
    }
    fetch(`http://localhost:3000/api/posts/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content: comment })
    })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Error sending comment');
      })
      .then(() => {
        // Reîncarcă postarea și comentariile
        return fetch(`http://localhost:3000/api/posts/${id}`, { credentials: 'include' });
      })
      .then(res => res.json())
      .then(data => {
        setPostData(data);
        setComment('');
      })
      .catch(err => console.error(err));
  };

  if (error) {
    return <p className="error">{error}</p>;
  }
  if (!postData) {
    return <p>Loading...</p>;
  }

  const { post, comments } = postData;
  return (
    <div>
      <h2>{post.title}</h2>
      <div><em>by {post.author} at {post.created_at}</em></div>
      <p dangerouslySetInnerHTML={{ __html: post.content }} />
      <h3>Comments</h3>
      {comments.map(c => (
        <div key={c.id} className="comment">
          <p><strong>{c.author}</strong> wrote:</p>
          <p dangerouslySetInnerHTML={{ __html: c.content }} />
          <small>{c.created_at}</small>
        </div>
      ))}
      {user ? (
        <form onSubmit={handleCommentSubmit} action={`http://localhost:3000/api/posts/${id}/comments`} method="POST">
          <h4>Add a commnet</h4>
          <textarea 
            value={comment} 
            onChange={(e) => setComment(e.target.value)} 
            required 
          />
          <button type="submit">Send</button>
        </form>
      ) : (
        <p>You need to be logged in to comment.</p>
      )}
    </div>
  );
}

export default PostDetail;
