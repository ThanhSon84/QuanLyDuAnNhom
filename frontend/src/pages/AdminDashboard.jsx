import { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { useNavigate, Link } from 'react-router-dom';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalUsers: 0, totalProjects: 0, totalTasks: 0 });
  const [usersList, setUsersList] = useState([]);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/');
      return;
    }
    const fetchAdminData = async () => {
      try {
        const resStats = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/stats`);
        setStats(resStats.data);
        const resUsers = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/users`);
        setUsersList(resUsers.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAdminData();
  }, [user, navigate]);

  const changeRole = async (userId, newRole) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/users/${userId}/role`, { role: newRole });
      setUsersList(usersList.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error(err);
    }
  };

  const chartData = {
    labels: ['Users', 'Projects', 'Tasks'],
    datasets: [
      {
        label: 'System Statistics',
        data: [stats.totalUsers, stats.totalProjects, stats.totalTasks],
        backgroundColor: ['rgba(54, 162, 235, 0.6)', 'rgba(255, 206, 86, 0.6)', 'rgba(75, 192, 192, 0.6)'],
      },
    ],
  };

  const [allProjects, setAllProjects] = useState([]);

  useEffect(() => {
    if (user?.role === 'admin') {
      const fetchAllProjects = async () => {
        try {
          const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/projects`);
          setAllProjects(res.data);
        } catch(err) {
          console.error(err);
        }
      }
      fetchAllProjects();
    }
  }, [user]);

  const changeProjectStatus = async (projectId, newStatus) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/projects/${projectId}/status`, { status: newStatus });
      setAllProjects(allProjects.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Link to="/" className="text-blue-500 hover:underline mb-4 inline-block">&larr; Back to Dashboard</Link>
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-4">System Overview</h2>
          <div className="h-64">
            <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-4">Quick Stats</h2>
          <ul className="text-lg space-y-2">
            <li>Total Users: <span className="font-bold">{stats.totalUsers}</span></li>
            <li>Total Projects: <span className="font-bold">{stats.totalProjects}</span></li>
            <li>Total Tasks: <span className="font-bold">{stats.totalTasks}</span></li>
          </ul>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-bold mb-4">User Management</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b">
              <th className="p-2">Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">Role</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {usersList.map(u => (
              <tr key={u.id} className="border-b">
                <td className="p-2">{u.name}</td>
                <td className="p-2">{u.email}</td>
                <td className="p-2">{u.role}</td>
                <td className="p-2 flex gap-2 items-center">
                  <select 
                    value={u.role} 
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    className="border rounded p-1 text-sm"
                  >
                    <option value="member">Member</option>
                    <option value="leader">Leader</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button 
                    onClick={async () => {
                      if(window.confirm('Delete this user?')) {
                        await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/${u.id}`);
                        setUsersList(usersList.filter(user => user.id !== u.id));
                      }
                    }}
                    className="text-red-500 text-sm hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white p-4 rounded shadow mt-6">
        <h2 className="text-xl font-bold mb-4">Project Approval & Management</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b">
              <th className="p-2">Name</th>
              <th className="p-2">Leader</th>
              <th className="p-2">Status</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {allProjects.map(p => (
              <tr key={p.id} className="border-b">
                <td className="p-2">{p.name}</td>
                <td className="p-2">{p.leader_name || 'N/A'}</td>
                <td className="p-2">
                  <span className={`px-2 py-1 text-xs rounded ${p.status === 'active' ? 'bg-green-100 text-green-800' : p.status === 'locked' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {p.status}
                  </span>
                </td>
                <td className="p-2">
                  <select 
                    value={p.status} 
                    onChange={(e) => changeProjectStatus(p.id, e.target.value)}
                    className="border rounded p-1 text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="locked">Locked</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default AdminDashboard;
