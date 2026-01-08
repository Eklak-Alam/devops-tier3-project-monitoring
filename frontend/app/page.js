'use client';
import { useState, useEffect, useCallback } from 'react';

// --- 1. CONFIGURATION & HELPERS ---
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const apiCall = async (endpoint, method = 'GET', body = null) => {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${endpoint}`, options);
    
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error(`Server returned non-JSON response: ${res.status}`);
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    return data;
  } catch (err) {
    console.error(`API Fail [${method} ${endpoint}]:`, err);
    throw err;
  }
};

// --- 2. ICONS ---
const Icons = {
  User: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Edit: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>,
  Trash: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Check: () => <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  Server: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'User' });
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState({ msg: "Initializing...", type: "idle" });

  // Use useCallback to keep the function reference stable
  const loadUsers = useCallback(async () => {
    try {
      const data = await apiCall('/api/users');
      setUsers(Array.isArray(data) ? data : []);
      setStatus({ msg: "System Operational", type: "success" });
    } catch (err) {
      setStatus({ msg: "Connection Lost", type: "error" });
    }
  }, []);

  // --- FIXED: Updated useEffect ---
  // We use an empty dependency array [] to ensure it runs only ONCE on mount.
  // We disable the lint warning because we know loadUsers is safe (it doesn't use volatile state).
  useEffect(() => { 
    loadUsers(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ msg: "Processing Transaction...", type: "loading" });

    try {
      if (editingId) {
        await apiCall(`/api/users/${editingId}`, 'PUT', formData);
        setStatus({ msg: "User Record Updated", type: "success" });
      } else {
        await apiCall('/api/users', 'POST', formData);
        setStatus({ msg: "User Registered", type: "success" });
      }
      setFormData({ name: '', email: '', role: 'User' });
      setEditingId(null);
      loadUsers();
    } catch (err) {
      setStatus({ msg: err.message, type: "error" });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Confirm deletion of this user record?")) return;
    try {
      await apiCall(`/api/users/${id}`, 'DELETE');
      setStatus({ msg: "Record Expunged", type: "success" });
      loadUsers();
    } catch (err) {
      setStatus({ msg: err.message, type: "error" });
    }
  };

  const handleEdit = (user) => {
    setFormData({ name: user.name, email: user.email, role: user.role });
    setEditingId(user.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-gray-200 font-sans selection:bg-orange-500/30">
      
      {/* --- NAVBAR --- */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.5)]">
               <Icons.Server />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">
              User<span className="text-orange-500">Management</span>
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`hidden md:flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-full border ${
              status.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
              status.type === 'loading' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
              'bg-green-500/10 border-green-500/20 text-green-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${status.type === 'loading' ? 'animate-pulse bg-yellow-400' : 'bg-current'}`}></span>
              {status.msg}
            </div>
          </div>
        </div>
      </nav>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-grow p-6 md:p-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* LEFT: FORM (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#0f0f10] border border-white/5 rounded-2xl p-6 shadow-2xl sticky top-24">
              <div className="mb-6 pb-4 border-b border-white/5">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {editingId ? "Edit Profile" : "New User"}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {editingId ? "Modify existing user permissions." : "Add a new member to the database."}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase ml-1 mb-1 block">Full Name</label>
                  <input 
                    className="w-full bg-[#18181b] border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 outline-none transition text-white placeholder-gray-600"
                    placeholder="e.g. Eklak Alam"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase ml-1 mb-1 block">Email Address</label>
                  <input 
                    className="w-full bg-[#18181b] border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 outline-none transition text-white placeholder-gray-600"
                    placeholder="user@example.com"
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase ml-1 mb-1 block">System Role</label>
                  <div className="relative">
                    <select 
                      className="w-full bg-[#18181b] border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 outline-none transition text-white appearance-none cursor-pointer"
                      value={formData.role}
                      onChange={e => setFormData({...formData, role: e.target.value})}
                    >
                      <option>User</option>
                      <option>Admin</option>
                      <option>DevOps</option>
                    </select>
                    <div className="absolute right-4 top-3.5 pointer-events-none text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="submit" 
                    className="flex-1 bg-white text-black hover:bg-orange-500 hover:text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(249,115,22,0.4)]"
                  >
                    {editingId ? "Save Updates" : "Create User"}
                  </button>
                  {editingId && (
                    <button 
                      type="button" 
                      onClick={() => {setEditingId(null); setFormData({name:'', email:'', role:'User'})}} 
                      className="px-5 bg-[#18181b] hover:bg-[#27272a] text-gray-400 hover:text-white rounded-xl transition-colors border border-white/5"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* RIGHT: LIST (8 cols) */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Overview</h3>
              <span className="text-xs bg-white/5 text-gray-400 px-3 py-1 rounded-full border border-white/5">
                {users.length} Records Found
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {users.length === 0 ? (
                <div className="col-span-full py-20 text-center bg-[#0f0f10] border border-white/5 border-dashed rounded-2xl">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-600">
                    <Icons.User />
                  </div>
                  <h4 className="text-gray-300 font-medium">No Users Found</h4>
                  <p className="text-gray-600 text-sm mt-1">Start by adding a new user from the form.</p>
                </div>
              ) : (
                users.map(user => (
                  <div key={user.id} className="group bg-[#0f0f10] hover:bg-[#141415] border border-white/5 hover:border-orange-500/30 p-5 rounded-2xl transition-all duration-300 relative overflow-hidden">
                    
                    {/* Role Badge */}
                    <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[10px] font-bold tracking-wider uppercase ${
                      user.role === 'Admin' ? 'bg-red-500/20 text-red-500' :
                      user.role === 'DevOps' ? 'bg-blue-500/20 text-blue-500' :
                      'bg-gray-800 text-gray-500'
                    }`}>
                      {user.role}
                    </div>

                    <div className="flex items-start gap-4">
                      {/* Avatar Placeholder */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center text-sm font-bold text-gray-400">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium truncate pr-8">{user.name}</h4>
                        <p className="text-gray-500 text-xs truncate font-mono mt-0.5">{user.email}</p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center opacity-40 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-gray-600">ID: #{user.id}</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEdit(user)}
                          className="p-2 hover:bg-orange-500/10 text-gray-400 hover:text-orange-500 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Icons.Edit />
                        </button>
                        <button 
                          onClick={() => handleDelete(user.id)}
                          className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Icons.Trash />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </main>

      {/* --- FOOTER --- */}
      <footer className="border-t border-white/5 bg-[#050505] py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-gray-500 text-sm">
            © 2026 <span className="text-orange-500 font-semibold">UserManagement</span> Inc. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Support</a>
          </div>
        </div>
      </footer>
      
    </div>
  );
}