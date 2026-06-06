import React, { useEffect, useState, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';

const ProjectDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [users, setUsers] = useState([]);
  const [suggestedUserId, setSuggestedUserId] = useState(null);
  const [editingTask, setEditingTask] = useState(null);

  const [showAddMember, setShowAddMember] = useState(false);
  const [memberToAdd, setMemberToAdd] = useState('');

  useEffect(() => {
    fetchData();

    // Socket Setup
    const newSocket = io(import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000');
    setSocket(newSocket);

    newSocket.emit('join_project', id);

    newSocket.on('receive_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => newSocket.close();
  }, [id]);

  const fetchData = async () => {
    try {
      const resTasks = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/projects/${id}/tasks`);
      setTasks(resTasks.data);
      const resMsgs = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/projects/${id}/messages`);
      setMessages(resMsgs.data);
      if (user?.role === 'admin' || user?.role === 'leader') {
        const resUsers = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/users`);
        setUsers(resUsers.data);
        
        // Fetch AI Suggestion
        try {
          const resSuggestion = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/suggest-member/${id}`);
          if(resSuggestion.data) {
             setSuggestedUserId(resSuggestion.data.id);
          }
        } catch (e) {
          console.error("Suggestion fetch error:", e);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/tasks/${taskId}/status`, { status: newStatus });
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberToAdd) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/projects/${id}/members`, {
        userId: memberToAdd
      });
      setShowAddMember(false);
      setMemberToAdd('');
      fetchData(); // Refresh to potentially update suggestion
      alert('Member added successfully!');
    } catch (err) {
      console.error('Error adding member:', err);
      alert('Failed to add member. They might already be in the project.');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/tasks/${editingTask.id}`, {
          title: taskTitle,
          description: taskDesc,
          assigned_to: assignedTo || null
        });
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/projects/${id}/tasks`, {
          title: taskTitle,
          description: taskDesc,
          assigned_to: assignedTo || null
        });
      }
      setShowCreateTask(false);
      setEditingTask(null);
      setTaskTitle('');
      setTaskDesc('');
      setAssignedTo('');
      fetchData(); // Refresh tasks
    } catch (err) {
      console.error('Error creating/updating task:', err);
    }
  };

  const handleEditTaskClick = (t) => {
    setEditingTask(t);
    setTaskTitle(t.title);
    setTaskDesc(t.description);
    setAssignedTo(t.assigned_to || '');
    setShowCreateTask(true);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && socket) {
      const token = localStorage.getItem('token');
      socket.emit('send_message', { projectId: id, userId: user.id, name: user.name, content: newMessage, token });
      setNewMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Link to="/" className="text-blue-500 hover:underline mb-4 inline-block">&larr; Back to Dashboard</Link>
      <div className="flex flex-col md:flex-row gap-6">
        {/* Tasks Section */}
        <div className="flex-1 bg-white p-4 rounded shadow relative">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Project Tasks</h2>
            {(user?.role === 'admin' || user?.role === 'leader') && (
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowAddMember(true)} 
                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                >
                  + Add Member
                </button>
                <button 
                  onClick={() => setShowCreateTask(true)} 
                  className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                >
                  + Add Task
                </button>
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            {tasks.map(task => (
              <div key={task.id} className="border p-3 rounded relative">
                {(user?.role === 'admin' || user?.role === 'leader') && (
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button onClick={() => handleEditTaskClick(task)} className="text-blue-500 text-xs hover:underline">Edit</button>
                    <button 
                      onClick={async () => {
                        if(window.confirm('Delete this task?')) {
                          await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/tasks/${task.id}`);
                          fetchData();
                        }
                      }}
                      className="text-red-500 text-xs hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                )}
                <h3 className="font-semibold pr-8">{task.title}</h3>
                <p className="text-gray-600 text-sm">{task.description}</p>
                <p className="text-xs mt-1 text-gray-500">Assigned to: {task.assignee_name || 'Unassigned'}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${task.status === 'todo' ? 'bg-yellow-100 text-yellow-800' : task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                  <select 
                    className="text-xs border p-1 rounded"
                    value={task.status} 
                    onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                  >
                    <option value="todo">Todo</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            ))}
            {tasks.length === 0 && <p className="text-gray-500">No tasks found.</p>}
          </div>
        </div>

        {/* Chat Section */}
        <div className="w-full md:w-1/3 bg-white p-4 rounded shadow flex flex-col h-[500px]">
          <h2 className="text-xl font-bold mb-4">Project Chat</h2>
          <div className="flex-1 overflow-y-auto mb-4 border p-2 rounded flex flex-col gap-2">
            {messages.map((msg, idx) => (
              <div key={idx} className={`max-w-[80%] p-2 rounded text-sm ${msg.user_id === user.id ? 'bg-blue-100 self-end' : 'bg-gray-100 self-start'}`}>
                <div className="font-semibold text-xs text-gray-600 mb-1">{msg.name}</div>
                <div>{msg.content}</div>
              </div>
            ))}
          </div>
          <form onSubmit={sendMessage} className="flex gap-2">
            <input 
              type="text" 
              className="flex-1 border rounded px-2 py-1 text-sm"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button type="submit" className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">Send</button>
          </form>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-md w-96">
            <h2 className="text-xl font-bold mb-4">Add Member to Project</h2>
            <form onSubmit={handleAddMember}>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Select User</label>
                <select 
                  className="w-full border p-2 rounded"
                  value={memberToAdd}
                  onChange={(e) => setMemberToAdd(e.target.value)}
                  required
                >
                  <option value="">-- Select User --</option>
                  {users.filter(u => u.role === 'member').map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddMember(false)} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit Task Modal */}
      {showCreateTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-md w-96">
            <h2 className="text-xl font-bold mb-4">{editingTask ? 'Edit Task' : 'Create New Task'}</h2>
            <form onSubmit={handleCreateTask}>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Title</label>
                <input 
                  type="text" 
                  className="w-full border p-2 rounded"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">Description</label>
                <textarea 
                  className="w-full border p-2 rounded"
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                ></textarea>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-2">
                  Assign To
                  {suggestedUserId && <span className="ml-2 text-xs font-normal text-green-600">(AI Suggestion available)</span>}
                </label>
                <select 
                  className="w-full border p-2 rounded"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} {suggestedUserId === u.id ? '✨ (Suggested)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => {setShowCreateTask(false); setEditingTask(null); setTaskTitle(''); setTaskDesc(''); setAssignedTo('');}} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">{editingTask ? 'Save Task' : 'Create Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
