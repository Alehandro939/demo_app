import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { API, VULN } from './api';

function useQueryParam(name) {
  const { search } = useLocation();
  return useMemo(() => {
    const qp = new URLSearchParams(search);
    return qp.get(name) || '';
  }, [search, name]);
}

function Search() {
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const query = useQueryParam('query');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError('');
      setResults([]);

      if (!query) return;

      try {
        const data = await API.searchPosts(query);
        if (!cancelled) setResults(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Search error');
      }
    }

    run();
    return () => { cancelled = true; };
  }, [query]);

  return (
    <div>
      <h2>Search results</h2>

      {VULN.XSS_SINK ? (
        <div
          dangerouslySetInnerHTML={{
            __html: `
              <div id="zap-xss-marker"></div>
              ${query}
            `
          }}
        />
      ) : (
        <div>{query}</div>
      )}

      <div style={{ marginBottom: 12 }}>
        <small>
          Seed:&nbsp;
          <Link to="/search?query=%3Cimg%20src%3Dx%20onerror%3D%22document.getElementById('zap-xss-marker').setAttribute('data-xss','1')%22%3E">XSS</Link>
          {' | '}
          <Link to="/search?query=%27%20OR%20%271%27%3D%271">SQLi-ish</Link>
        </small>
      </div>

      {error && <p className="error">{error}</p>}

      {query && (
        <p>
          <a href={`/search-share?q=${encodeURIComponent(query)}`} target="_blank" rel="noreferrer">
            Share search results
          </a>
        </p>
      )}

      {query && results.length === 0 && !error && <p>No posts found.</p>}

      {results.map(post => (
        <div key={post.id} className="post">
          <h3><Link to={`/posts/${post.id}`}>{post.title}</Link></h3>
          <p dangerouslySetInnerHTML={{ __html: post.content.substring(0, 100) + '...' }} />
        </div>
      ))}
    </div>
  );
}

export default Search;
