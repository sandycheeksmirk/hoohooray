"use client";
import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import styles from '../page.module.css'; // Reusing some styles

export default function AdminPage() {
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [chats, setChats] = useState<any[]>([]);
    const [view, setView] = useState<'users' | 'chats'>('users');
    const [loading, setLoading] = useState(false);
    const [selectedChat, setSelectedChat] = useState<any | null>(null);
    const [chatMessages, setChatMessages] = useState<any[]>([]);

    // Simple auth check
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'admin1234') {
            setIsAuthenticated(true);
            fetchData();
        } else {
            alert('Incorrect password');
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Users
            const usersSnap = await getDocs(collection(db, 'users'));
            const usersData = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(usersData);

            // Fetch Chats
            const chatsSnap = await getDocs(query(collection(db, 'chats'), orderBy('updatedAt', 'desc')));
            const chatsData = chatsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setChats(chatsData);

        } catch (error) {
            console.error("Error fetching data:", error);
            alert("Error fetching data. See console.");
        } finally {
            setLoading(false);
        }
    };

    // Real-time listener for chat messages when a chat is selected
    useEffect(() => {
        if (!selectedChat) return;

        const q = query(collection(db, `chats/${selectedChat.id}/messages`), orderBy('createdAt', 'asc'));
        const unsub = onSnapshot(q, (snapshot) => {
            setChatMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => unsub();
    }, [selectedChat]);

    const toggleBlockUser = async (uid: string, currentStatus: boolean) => {
        if (!confirm(`Are you sure you want to ${currentStatus ? 'unblock' : 'block'} this user?`)) return;
        try {
            await updateDoc(doc(db, 'users', uid), { blocked: !currentStatus });
            // Update local state
            setUsers(users.map(u => u.id === uid ? { ...u, blocked: !currentStatus } : u));
        } catch (e) {
            console.error(e);
            alert('Error updating user status');
        }
    };

    const changeUserId = async (uid: string, currentUsername: string) => {
        const newUsername = prompt("Enter new username (User ID):", currentUsername || "");
        if (!newUsername || newUsername === currentUsername) return;

        const cleanName = newUsername.trim().toLowerCase();

        // 1. Check if taken
        // Ideally we check 'usernames' collection
        try {
            // Retrieve old username mapping if exists
            const oldUsername = currentUsername;

            // Create new mapping
            // Warning: This ignores race conditions but is sufficient for admin tool
            await setDoc(doc(db, 'usernames', cleanName), { uid });

            // Update user doc
            await updateDoc(doc(db, 'users', uid), { username: cleanName });

            // Delete old mapping if it existed
            if (oldUsername) {
                try {
                    await deleteDoc(doc(db, 'usernames', oldUsername));
                } catch (e) {
                    // Ignore if didn't exist
                }
            }

            // Update local state
            setUsers(users.map(u => u.id === uid ? { ...u, username: cleanName } : u));

            alert(`Username changed to ${cleanName}`);
        } catch (e) {
            console.error(e);
            alert('Error changing username. Name might be taken or permission denied.');
        }
    };


    if (!isAuthenticated) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#111', color: 'white' }}>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 20, border: '1px solid #333', borderRadius: 8 }}>
                    <h2>Admin Login</h2>
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Password"
                        style={{ padding: 8, borderRadius: 4, border: '1px solid #444', background: '#222', color: 'white' }}
                    />
                    <button type="submit" style={{ padding: 8, background: 'blue', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Login</button>
                </form>
            </div>
        );
    }

    return (
        <div style={{ padding: 20, background: '#111', minHeight: '100vh', color: 'gray' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <h1 style={{ color: 'white' }}>Admin Dashboard</h1>
                <button onClick={() => window.location.href = '/'} style={{ padding: '8px 16px' }}>Back to App</button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <button onClick={() => setView('users')} style={{ padding: '8px 16px', background: view === 'users' ? '#333' : 'transparent', color: view === 'users' ? 'white' : 'gray', border: '1px solid #333' }}>Users</button>
                <button onClick={() => setView('chats')} style={{ padding: '8px 16px', background: view === 'chats' ? '#333' : 'transparent', color: view === 'chats' ? 'white' : 'gray', border: '1px solid #333' }}>Chats</button>
                <button onClick={fetchData} style={{ padding: '8px 16px', background: 'transparent', color: 'blue', border: '1px solid blue' }}>Refresh Data</button>
            </div>

            {loading && <div>Loading...</div>}

            {view === 'users' && (
                <table style={{ width: '100%', borderCollapse: 'collapse', color: '#ccc' }}>
                    <thead>
                        <tr style={{ textAlign: 'left' }}>
                            <th style={{ padding: 10, borderBottom: '1px solid #333' }}>UID</th>
                            <th style={{ padding: 10, borderBottom: '1px solid #333' }}>Username</th>
                            <th style={{ padding: 10, borderBottom: '1px solid #333' }}>Name</th>
                            <th style={{ padding: 10, borderBottom: '1px solid #333' }}>Status</th>
                            <th style={{ padding: 10, borderBottom: '1px solid #333' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid #222' }}>
                                <td style={{ padding: 10, fontSize: 12 }}>{u.id}</td>
                                <td style={{ padding: 10, color: 'white' }}>{u.username || '-'}</td>
                                <td style={{ padding: 10 }}>{u.name || 'Anonymous'}</td>
                                <td style={{ padding: 10, color: u.blocked ? 'red' : 'green' }}>{u.blocked ? 'BLOCKED' : 'Active'}</td>
                                <td style={{ padding: 10, display: 'flex', gap: 8 }}>
                                    <button onClick={() => toggleBlockUser(u.id, u.blocked)} style={{ padding: '4px 8px', background: u.blocked ? 'green' : 'red', color: 'white', border: 'none', borderRadius: 4 }}>
                                        {u.blocked ? 'Unblock' : 'Block'}
                                    </button>
                                    <button onClick={() => changeUserId(u.id, u.username)} style={{ padding: '4px 8px', background: '#333', color: 'white', border: 'none', borderRadius: 4 }}>
                                        Change ID
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {view === 'chats' && !selectedChat && (
                <table style={{ width: '100%', borderCollapse: 'collapse', color: '#ccc' }}>
                    <thead>
                        <tr style={{ textAlign: 'left' }}>
                            <th style={{ padding: 10, borderBottom: '1px solid #333' }}>Chat ID</th>
                            <th style={{ padding: 10, borderBottom: '1px solid #333' }}>Members</th>
                            <th style={{ padding: 10, borderBottom: '1px solid #333' }}>Last Message</th>
                            <th style={{ padding: 10, borderBottom: '1px solid #333' }}>Updated</th>
                            <th style={{ padding: 10, borderBottom: '1px solid #333' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {chats.map(c => (
                            <tr key={c.id} style={{ borderBottom: '1px solid #222' }}>
                                <td style={{ padding: 10, fontSize: 12 }}>{c.id}</td>
                                <td style={{ padding: 10 }}>{c.members?.join(', ') || '-'}</td>
                                <td style={{ padding: 10 }}>{(c as any).last || '-'}</td>
                                <td style={{ padding: 10 }}>{c.updatedAt?.seconds ? new Date(c.updatedAt.seconds * 1000).toLocaleString() : '-'}</td>
                                <td style={{ padding: 10 }}>
                                    <button onClick={() => setSelectedChat(c)} style={{ padding: '4px 8px', background: 'blue', color: 'white', borderRadius: 4, border: 'none' }}>View Chat</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {view === 'chats' && selectedChat && (
                <div>
                    <button onClick={() => setSelectedChat(null)} style={{ marginBottom: 10, padding: '4px 8px' }}>&larr; Back to list</button>
                    <div style={{ border: '1px solid #333', borderRadius: 8, padding: 20 }}>
                        <h3>Chat: {selectedChat.id}</h3>
                        <div style={{ maxHeight: 500, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {chatMessages.map(m => (
                                <div key={m.id} style={{ padding: 8, background: '#222', borderRadius: 4 }}>
                                    <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>{m.name || m.uid} • {m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000).toLocaleString() : ''}</div>
                                    <div style={{ color: 'white' }}>{m.text}</div>
                                </div>
                            ))}
                            {chatMessages.length === 0 && <div>No messages loaded</div>}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
