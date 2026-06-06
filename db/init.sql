CREATE DATABASE IF NOT EXISTS pms;
USE pms;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'leader', 'member') NOT NULL DEFAULT 'member',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('pending', 'active', 'completed', 'locked') DEFAULT 'active',
  leader_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('todo', 'in_progress', 'completed') DEFAULT 'todo',
  assigned_to INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bảng lưu trữ liên kết project_members (Dự án có những thành viên nào)
CREATE TABLE project_members (
  project_id INT NOT NULL,
  user_id INT NOT NULL,
  PRIMARY KEY (project_id, user_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert một tài khoản Admin mặc định (password: admin123 => mã hoá lát tính sau hoặc insert qua Backend)
-- Mật khẩu đã mã hoá bcrypt cho 'admin123'
INSERT INTO users (name, email, password, role) VALUES 
('System Admin', 'admin@example.com', '$2a$10$wE9X.uT5zE4yYwF./2w68u3Q1R5v4.5Uf3H0u0PZ1fD9J/v2kZ8G6', 'admin'),
('John Leader', 'leader@example.com', '$2a$10$wE9X.uT5zE4yYwF./2w68u3Q1R5v4.5Uf3H0u0PZ1fD9J/v2kZ8G6', 'leader'),
('Alice Member', 'member@example.com', '$2a$10$wE9X.uT5zE4yYwF./2w68u3Q1R5v4.5Uf3H0u0PZ1fD9J/v2kZ8G6', 'member');
