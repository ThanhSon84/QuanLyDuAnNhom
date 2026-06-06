const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'pms',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// --- Middleware Authentication ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkeyforproject', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

// --- AUTH API ---
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );
    res.status(201).json({ id: result.insertId, name, email });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Database error' });
  }
});

// Edit project
app.put('/api/projects/:id', authenticateToken, authorizeRole(['admin', 'leader']), async (req, res) => {
  const { name, description } = req.body;
  try {
    if (req.user.role === 'leader') {
      const [proj] = await pool.execute('SELECT leader_id FROM projects WHERE id = ?', [req.params.id]);
      if (proj.length === 0 || proj[0].leader_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    }
    await pool.execute('UPDATE projects SET name = ?, description = ? WHERE id = ?', [name, description, req.params.id]);
    res.json({ message: 'Project updated' });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete project
app.delete('/api/projects/:id', authenticateToken, authorizeRole(['admin', 'leader']), async (req, res) => {
  try {
    if (req.user.role === 'leader') {
      const [proj] = await pool.execute('SELECT leader_id FROM projects WHERE id = ?', [req.params.id]);
      if (proj.length === 0 || proj[0].leader_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    }
    await pool.execute('DELETE FROM projects WHERE id = ?', [req.params.id]);
    res.json({ message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    
    const user = users[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET || 'supersecretjwtkeyforproject',
      { expiresIn: '24h' }
    );
    
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Edit task
app.put('/api/tasks/:id', authenticateToken, authorizeRole(['admin', 'leader']), async (req, res) => {
  const { title, description, assigned_to } = req.body;
  try {
    if (req.user.role === 'leader') {
      const [task] = await pool.execute('SELECT p.leader_id FROM tasks t JOIN projects p ON t.project_id = p.id WHERE t.id = ?', [req.params.id]);
      if (task.length === 0 || task[0].leader_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    }
    await pool.execute('UPDATE tasks SET title = ?, description = ?, assigned_to = ? WHERE id = ?', [title, description, assigned_to, req.params.id]);
    res.json({ message: 'Task updated' });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete task
app.delete('/api/tasks/:id', authenticateToken, authorizeRole(['admin', 'leader']), async (req, res) => {
  try {
    if (req.user.role === 'leader') {
      const [task] = await pool.execute('SELECT p.leader_id FROM tasks t JOIN projects p ON t.project_id = p.id WHERE t.id = ?', [req.params.id]);
      if (task.length === 0 || task[0].leader_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    }
    await pool.execute('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// --- USER CRUD ---
app.put('/api/users/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { name, email } = req.body;
  try {
    await pool.execute('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, req.params.id]);
    res.json({ message: 'User updated' });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/users/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    await pool.execute('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// --- ADMIN API ---
app.get('/api/admin/stats', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const [users] = await pool.execute('SELECT COUNT(*) as count FROM users');
    const [projects] = await pool.execute('SELECT COUNT(*) as count FROM projects');
    const [tasks] = await pool.execute('SELECT COUNT(*) as count FROM tasks');
    res.json({
      totalUsers: users[0].count,
      totalProjects: projects[0].count,
      totalTasks: tasks[0].count
    });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/admin/users', authenticateToken, authorizeRole(['admin', 'leader']), async (req, res) => {
  try {
    const [users] = await pool.execute('SELECT id, name, email, role, created_at FROM users');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/admin/users/:id/role', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { role } = req.body;
    await pool.execute('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    res.json({ message: 'Role updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// --- PROJECT API ---
// Leader tạo dự án
app.post('/api/projects', authenticateToken, authorizeRole(['admin', 'leader']), async (req, res) => {
  const { name, description } = req.body;
  try {
    const [result] = await pool.execute(
      'INSERT INTO projects (name, description, leader_id) VALUES (?, ?, ?)',
      [name, description, req.user.id]
    );
    res.status(201).json({ id: result.insertId, name, description, leader_id: req.user.id });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Lấy danh sách dự án
app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    let query = 'SELECT p.*, u.name as leader_name FROM projects p LEFT JOIN users u ON p.leader_id = u.id';
    // Nếu là member thì chỉ lấy project mà nó làm leader hoặc là member
    if (req.user.role === 'member') {
      const [projects] = await pool.execute(`
        SELECT p.*, u.name as leader_name 
        FROM projects p 
        LEFT JOIN users u ON p.leader_id = u.id
        LEFT JOIN project_members pm ON p.id = pm.project_id
        WHERE p.leader_id = ? OR pm.user_id = ?
        GROUP BY p.id
      `, [req.user.id, req.user.id]);
      return res.json(projects);
    }
    const [projects] = await pool.execute(query);
    res.json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Thêm member vào dự án
app.post('/api/projects/:id/members', authenticateToken, authorizeRole(['admin', 'leader']), async (req, res) => {
  const { userId } = req.body;
  const projectId = req.params.id;
  try {
    if (req.user.role === 'leader') {
      const [proj] = await pool.execute('SELECT leader_id FROM projects WHERE id = ?', [projectId]);
      if (proj.length === 0 || proj[0].leader_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    }
    await pool.execute(
      'INSERT INTO project_members (project_id, user_id) VALUES (?, ?)',
      [projectId, userId]
    );
    res.json({ message: 'Member added' });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Admin hoặc Leader chuyển trạng thái dự án
app.put('/api/projects/:id/status', authenticateToken, authorizeRole(['admin', 'leader']), async (req, res) => {
  const { status } = req.body;
  try {
    await pool.execute('UPDATE projects SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'Status updated' });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// --- TASK API ---
// Lấy task trong project
app.get('/api/projects/:projectId/tasks', authenticateToken, async (req, res) => {
  try {
    const [tasks] = await pool.execute(
      'SELECT t.*, u.name as assignee_name FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE project_id = ?',
      [req.params.projectId]
    );
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Tạo task (leader/admin)
app.post('/api/projects/:projectId/tasks', authenticateToken, authorizeRole(['admin', 'leader']), async (req, res) => {
  const { title, description, assigned_to } = req.body;
  try {
    if (req.user.role === 'leader') {
      const [proj] = await pool.execute('SELECT leader_id FROM projects WHERE id = ?', [req.params.projectId]);
      if (proj.length === 0 || proj[0].leader_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    }
    const [result] = await pool.execute(
      'INSERT INTO tasks (project_id, title, description, assigned_to) VALUES (?, ?, ?, ?)',
      [req.params.projectId, title, description, assigned_to]
    );
    res.status(201).json({ id: result.insertId, title, description, assigned_to });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Cập nhật trạng thái task (chỉ update được nếu thuộc dự án mình tham gia)
app.put('/api/tasks/:id/status', authenticateToken, async (req, res) => {
  const { status } = req.body;
  try {
    if (req.user.role === 'member') {
      const [task] = await pool.execute(`
        SELECT pm.project_id FROM tasks t 
        JOIN project_members pm ON t.project_id = pm.project_id 
        WHERE t.id = ? AND pm.user_id = ?
      `, [req.params.id, req.user.id]);
      if (task.length === 0) return res.status(403).json({ error: 'Forbidden' });
    }
    await pool.execute('UPDATE tasks SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'Task status updated' });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Suggest assigned_to (AI simulation)
app.get('/api/suggest-member/:projectId', authenticateToken, authorizeRole(['admin', 'leader']), async (req, res) => {
  try {
    // Tìm member trong project có ít task đang làm ('todo', 'in_progress') nhất
    const [rows] = await pool.execute(`
      SELECT pm.user_id as id, u.name, 
        (SELECT COUNT(*) FROM tasks t WHERE t.assigned_to = pm.user_id AND t.status != 'completed') as active_tasks
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ?
      ORDER BY active_tasks ASC
      LIMIT 1
    `, [req.params.projectId]);
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.json(null);
    }
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// --- MESSAGES API ---
app.get('/api/projects/:projectId/messages', authenticateToken, async (req, res) => {
  try {
    const [messages] = await pool.execute(
      'SELECT m.*, u.name FROM messages m JOIN users u ON m.user_id = u.id WHERE project_id = ? ORDER BY created_at ASC',
      [req.params.projectId]
    );
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// --- Socket.io for Real-time chat ---
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Require authentication for socket.io messaging
  socket.use((packet, next) => {
    const event = packet[0];
    const data = packet[1];
    
    // Allow join_project without strict auth checks for simplicity, but strictly check send_message
    if (event === 'send_message') {
      if (!data.token) return next(new Error('Authentication error'));
      jwt.verify(data.token, process.env.JWT_SECRET || 'supersecretjwtkeyforproject', (err, user) => {
        if (err) return next(new Error('Authentication error'));
        socket.user = user;
        next();
      });
    } else {
      next();
    }
  });

  socket.on('join_project', (projectId) => {
    socket.join(`project_${projectId}`);
    console.log(`User joined project_${projectId}`);
  });

  socket.on('send_message', async (data) => {
    // data: { projectId, content, token } (userId and name come from socket.user)
    try {
      if(!socket.user) return; // Prevent unauthorized

      const [result] = await pool.execute(
        'INSERT INTO messages (project_id, user_id, content) VALUES (?, ?, ?)',
        [data.projectId, socket.user.id, data.content]
      );
      const newMsg = {
        id: result.insertId,
        project_id: data.projectId,
        user_id: socket.user.id,
        content: data.content,
        name: socket.user.name,
        created_at: new Date()
      };
      io.to(`project_${data.projectId}`).emit('receive_message', newMsg);
    } catch (error) {
      console.error('Error saving message', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
