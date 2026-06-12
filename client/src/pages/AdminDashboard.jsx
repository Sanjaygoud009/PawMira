import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { PageLoader } from '../components/ui/LoadingSpinner';
import { ShieldCheck, Users, AlertTriangle, LayoutDashboard, MessageSquare, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';

function Modal({ title, onClose, children }) {
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-dark/60 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral bg-gray-50/50">
            <h2 className="text-lg font-bold text-dark">{title}</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral transition-colors text-text-light hover:text-dark">
              ✕
            </button>
          </div>
          <div className="p-6">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [lostFound, setLostFound] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [modModal, setModModal] = useState(null); // { type: 'report'|'lost'|'found', id }
  const [modReason, setModReason] = useState('spam');
  
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editMessageContent, setEditMessageContent] = useState('');

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/admin/stats');
      setStats(data);
    } catch (err) {
      toast.error('Failed to load stats');
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data);
    } catch (err) {
      toast.error('Failed to load users');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success('User deleted successfully');
      setUsers(prev => prev.filter(u => u._id !== userId));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const fetchContentForModeration = async () => {
    try {
      // Reusing public routes but they return everything if we fetch them. Actually we can just fetch the active ones.
      const [reportsRes, lostRes, foundRes] = await Promise.all([
        api.get('/reports'),
        api.get('/lost-found/lost-pets'),
        api.get('/lost-found/found-pets')
      ]);
      setReports(reportsRes.data);
      setLostFound([...lostRes.data.map(d => ({ ...d, type: 'lost' })), ...foundRes.data.map(d => ({ ...d, type: 'found' }))]);
    } catch (err) {
      toast.error('Failed to load content for moderation');
    }
  };

  const fetchMessages = async (userId) => {
    try {
      const { data } = await api.get(`/admin/messages/${userId}`);
      setMessages(data);
    } catch (err) {
      toast.error('Failed to load messages');
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStats(), fetchUsers(), fetchContentForModeration()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser._id);
    }
  }, [selectedUser]);

  const handleModerate = async () => {
    try {
      if (modModal.type === 'report') {
        await api.delete(`/admin/reports/${modModal.id}`, { data: { reason: modReason } });
      } else {
        await api.delete(`/admin/lost-found/${modModal.type}/${modModal.id}`, { data: { reason: modReason } });
      }
      toast.success('Content removed successfully');
      setModModal(null);
      fetchContentForModeration(); // Refresh list
    } catch (err) {
      toast.error('Failed to moderate content');
    }
  };

  const handleApproveFoundPet = async (id) => {
    try {
      await api.put(`/admin/found-pets/${id}/approve`);
      toast.success('Found Pet post approved');
      fetchContentForModeration();
    } catch (err) {
      toast.error('Failed to approve post');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;
    try {
      const { data } = await api.post('/admin/messages', { receiver_id: selectedUser._id, content: newMessage });
      setMessages(prev => [...prev, data]);
      setNewMessage('');
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  const handleEditMessage = async (e) => {
    e.preventDefault();
    if (!editMessageContent.trim() || !editingMessageId) return;
    try {
      const { data } = await api.put(`/admin/messages/${editingMessageId}`, { content: editMessageContent });
      setMessages(prev => prev.map(m => m._id === editingMessageId ? data : m));
      setEditingMessageId(null);
      setEditMessageContent('');
      toast.success('Message updated');
    } catch (err) {
      toast.error('Failed to edit message');
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-2">
          <div className="mb-6 px-4">
            <h1 className="text-2xl font-black text-dark flex items-center gap-2">
              <ShieldCheck className="text-error" size={28} /> Admin
            </h1>
            <p className="text-sm text-text-light">Control Panel</p>
          </div>

          <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'overview' ? 'bg-primary/10 text-primary' : 'text-text-light hover:bg-neutral hover:text-dark'}`}>
            <LayoutDashboard size={20} /> Overview
          </button>
          <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'users' ? 'bg-primary/10 text-primary' : 'text-text-light hover:bg-neutral hover:text-dark'}`}>
            <Users size={20} /> Users & NGOs
          </button>
          <button onClick={() => setActiveTab('moderation')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'moderation' ? 'bg-error/10 text-error' : 'text-text-light hover:bg-neutral hover:text-dark'}`}>
            <AlertTriangle size={20} /> Content Moderation
          </button>
          <button onClick={() => setActiveTab('messages')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'messages' ? 'bg-primary/10 text-primary' : 'text-text-light hover:bg-neutral hover:text-dark'}`}>
            <MessageSquare size={20} /> Secure Inbox
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white rounded-3xl p-6 shadow-sm border border-neutral min-h-[600px]">
          
          {activeTab === 'overview' && stats && (
            <div className="space-y-6 animate-in fade-in">
              <h2 className="text-xl font-bold text-dark mb-4">Platform Overview</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-neutral p-5 rounded-2xl">
                  <p className="text-text-light text-sm font-semibold mb-1">Total Volunteers</p>
                  <p className="text-3xl font-black text-dark">{stats.totalUsers}</p>
                </div>
                <div className="bg-primary/10 p-5 rounded-2xl">
                  <p className="text-primary text-sm font-semibold mb-1">Registered NGOs</p>
                  <p className="text-3xl font-black text-primary">{stats.totalNGOs}</p>
                </div>
                <div className="bg-error/10 p-5 rounded-2xl">
                  <p className="text-error text-sm font-semibold mb-1">Active Rescues</p>
                  <p className="text-3xl font-black text-error">{stats.activeRescues}</p>
                </div>
                <div className="bg-success/10 p-5 rounded-2xl">
                  <p className="text-success text-sm font-semibold mb-1">Resolved Rescues</p>
                  <p className="text-3xl font-black text-success">{stats.resolvedRescues}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="animate-in fade-in">
              <h2 className="text-xl font-bold text-dark mb-6">User Management</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-text-light uppercase bg-neutral/50">
                    <tr>
                      <th className="px-4 py-3 rounded-l-lg">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Joined</th>
                      <th className="px-4 py-3 rounded-r-lg">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id} className="border-b border-neutral last:border-0">
                        <td className="px-4 py-3 font-semibold text-dark">{u.name}</td>
                        <td className="px-4 py-3 text-text-light">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${u.role === 'admin' ? 'bg-error/10 text-error' : u.role === 'ngo' ? 'bg-primary/10 text-primary' : 'bg-neutral text-text-dark'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {u.isVerified ? (
                            <span className="text-xs font-bold text-success bg-success/10 px-2.5 py-1 rounded-full">Verified</span>
                          ) : (
                            <span className="text-xs font-bold text-warning bg-warning/10 px-2.5 py-1 rounded-full">Unverified</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-text-light">{format(new Date(u.created_at), 'MMM d, yyyy')}</td>
                        <td className="px-4 py-3 flex gap-3">
                          <button onClick={() => { setActiveTab('messages'); setSelectedUser(u); }} className="text-primary hover:underline text-xs font-semibold">Message</button>
                          {!u.isVerified && (
                            <button onClick={() => handleDeleteUser(u._id)} className="text-error hover:underline text-xs font-semibold">Delete</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'moderation' && (
            <div className="animate-in fade-in">
              <h2 className="text-xl font-bold text-dark mb-6 text-error flex items-center gap-2">
                <AlertTriangle /> Active Content Moderation
              </h2>
              
              <div className="space-y-8">
                <div>
                  <h3 className="font-bold text-lg mb-3">Emergency Reports</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reports.map(r => (
                      <div key={r._id} className="border border-neutral p-4 rounded-xl flex justify-between items-start gap-4 hover:border-error/30 transition-colors">
                        <div>
                          <p className="font-bold text-sm text-dark capitalize">{r.issue_type.replace('_', ' ')}</p>
                          <p className="text-xs text-text-light line-clamp-2 mt-1">{r.description}</p>
                          <p className="text-xs text-neutral-dark mt-2">Reported by: {r.reporter_name || 'Anonymous'} • {format(new Date(r.created_at), 'MMM d')}</p>
                        </div>
                        <button onClick={() => setModModal({ type: 'report', id: r._id })} className="p-2 text-error hover:bg-error/10 rounded-lg shrink-0" title="Remove Report">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                    {reports.length === 0 && <p className="text-sm text-text-light">No active reports.</p>}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-lg mb-3">Lost & Found Pets</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lostFound.map(lf => (
                      <div key={lf._id} className="border border-neutral p-4 rounded-xl flex justify-between items-start gap-4 hover:border-error/30 transition-colors">
                        <div>
                          <p className="font-bold text-sm text-dark capitalize">{lf.type} Pet: {lf.pet_name || lf.animal_type}</p>
                          <p className="text-xs text-text-light line-clamp-2 mt-1">{lf.description}</p>
                          {lf.type === 'found' && lf.verification_status === 'pending' && (
                            <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-warning/10 text-warning">
                              Pending Approval
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          {lf.type === 'found' && lf.verification_status === 'pending' && (
                            <button onClick={() => handleApproveFoundPet(lf._id)} className="px-3 py-1 bg-success/10 text-success hover:bg-success hover:text-white rounded-lg text-xs font-bold transition-colors">
                              Approve
                            </button>
                          )}
                          <button onClick={() => setModModal({ type: lf.type, id: lf._id })} className="p-2 text-error hover:bg-error/10 rounded-lg" title="Remove Post">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {lostFound.length === 0 && <p className="text-sm text-text-light">No active lost/found posts.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="animate-in fade-in h-full flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/3 border-r border-neutral pr-4">
                <h2 className="text-xl font-bold text-dark mb-4">Inbox</h2>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  <button
                    onClick={() => {
                      setSelectedUser({ _id: 'ALL', name: 'Broadcast to All', role: '📢 Announcement' });
                      setMessages([]); // We could fetch past broadcasts, but for simplicity we'll just start fresh for a new broadcast
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-colors ${selectedUser?._id === 'ALL' ? 'bg-primary/10 border border-primary/20' : 'bg-primary/5 hover:bg-primary/10 border border-transparent'}`}
                  >
                    <p className="font-bold text-sm text-primary">📢 Broadcast to All</p>
                    <p className="text-xs text-text-light">Send to every user</p>
                  </button>
                  {users.filter(u => u.role !== 'admin').map(u => (
                    <button
                      key={u._id}
                      onClick={() => setSelectedUser(u)}
                      className={`w-full text-left p-3 rounded-xl transition-colors ${selectedUser?._id === u._id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-neutral border border-transparent'}`}
                    >
                      <p className="font-bold text-sm text-dark">{u.name}</p>
                      <p className="text-xs text-text-light capitalize">{u.role}</p>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="w-full md:w-2/3 flex flex-col h-[500px]">
                {selectedUser ? (
                  <>
                    <div className="pb-4 border-b border-neutral mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-dark">Chat with {selectedUser.name}</h3>
                        <p className="text-xs text-success flex items-center gap-1">🔒 Server-Side Encrypted</p>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto mb-4 space-y-3 pr-2 custom-scrollbar flex flex-col">
                      {messages.map(m => (
                        <div key={m._id} className={`max-w-[80%] rounded-2xl p-3 text-sm ${m.sender === selectedUser._id ? 'bg-neutral text-dark self-start rounded-tl-none' : 'bg-primary text-white self-end rounded-tr-none shadow-md shadow-primary/20'} group`}>
                          {editingMessageId === m._id ? (
                            <form onSubmit={handleEditMessage} className="flex flex-col gap-2">
                              <input 
                                autoFocus
                                value={editMessageContent}
                                onChange={(e) => setEditMessageContent(e.target.value)}
                                className="w-full bg-white/20 text-white placeholder-white/50 border border-white/30 rounded-lg px-2 py-1 text-sm focus:outline-none"
                              />
                              <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setEditingMessageId(null)} className="text-[10px] text-white/80 hover:text-white">Cancel</button>
                                <button type="submit" className="text-[10px] font-bold text-white bg-white/20 px-2 py-0.5 rounded hover:bg-white/30">Save</button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <div className="flex justify-between items-start gap-2">
                                <span>{m.content}</span>
                                {m.sender !== selectedUser._id && (
                                  <button onClick={() => { setEditingMessageId(m._id); setEditMessageContent(m.content); }} className="opacity-0 group-hover:opacity-100 text-white/80 hover:text-white transition-opacity">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                  </button>
                                )}
                              </div>
                              <p className={`text-[10px] mt-1 ${m.sender === selectedUser._id ? 'text-text-light' : 'text-white/70'}`}>
                                {format(new Date(m.created_at), 'h:mm a')} {m.is_edited && <span className="italic ml-1 opacity-80">(edited)</span>}
                              </p>
                            </>
                          )}
                        </div>
                      ))}
                      {messages.length === 0 && selectedUser._id !== 'ALL' && <p className="text-sm text-text-light text-center mt-10">No messages yet. Say hello!</p>}
                      {messages.length === 0 && selectedUser._id === 'ALL' && <p className="text-sm text-text-light text-center mt-10">Send a broadcast message to all users and NGOs.</p>}
                    </div>
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder={`Message ${selectedUser.name}...`}
                        className="flex-1 bg-neutral rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <button type="submit" disabled={!newMessage.trim()} className="bg-primary text-white px-6 rounded-xl font-bold text-sm hover:bg-primary-hover disabled:opacity-50 transition-colors">
                        Send
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-text-light">
                    <MessageSquare size={48} className="mb-4 opacity-20" />
                    <p>Select a user or NGO to start messaging.</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {modModal && (
        <Modal title="Confirm Removal" onClose={() => setModModal(null)}>
          <div className="space-y-4">
            <p className="text-sm text-dark">Please select a reason for removing this content. This will soft-delete the record for audit purposes.</p>
            <div>
              <label className="block text-xs font-semibold text-text-light mb-2 uppercase tracking-wide">Moderation Reason</label>
              <select 
                value={modReason} 
                onChange={e => setModReason(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-neutral text-sm focus:outline-none focus:border-error focus:ring-1 focus:ring-error/20 bg-gray-50/50 appearance-none"
              >
                <option value="spam">Spam</option>
                <option value="fake rescue">Fake Rescue / Fraud</option>
                <option value="abuse">Abuse / Harassment</option>
                <option value="dangerous content">Dangerous Content</option>
                <option value="duplicate">Duplicate Post</option>
              </select>
            </div>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setModModal(null)} className="flex-1 py-3 rounded-xl border border-neutral text-sm font-semibold text-dark hover:bg-neutral transition-colors">Cancel</button>
              <button onClick={handleModerate} className="flex-1 py-3 rounded-xl bg-error text-white text-sm font-bold hover:bg-red-600 transition-colors shadow-md shadow-error/20">
                Remove Content
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
