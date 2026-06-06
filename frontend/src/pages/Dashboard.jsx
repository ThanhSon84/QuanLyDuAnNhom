import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [editingProject, setEditingProject] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchProjects();
  }, [user, navigate]);

  const fetchProjects = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/projects`);
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      if (editingProject) {
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/projects/${editingProject.id}`, {
          name: newProjectName,
          description: newProjectDesc
        });
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/projects`, {
          name: newProjectName,
          description: newProjectDesc
        });
      }
      setShowCreateModal(false);
      setEditingProject(null);
      setNewProjectName('');
      setNewProjectDesc('');
      fetchProjects();
    } catch (err) {
      console.error('Error creating/updating project:', err);
    }
  };

  const handleEditClick = (p) => {
    setEditingProject(p);
    setNewProjectName(p.name);
    setNewProjectDesc(p.description);
    setShowCreateModal(true);
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/projects/${projectId}`);
      fetchProjects();
    } catch (err) {
      console.error('Error deleting project:', err);
      alert('Error deleting project. Make sure you have permission.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Project Management System</h1>
        <div>
          <span className="mr-4 text-gray-600">Hello, {user?.name} ({user?.role})</span>
          {user?.role === 'admin' && <Link to="/admin" className="mr-4 text-blue-500 hover:underline">Admin Dashboard</Link>}
          <button onClick={logout} className="text-red-500 hover:underline">Logout</button>
        </div>
      </nav>

      <main className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Your Projects</h2>
          {(user?.role === 'admin' || user?.role === 'leader') && (
            <button 
              onClick={() => setShowCreateModal(true)} 
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              + Create Project
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <div key={p.id} className="bg-white p-4 rounded shadow flex flex-col">
              <div className="flex-1">
                <h3 className="text-xl font-bold">{p.name}</h3>
                <p className="text-gray-600">{p.description}</p>
                <p className="text-sm mt-2">Status: <span className="font-semibold">{p.status}</span></p>
                <p className="text-sm">Leader: {p.leader_name || 'N/A'}</p>
              </div>
              <div className="mt-4 flex justify-between items-center">
                <Link to={`/projects/${p.id}`} className="text-blue-500 hover:underline">View Details &rarr;</Link>
                {(user?.role === 'admin' || (user?.role === 'leader' && p.leader_id === user?.id)) && (
                  <div className="flex gap-2">
                    <button onClick={() => handleEditClick(p)} className="text-blue-500 text-sm hover:underline">Edit</button>
                    <button onClick={() => handleDeleteProject(p.id)} className="text-red-500 text-sm hover:underline">Delete</button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {projects.length === 0 && <p className="text-gray-500">No projects found.</p>}
        </div>
      </main>

      {/* Create / Edit Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-md w-96">
            <h2 className="text-xl font-bold mb-4">{editingProject ? 'Edit Project' : 'Create New Project'}</h2>
            <form onSubmit={handleCreateProject}>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Project Name</label>
                <input 
                  type="text" 
                  className="w-full border p-2 rounded"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Description</label>
                <textarea 
                  className="w-full border p-2 rounded"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                ></textarea>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => {setShowCreateModal(false); setEditingProject(null); setNewProjectName(''); setNewProjectDesc('');}} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">{editingProject ? 'Save' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
