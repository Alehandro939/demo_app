CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Utilizator și date inițiale
INSERT INTO users (username, password) VALUES ('admin', 'admin');
INSERT INTO posts (title, content, author) VALUES 
('Prima postare', 'Salut, acesta este conținutul primei postări!', 'admin');
INSERT INTO comments (post_id, content, author) VALUES 
(1, 'Primul comentariu la postare.', 'admin');
