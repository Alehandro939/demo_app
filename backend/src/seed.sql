INSERT INTO posts (title, content, author_email)
VALUES
('Hello DevSecOps', 'Primul post. <b>bold</b> si <script>alert("xss")</script>', 'demo@local')
ON CONFLICT DO NOTHING;
