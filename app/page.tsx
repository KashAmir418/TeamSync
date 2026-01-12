"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    CheckSquare,
    Video,
    Users,
    Plus,
    Bell,
    Search,
    Calendar,
    Settings,
    MoreVertical,
    CheckCircle2,
    Clock,
    X,
    UserPlus,
    Mail,
    Send,
    Trash2,
    LogOut,
    Lightbulb,
    Bug,
    MessageSquare,
    Link as LinkIcon,
    ArrowUp,
    Folder,
    ExternalLink,
    Copy,
    MessageCircle,
    Menu,
    MessagesSquare,
    Zap,
    TrendingUp,
    Shield,
    Sparkles
} from "lucide-react";
import { TEAM_MEMBERS as INITIAL_MEMBERS, Task, Member, Meeting } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import Auth from "@/components/Auth";
import { Session } from '@supabase/supabase-js';

// --- Components ---

const Toast = ({ message, type = 'info', onClose }: { message: string, type?: 'info' | 'error' | 'success', onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.9 }}
            className={`toast-container ${type}`}
        >
            <div className="toast-content">
                <div className="toast-icon">
                    {type === 'error' ? <Bug size={18} /> : type === 'success' ? <CheckCircle2 size={18} /> : <Zap size={18} />}
                </div>
                <p>{message}</p>
            </div>
            <button onClick={onClose} className="toast-close"><X size={14} /></button>
        </motion.div>
    );
};

const Modal = ({ title, children, onClose }: { title: string, children: React.ReactNode, onClose: () => void }) => (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="modal-content glass-panel"
        >
            <div className="modal-header">
                <h3>{title}</h3>
                <button onClick={onClose} className="icon-btn-sm circle-btn"><X size={20} /></button>
            </div>
            <div className="modal-body">
                {children}
            </div>
        </motion.div>
    </div>
);

// --- Main Application ---

export default function Dashboard() {
    // State
    const [activeTab, setActiveTab] = useState("dashboard");
    const [members, setMembers] = useState<Member[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [currentUser, setCurrentUser] = useState<Member | null>(null);
    const [showModal, setShowModal] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState<Date | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [toast, setToast] = useState<{ msg: string, type: 'info' | 'error' | 'success' } | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [mindItems, setMindItems] = useState<any[]>([]);
    const [comments, setComments] = useState<any[]>([]);
    const [selectedChatTask, setSelectedChatTask] = useState<string | null>(null);
    const [dbStatus, setDbStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const chatEndRef = useRef<HTMLDivElement>(null);

    // Initial session check
    useEffect(() => {
        // 1. Initial Session Check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (!session) setIsInitialized(true);
        });

        // 2. Auth State Listener (Triggered on login/logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            if (event === 'SIGNED_OUT') {
                window.location.reload(); // Clear all state on logout
            } else if (event === 'SIGNED_IN') {
                // No reload needed, state will trigger fetchData
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Data Fetching and Real-time
    useEffect(() => {
        if (!session) return;

        const fetchData = async () => {
            try {
                setDbStatus('connecting');

                // Fetch User Profile
                const { data: profile, error: profErr } = await supabase.from('members').select('*').eq('id', session.user.id).single();
                if (profile) setCurrentUser(profile);
                if (profErr) console.warn("Profile not found, user might be new");

                // Fetch Core Data
                const [membersRes, tasksRes, meetingsRes, mindRes, commentsRes] = await Promise.all([
                    supabase.from('members').select('*'),
                    supabase.from('tasks').select('*').order('created_at', { ascending: false }),
                    supabase.from('meetings').select('*').order('start_time', { ascending: true }),
                    supabase.from('mindspace_items').select('*').order('created_at', { ascending: false }),
                    supabase.from('task_comments').select('*').order('created_at', { ascending: true })
                ]);

                if (membersRes.data) setMembers(membersRes.data);
                if (tasksRes.data) setTasks(tasksRes.data.map(t => ({ ...t, assigneeId: t.assignee_id })));
                if (meetingsRes.data) setMeetings(meetingsRes.data.map(m => ({ ...m, startTime: m.start_time, suggestedBy: m.suggested_by })));
                if (mindRes.data) setMindItems(mindRes.data);
                if (commentsRes.data) setComments(commentsRes.data);

                setDbStatus('online');
            } catch (err) {
                console.error("Fetch error:", err);
                setDbStatus('offline');
            } finally {
                setIsInitialized(true);
            }
        };

        fetchData();

        // Real-time Subscriptions with Duplicate Prevention
        const tasksChannel = supabase.channel('tasks-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload: any) => {
                if (payload.eventType === 'INSERT') {
                    setTasks(prev => prev.find(t => t.id === payload.new.id) ? prev : [{ ...payload.new, assigneeId: payload.new.assignee_id }, ...prev]);
                } else if (payload.eventType === 'UPDATE') {
                    setTasks(prev => prev.map(t => t.id === payload.new.id ? { ...payload.new, assigneeId: payload.new.assignee_id } : t));
                } else if (payload.eventType === 'DELETE') {
                    setTasks(prev => prev.filter(t => t.id !== payload.old.id));
                }
            }).subscribe();

        const commentsChannel = supabase.channel('comments-sync')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_comments' }, (payload: any) => {
                setComments(prev => prev.find(c => c.id === payload.new.id) ? prev : [...prev, payload.new]);
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'task_comments' }, (payload) => {
                setComments(prev => prev.filter(c => c.id !== payload.old.id));
            }).subscribe();

        const mindChannel = supabase.channel('mind-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'mindspace_items' }, (payload: any) => {
                if (payload.eventType === 'INSERT') {
                    setMindItems(prev => prev.find(i => i.id === payload.new.id) ? prev : [payload.new, ...prev]);
                } else if (payload.eventType === 'UPDATE') {
                    setMindItems(prev => prev.map(i => i.id === payload.new.id ? payload.new : i));
                } else if (payload.eventType === 'DELETE') {
                    setMindItems(prev => prev.filter(i => i.id !== payload.old.id));
                }
            }).subscribe();

        const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);

        return () => {
            clearInterval(clockInterval);
            supabase.removeChannel(tasksChannel);
            supabase.removeChannel(commentsChannel);
            supabase.removeChannel(mindChannel);
        };
    }, [session]);

    // Scroll to bottom of chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [comments, selectedChatTask]);

    // Helpers
    const showNotification = (msg: string, type: 'info' | 'error' | 'success' = 'info') => setToast({ msg, type });
    const getAssignee = (id: string) => members.find(m => m.id === id);
    const isAdmin = currentUser?.role?.toLowerCase().includes('admin');

    // Actions
    const handleLogout = async () => {
        await supabase.auth.signOut();
        setSession(null);
        window.location.reload();
    };

    const handleAddTask = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const taskData = {
            title: formData.get('title') as string,
            description: formData.get('description') as string,
            assignee_id: formData.get('assigneeId') as string,
            deadline: formData.get('deadline') as string,
            priority: formData.get('priority') as string,
            status: 'todo'
        };
        const { data, error } = await supabase.from('tasks').insert([taskData]).select().single();
        if (error) {
            showNotification(`Failed to create task: ${error.message}`, 'error');
        } else if (data) {
            setTasks(prev => [{ ...data, assigneeId: data.assignee_id }, ...prev]);
            showNotification("Goal locked in! Let's get to work.", 'success');
            setShowModal(null);
        }
    };

    const handleAddMindItem = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const item = {
            title: formData.get('title') as string,
            description: formData.get('description') as string,
            type: formData.get('type') as string,
            author_id: session?.user.id,
            upvotes: 0
        };
        const { data, error } = await supabase.from('mindspace_items').insert([item]).select().single();
        if (error) {
            showNotification(`Database Error: ${error.message}. Is the table 'mindspace_items' created?`, 'error');
        } else if (data) {
            setMindItems(prev => [data, ...prev]);
            showNotification("Your thought is now in the orbit!", 'success');
            setShowModal(null);
        }
    };

    const handleUpvote = async (id: string, current: number) => {
        setMindItems(prev => prev.map(i => i.id === id ? { ...i, upvotes: current + 1 } : i));
        const { error } = await supabase.from('mindspace_items').update({ upvotes: current + 1 }).eq('id', id);
        if (error) {
            showNotification("Upvote failed", "error");
            setMindItems(prev => prev.map(i => i.id === id ? { ...i, upvotes: current } : i)); // Rollback
        }
    };

    const handleAddComment = async (e: React.FormEvent<HTMLFormElement>, taskId: string) => {
        e.preventDefault();
        const input = e.currentTarget.querySelector('input') as HTMLInputElement;
        const content = input.value.trim();
        if (!content || !taskId) return;

        input.value = '';
        const { data, error } = await supabase.from('task_comments').insert([{
            task_id: taskId,
            author_id: session?.user.id,
            content: content
        }]).select().single();

        if (error) showNotification(`failed to send: ${error.message}`, 'error');
        else if (data) setComments(prev => [...prev, data]);
    };

    const handleDeleteComment = async (id: string) => {
        setComments(prev => prev.filter(c => c.id !== id));
        const { error } = await supabase.from('task_comments').delete().eq('id', id);
        if (error) showNotification("Delete failed", "error");
    };

    const handleDeleteMindItem = async (id: string) => {
        setMindItems(prev => prev.filter(i => i.id !== id));
        const { error } = await supabase.from('mindspace_items').delete().eq('id', id);
        if (error) showNotification("Delete failed", "error");
        else showNotification("Thought cleared from orbit", "success");
    };

    const handleConvertToTask = async (item: any) => {
        const taskData = {
            title: item.title,
            description: item.description,
            assignee_id: session?.user.id,
            priority: 'medium',
            status: 'todo'
        };

        const { data: newTask, error: taskErr } = await supabase.from('tasks').insert([taskData]).select().single();
        if (taskErr) {
            showNotification(`Failed to convert: ${taskErr.message}`, 'error');
            return;
        }

        if (newTask) {
            setTasks(prev => [{ ...newTask, assigneeId: newTask.assignee_id }, ...prev]);
            setMindItems(prev => prev.filter(i => i.id !== item.id));
        }

        const { error: delErr } = await supabase.from('mindspace_items').delete().eq('id', item.id);

        if (delErr) {
            showNotification("Task created, but failed to remove from Mindspace", "info");
        } else {
            showNotification("Idea graduated to Task!", "success");
            setActiveTab('tasks');
        }
    };

    const handleDeleteTask = async (id: string) => {
        setTasks(prev => prev.filter(t => t.id !== id));
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) showNotification("Delete failed", "error");
        else showNotification("Task removed", "success");
    };

    const toggleTaskStatus = async (id: string) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        const nextStatus = task.status === 'todo' ? 'in-progress' : task.status === 'in-progress' ? 'completed' : 'todo';

        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: nextStatus } : t));

        const { error } = await supabase.from('tasks').update({ status: nextStatus }).eq('id', id);
        if (error) {
            showNotification("Update failed", "error");
            setTasks(prev => prev.map(t => t.id === id ? { ...t, status: task.status } : t)); // Rollback
        }
    };

    // --- Render Functions ---

    const renderTasks = () => (
        <div className="tasks-view fade-in full-height-view">
            <header className="view-header">
                <div>
                    <h1>Workspace Tasks</h1>
                    <p className="subtitle">Organize, track, and crush your goals.</p>
                </div>
                <button className="primary-btn glow-btn" onClick={() => setShowModal('task')}>
                    <Plus size={18} /> New Task
                </button>
            </header>

            <div className="tasks-board">
                {['todo', 'in-progress', 'completed'].map(status => (
                    <div key={status} className="board-column">
                        <div className={`column-header ${status}`}>
                            <div className="dot" />
                            <h3>{status.replace('-', ' ').toUpperCase()}</h3>
                            <span className="count">{tasks.filter(t => t.status === status).length}</span>
                        </div>
                        <div className="column-cards">
                            {tasks.filter(t => t.status === status).map(t => (
                                <motion.div layout key={t.id} className="task-item-card glass-panel">
                                    <div className="card-top">
                                        <span className={`priority-tag ${t.priority}`}>{t.priority}</span>
                                        <div className="card-actions">
                                            <button onClick={() => toggleTaskStatus(t.id)} className="card-action-btn" title="Update status">
                                                {t.status === 'completed' ? <CheckCircle2 size={16} className="text-success" /> : <Clock size={16} />}
                                            </button>
                                            <button onClick={() => handleDeleteTask(t.id)} className="card-action-btn delete" title="Delete task">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <h4>{t.title}</h4>
                                    <p>{t.description}</p>
                                    <div className="card-bottom">
                                        <div className="card-assignee">
                                            <div className="avatar-small">{getAssignee(t.assigneeId)?.name[0] || 'U'}</div>
                                            <span>{getAssignee(t.assigneeId)?.name || 'Guest'}</span>
                                        </div>
                                        <button className="discuss-trigger" onClick={() => { setSelectedChatTask(t.id); setActiveTab('chat'); }}>
                                            <MessagesSquare size={14} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderMembers = () => (
        <div className="members-view fade-in">
            <header className="view-header">
                <div>
                    <h1>Team Directory</h1>
                    <p className="subtitle">The brilliant minds behind TeamSync</p>
                </div>
                {isAdmin && <button className="primary-btn" onClick={() => showNotification("Admin: Add member feature coming soon")}>
                    <UserPlus size={18} /> Invite Member
                </button>}
            </header>

            <div className="members-directory-grid">
                {members.map(m => (
                    <motion.div whileHover={{ y: -5 }} key={m.id} className="member-status-card glass-panel">
                        <div className="member-cover" />
                        <div className="member-card-content">
                            <div className="member-avatar-large">{m.name[0]}</div>
                            <h3>{m.name}</h3>
                            <span className="member-role">{m.role}</span>
                            <div className="member-quick-stats">
                                <div className="q-stat">
                                    <label>Tasks</label>
                                    <span>{tasks.filter(t => t.assigneeId === m.id).length}</span>
                                </div>
                                <div className="q-stat">
                                    <label>Impact</label>
                                    <span>{mindItems.filter(i => i.author_id === m.id).length}</span>
                                </div>
                            </div>
                            <div className="member-actions">
                                <button className="secondary-btn-sm" onClick={() => showNotification(`Messaging ${m.name}...`)}>
                                    <Mail size={14} /> Message
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );

    const renderDashboard = () => (
        <div className="dashboard-content fade-in">
            <header className="view-header">
                <div>
                    <h1>Sync Hub</h1>
                    <p className="subtitle">{currentTime?.toLocaleTimeString()} • {currentTime?.toLocaleDateString()}</p>
                </div>
                <div className={`status-pill ${dbStatus}`}>
                    <div className="dot" />
                    <span>{dbStatus === 'online' ? 'Live Connection' : dbStatus === 'connecting' ? 'Connecting...' : 'Offline'}</span>
                </div>
            </header>

            <div className="stats-grid">
                <motion.div whileHover={{ scale: 1.02 }} className="stat-card glass-panel orange" onClick={() => setActiveTab('tasks')}>
                    <div className="stat-icon"><CheckSquare /></div>
                    <div className="stat-info">
                        <h3>{tasks.filter(t => t.status !== 'completed').length}</h3>
                        <p>Pending Tasks</p>
                    </div>
                    <div className="stat-trend"><TrendingUp size={14} /> +2 this week</div>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} className="stat-card glass-panel purple" onClick={() => setActiveTab('chat')}>
                    <div className="stat-icon"><MessageSquare /></div>
                    <div className="stat-info">
                        <h3>{new Set(comments.map(c => c.task_id)).size}</h3>
                        <p>Active Threads</p>
                    </div>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} className="stat-card glass-panel green" onClick={() => setActiveTab('mindspace')}>
                    <div className="stat-icon"><Lightbulb /></div>
                    <div className="stat-info">
                        <h3>{mindItems.length}</h3>
                        <p>Shared Ideas</p>
                    </div>
                </motion.div>
            </div>

            <div className="dashboard-grid">
                <section className="dashboard-section glass-panel">
                    <div className="section-head">
                        <h2>Priority Tasks</h2>
                        <button className="text-btn" onClick={() => setActiveTab('tasks')}>View All</button>
                    </div>
                    <div className="task-list-mini">
                        {tasks.filter(t => t.status !== 'completed').slice(0, 5).map(t => (
                            <div key={t.id} className="mini-task-item">
                                <div className={`priority-dot ${t.priority}`} />
                                <span className="title">{t.title}</span>
                                <button className="icon-btn-sm circle" onClick={() => { setSelectedChatTask(t.id); setActiveTab('chat'); }} title="Discuss">
                                    <MessageCircle size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="dashboard-section glass-panel">
                    <div className="section-head">
                        <h2>Team Presence</h2>
                    </div>
                    <div className="members-mini-grid">
                        {members.map(m => (
                            <div key={m.id} className="member-mini-card">
                                <div className="avatar-small">{m.name[0]}</div>
                                <div className="name-box">
                                    <span className="name">{m.name}</span>
                                    <span className="role">{m.role}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );

    const renderTeamTalk = () => (
        <div className="chat-view fade-in full-height-view">
            <header className="view-header">
                <h1>Team Talk</h1>
            </header>

            <div className="chat-interface glass-panel">
                <div className="chat-sidebar">
                    <div className="sidebar-search">
                        <Search size={16} />
                        <input placeholder="Search threads..." />
                    </div>
                    <div className="threads-list">
                        {tasks.map(t => (
                            <div
                                key={t.id}
                                className={`thread-card ${selectedChatTask === t.id ? 'active' : ''}`}
                                onClick={() => setSelectedChatTask(t.id)}
                            >
                                <div className="thread-info">
                                    <h4>{t.title}</h4>
                                    <p>{comments.filter(c => c.task_id === t.id).length} messages</p>
                                </div>
                                {comments.filter(c => c.task_id === t.id).length > 0 && <div className="unread-dot" />}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="chat-main">
                    {selectedChatTask ? (
                        <>
                            <div className="chat-header">
                                <button className="icon-btn-sm mobile-only back-btn" onClick={() => setSelectedChatTask(null)}>
                                    <X size={20} />
                                </button>
                                <div className="header-info">
                                    <h3>{tasks.find(t => t.id === selectedChatTask)?.title}</h3>
                                    <div className="header-meta">
                                        <Shield size={12} /> {tasks.find(t => t.id === selectedChatTask)?.priority} priority
                                    </div>
                                </div>
                            </div>

                            <div className="messages-area">
                                {comments.filter(c => c.task_id === selectedChatTask).map((c, i) => {
                                    const isMine = c.author_id === session?.user.id;
                                    const author = getAssignee(c.author_id);
                                    return (
                                        <div key={c.id} className={`message-row ${isMine ? 'mine' : ''}`}>
                                            {!isMine && <div className="msg-avatar">{author?.name[0]}</div>}
                                            <div className="msg-bubble-container">
                                                {!isMine && <span className="msg-author">{author?.name}</span>}
                                                <div className="msg-bubble">
                                                    <p>{c.content}</p>
                                                    <div className="msg-footer">
                                                        <span className="msg-time">{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        {isMine && <button onClick={() => handleDeleteComment(c.id)} className="msg-delete"><Trash2 size={10} /></button>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={chatEndRef} />
                            </div>

                            <form className="msg-input-bar" onSubmit={(e) => handleAddComment(e, selectedChatTask)}>
                                <div className="input-wrapper">
                                    <input placeholder="Type your message here..." required />
                                    <button type="submit" className="send-btn"><Send size={18} /></button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div className="chat-placeholder">
                            <div className="placeholder-icon"><MessagesSquare size={64} /></div>
                            <h2>Select a task to start talking</h2>
                            <p>Collaborate in real-time on specific goals.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderMindspace = () => (
        <div className="mind-view fade-in">
            <header className="view-header">
                <div>
                    <h1>Mindspace</h1>
                    <p className="subtitle">Think tank for the whole team</p>
                </div>
                <button className="primary-btn glow-btn" onClick={() => setShowModal('mind')}>
                    <Plus size={18} /> New Thought
                </button>
            </header>

            <div className="mind-grid">
                {mindItems.map(item => (
                    <motion.div
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={item.id}
                        className={`mind-card glass-panel ${item.type}`}
                    >
                        <div className="mind-meta">
                            <span className={`mind-type-pill ${item.type}`}>{item.type.toUpperCase()}</span>
                            <div className="card-actions">
                                <button onClick={() => handleConvertToTask(item)} className="card-action-btn" title="Convert to Task">
                                    <ExternalLink size={14} />
                                </button>
                                <button onClick={() => handleDeleteMindItem(item.id)} className="card-action-btn delete" title="Delete Idea">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                        <div className="mind-actions">
                            <button className="upvote-btn" onClick={() => handleUpvote(item.id, item.upvotes)}>
                                <ArrowUp size={16} /> {item.upvotes}
                            </button>
                            <div className="author-tag">
                                <span>by {getAssignee(item.author_id)?.name || 'Member'}</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );

    // --- Main Render ---

    if (!isInitialized) return (
        <div className="loading-screen">
            <div className="loader-box">
                <div className="loader-orbit" />
                <div className="loader-text">TeamSync</div>
            </div>
        </div>
    );

    if (!session) return <Auth onAuthSuccess={() => window.location.reload()} />;

    return (
        <div className={`app-shell ${mobileMenuOpen ? 'menu-open' : ''}`}>
            {/* Mobile Top Bar */}
            <div className="mobile-header mobile-only">
                <div className="brand" style={{ margin: 0 }}>
                    <div className="brand-icon"><Sparkles size={16} /></div>
                    <span style={{ fontSize: '16px' }}>TeamSync</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="menu-toggle refresh-btn" onClick={() => window.location.reload()} title="Refresh">
                        <Zap size={20} />
                    </button>
                    <button className="menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
                    </button>
                </div>
            </div>

            <aside className={`main-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
                <div className="brand desktop-only">
                    <div className="brand-icon"><Sparkles size={20} /></div>
                    <span>TeamSync</span>
                </div>

                <nav className="side-nav">
                    <ul>
                        <li className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}>
                            <LayoutDashboard size={20} /> <span>Dashboard</span>
                        </li>
                        <li className={activeTab === 'tasks' ? 'active' : ''} onClick={() => { setActiveTab('tasks'); setMobileMenuOpen(false); }}>
                            <CheckSquare size={20} /> <span>Tasks</span>
                        </li>
                        <li className={activeTab === 'members' ? 'active' : ''} onClick={() => { setActiveTab('members'); setMobileMenuOpen(false); }}>
                            <Users size={20} /> <span>Team</span>
                        </li>
                        <li className={activeTab === 'chat' ? 'active' : ''} onClick={() => { setActiveTab('chat'); setMobileMenuOpen(false); }}>
                            <MessagesSquare size={20} /> <span>Team Talk</span>
                        </li>
                        <li className={activeTab === 'mindspace' ? 'active' : ''} onClick={() => { setActiveTab('mindspace'); setMobileMenuOpen(false); }}>
                            <Lightbulb size={20} /> <span>Mindspace</span>
                        </li>
                    </ul>
                </nav>

                <div className="sidebar-footer">
                    <div className="user-pill glass-panel">
                        <div className="user-avatar">{currentUser?.name[0] || 'U'}</div>
                        <div className="user-info">
                            <span className="user-name">{currentUser?.name || 'User'}</span>
                            <span className="user-role">{currentUser?.role || 'Member'}</span>
                        </div>
                        <button onClick={handleLogout} className="logout-btn"><LogOut size={16} /></button>
                    </div>
                </div>
            </aside>

            <main className="main-content-area">
                <AnimatePresence mode="wait">
                    {activeTab === 'dashboard' && <motion.div key="dash" exit={{ opacity: 0, x: -10 }} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>{renderDashboard()}</motion.div>}
                    {activeTab === 'tasks' && <motion.div key="tasks" exit={{ opacity: 0, x: -10 }} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>{renderTasks()}</motion.div>}
                    {activeTab === 'members' && <motion.div key="members" exit={{ opacity: 0, x: -10 }} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>{renderMembers()}</motion.div>}
                    {activeTab === 'chat' && <motion.div key="chat" exit={{ opacity: 0, x: -10 }} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>{renderTeamTalk()}</motion.div>}
                    {activeTab === 'mindspace' && <motion.div key="mind" exit={{ opacity: 0, x: -10 }} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>{renderMindspace()}</motion.div>}
                </AnimatePresence>
            </main>

            <AnimatePresence>
                {showModal === 'mind' && (
                    <Modal title="Share an Idea" onClose={() => setShowModal(null)}>
                        <form onSubmit={handleAddMindItem} className="form-stack">
                            <div className="input-group">
                                <label>Title</label>
                                <input name="title" placeholder="What's on your mind?" required />
                            </div>
                            <div className="input-group">
                                <label>Description</label>
                                <textarea name="description" placeholder="Dive into details..." rows={4} required />
                            </div>
                            <div className="input-group">
                                <label>Category</label>
                                <select name="type">
                                    <option value="idea">Bright Idea</option>
                                    <option value="issue">Critical Issue</option>
                                </select>
                            </div>
                            <button type="submit" className="primary-btn full-width">Launch Thought</button>
                        </form>
                    </Modal>
                )}
                {showModal === 'task' && (
                    <Modal title="Create New Goal" onClose={() => setShowModal(null)}>
                        <form onSubmit={handleAddTask} className="form-stack">
                            <div className="input-group">
                                <label>Title</label>
                                <input name="title" placeholder="What needs to be done?" required />
                            </div>
                            <div className="input-group">
                                <label>Description</label>
                                <textarea name="description" placeholder="Add more context..." rows={3} />
                            </div>
                            <div className="input-row">
                                <div className="input-group flex-1">
                                    <label>Assign To</label>
                                    <select name="assigneeId">
                                        {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </div>
                                <div className="input-group flex-1">
                                    <label>Priority</label>
                                    <select name="priority">
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Deadline</label>
                                <input type="date" name="deadline" />
                            </div>
                            <button type="submit" className="primary-btn full-width">Lock Goal</button>
                        </form>
                    </Modal>
                )}
            </AnimatePresence>

            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

            <style jsx global>{`
                :root {
                    --primary: #6366f1;
                    --primary-hover: #4f46e5;
                    --primary-glow: rgba(99, 102, 241, 0.4);
                    --accent: #8b5cf6;
                    --bg-dark: #0f172a;
                    --bg-darker: #020617;
                    --surface: rgba(30, 41, 59, 0.7);
                    --border: rgba(255, 255, 255, 0.08);
                    --text-main: #f8fafc;
                    --text-muted: #94a3b8;
                    --success: #10b981;
                    --error: #ef4444;
                    --warning: #f59e0b;
                    --glass: rgba(255, 255, 255, 0.03);
                    --glass-heavy: rgba(15, 23, 42, 0.8);
                }

                * { box-sizing: border-box; }

                body {
                    background: radial-gradient(circle at top right, #1e1b4b, #020617);
                    color: var(--text-main);
                    font-family: 'Outfit', 'Inter', sans-serif;
                    margin: 0;
                    overflow: hidden;
                }

                .app-shell { display: flex; height: 100vh; overflow: hidden; }

                /* Sidebar Aesthetics */
                .main-sidebar {
                    width: 280px;
                    background: var(--glass-heavy);
                    border-right: 1px solid var(--border);
                    display: flex;
                    flex-direction: column;
                    padding: 32px 20px;
                    backdrop-filter: blur(20px);
                }

                .brand {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 22px;
                    font-weight: 800;
                    margin-bottom: 48px;
                    background: linear-gradient(to right, #fff, var(--primary));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .brand-icon {
                    width: 40px;
                    height: 40px;
                    background: var(--primary);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    -webkit-text-fill-color: white;
                    box-shadow: 0 0 20px var(--primary-glow);
                }

                .side-nav ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
                .side-nav li {
                    padding: 14px 16px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    color: var(--text-muted);
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .side-nav li:hover { background: var(--glass); color: white; transform: translateX(4px); }
                .side-nav li.active { background: var(--primary); color: white; box-shadow: 0 8px 16px -4px var(--primary-glow); }

                .sidebar-footer { margin-top: auto; }
                .user-pill {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    border-radius: 16px;
                    background: rgba(0,0,0,0.2);
                }
                .user-avatar {
                    width: 40px; height: 40px; background: var(--accent);
                    border-radius: 12px; display: flex; align-items: center; justify-content: center;
                    font-weight: 700;
                }
                .user-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
                .user-name { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .user-role { font-size: 11px; color: var(--text-muted); }
                .logout-btn { background: none; border: none; color: var(--error); cursor: pointer; opacity: 0.6; padding: 4px; }
                .logout-btn:hover { opacity: 1; }

                /* Main Content Area */
                .main-content-area {
                    flex: 1;
                    padding: 32px 48px;
                    overflow-y: auto;
                    height: 100vh;
                }

                .view-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 40px;
                }
                .view-header h1 { font-size: 32px; font-weight: 800; margin: 0; }
                .subtitle { color: var(--text-muted); margin-top: 4px; }

                .status-pill {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: var(--glass);
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-size: 12px;
                    border: 1px solid var(--border);
                }
                .status-pill .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--success); }
                .status-pill.offline .dot { background: var(--error); }
                .status-pill.connecting .dot { background: var(--warning); animation: pulse 1s infinite; }

                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }

                /* Glass Panels */
                .glass-panel {
                    background: var(--surface);
                    backdrop-filter: blur(16px);
                    border: 1px solid var(--border);
                    border-radius: 24px;
                    padding: 24px;
                }

                .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 32px; }
                .stat-card { position: relative; overflow: hidden; display: flex; align-items: center; gap: 20px; cursor: pointer; transition: transform 0.2s; }
                .stat-icon {
                    width: 56px; height: 56px; border-radius: 18px;
                    display: flex; align-items: center; justify-content: center;
                    background: rgba(255,255,255,0.05);
                }
                .orange .stat-icon { color: #fb923c; }
                .purple .stat-icon { color: #a78bfa; }
                .green .stat-icon { color: #4ade80; }
                .stat-info h3 { font-size: 28px; margin: 0; font-weight: 800; }
                .stat-info p { margin: 0; font-size: 14px; color: var(--text-muted); }
                .stat-trend { position: absolute; top: 12px; right: 16px; font-size: 10px; color: var(--success); background: rgba(16, 185, 129, 0.1); padding: 4px 8px; border-radius: 10px; }

                .dashboard-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }
                .section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
                .section-head h2 { font-size: 20px; margin: 0; }

                /* Task Mini List */
                .task-list-mini { display: flex; flex-direction: column; gap: 12px; }
                .mini-task-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 14px 18px;
                    background: rgba(255,255,255,0.03);
                    border-radius: 16px;
                    transition: background 0.2s;
                }
                .mini-task-item:hover { background: rgba(255,255,255,0.06); }
                .priority-dot { width: 8px; height: 8px; border-radius: 50%; }
                .priority-dot.high { background: var(--error); box-shadow: 0 0 10px var(--error); }
                .priority-dot.medium { background: var(--warning); }
                .priority-dot.low { background: var(--success); }
                .mini-task-item .title { flex: 1; font-weight: 500; }

                /* TeamTalk Layout */
                .chat-interface {
                    display: flex;
                    height: calc(100vh - 160px);
                    padding: 0;
                    overflow: hidden;
                }
                .chat-sidebar {
                    width: 320px;
                    border-right: 1px solid var(--border);
                    display: flex;
                    flex-direction: column;
                }
                .sidebar-search {
                    padding: 20px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    border-bottom: 1px solid var(--border);
                }
                .sidebar-search input { background: none; border: none; color: white; outline: none; font-size: 14px; width: 100%; }
                .threads-list { flex: 1; overflow-y: auto; }
                .thread-card {
                    padding: 18px 24px;
                    cursor: pointer;
                    transition: all 0.2s;
                    border-bottom: 1px solid rgba(255,255,255,0.02);
                    display: flex; justify-content: space-between; align-items: center;
                }
                .thread-card:hover { background: rgba(255,255,255,0.03); }
                .thread-card.active { background: rgba(99, 102, 241, 0.1); border-left: 4px solid var(--primary); }
                .thread-card h4 { margin: 0; font-size: 15px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .thread-card p { margin: 0; font-size: 12px; color: var(--text-muted); }
                .unread-dot { width: 8px; height: 8px; background: var(--primary); border-radius: 50%; box-shadow: 0 0 10px var(--primary); }

                .chat-main { flex: 1; display: flex; flex-direction: column; background: rgba(0,0,0,0.1); }
                .chat-header { padding: 18px 32px; border-bottom: 1px solid var(--border); background: var(--glass); }
                .header-info h3 { margin: 0; font-size: 18px; }
                .header-meta { font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }

                .messages-area {
                    flex: 1;
                    padding: 32px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                .message-row { display: flex; gap: 12px; max-width: 80%; }
                .message-row.mine { align-self: flex-end; flex-direction: row-reverse; }
                .msg-avatar { width: 36px; height: 36px; background: var(--primary); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; flex-shrink: 0; }
                .msg-bubble-container { display: flex; flex-direction: column; gap: 4px; }
                .message-row.mine .msg-bubble-container { align-items: flex-end; }
                .msg-author { font-size: 11px; color: var(--text-muted); margin-left: 4px; }
                .msg-bubble {
                    background: var(--glass);
                    padding: 12px 18px;
                    border-radius: 18px;
                    border: 1px solid var(--border);
                    position: relative;
                }
                .message-row.mine .msg-bubble {
                    background: var(--primary);
                    border: none;
                    color: white;
                }
                .msg-bubble p { margin: 0; line-height: 1.5; font-size: 14px; }
                .msg-footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 4px; opacity: 0.6; }
                .msg-time { font-size: 9px; }
                .msg-delete { background: none; border: none; color: white; cursor: pointer; padding: 2px; }

                .msg-input-bar { padding: 32px; border-top: 1px solid var(--border); }
                .input-wrapper {
                    background: var(--glass-heavy);
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    padding: 8px 12px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .input-wrapper input {
                    flex: 1;
                    background: none;
                    border: none;
                    color: white;
                    outline: none;
                    padding: 8px;
                    font-size: 14px;
                }
                .send-btn {
                    width: 40px; height: 40px; border-radius: 12px;
                    background: var(--primary); border: none; color: white;
                    cursor: pointer; display: flex; align-items: center; justify-content: center;
                    transition: transform 0.2s;
                }
                .send-btn:hover { transform: scale(1.05); }

                .chat-placeholder { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-muted); text-align: center; }
                .placeholder-icon { margin-bottom: 24px; opacity: 0.2; }

                /* Mindspace Grid */
                .mind-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
                .mind-card { display: flex; flex-direction: column; height: 260px; transition: transform 0.2s; }
                .mind-card:hover { transform: translateY(-4px); }
                .mind-card h3 { margin: 16px 0 12px; font-size: 18px; }
                .mind-card p { color: var(--text-muted); font-size: 14px; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.6; }
                
                .mind-meta { display: flex; justify-content: space-between; align-items: center; }
                .mind-type-pill { font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 6px; }
                .mind-type-pill.idea { background: rgba(16, 185, 129, 0.1); color: #10b981; }
                .mind-type-pill.issue { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
                .mind-date { font-size: 11px; color: var(--text-muted); }

                .mind-actions { margin-top: auto; display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid var(--border); }
                .upvote-btn { background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: white; border-radius: 10px; padding: 6px 12px; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s; }
                .upvote-btn:hover { background: var(--primary); border-color: var(--primary); }
                .author-tag { font-size: 12px; color: var(--text-muted); }

                /* Common UI Components */
                .primary-btn {
                    background: var(--primary);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 14px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    transition: all 0.2s;
                }
                .primary-btn:hover { background: var(--primary-hover); box-shadow: 0 4px 12px var(--primary-glow); }
                .glow-btn { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3); }
                .full-width { width: 100%; justify-content: center; }

                .icon-btn-sm { background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; }
                .icon-btn-sm.circle { width: 28px; height: 28px; border-radius: 50%; background: rgba(255,255,255,0.05); }
                .icon-btn-sm.circle:hover { background: var(--primary); color: white; }

                .text-btn { background: none; border: none; color: var(--primary); font-weight: 600; cursor: pointer; }

                /* Modals & Forms */
                .modal-overlay { position: fixed; inset: 0; background: rgba(2, 6, 23, 0.85); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
                .modal-content { width: 100%; max-width: 480px; padding: 32px; }
                .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
                .modal-header h3 { margin: 0; font-size: 24px; font-weight: 800; }

                .form-stack { display: flex; flex-direction: column; gap: 20px; }
                .input-group { display: flex; flex-direction: column; gap: 8px; }
                .input-group label { font-size: 13px; font-weight: 600; color: var(--text-muted); }
                .input-group input, .input-group textarea, .input-group select {
                    background: rgba(0,0,0,0.2);
                    border: 1px solid var(--border);
                    padding: 14px;
                    border-radius: 12px;
                    color: white;
                    outline: none;
                }
                .input-group input:focus, .input-group textarea:focus { border-color: var(--primary); }

                /* Loading Screen */
                .loading-screen { height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg-darker); }
                .loader-box { text-align: center; }
                .loader-orbit {
                    width: 60px; height: 60px; border: 4px solid var(--glass); border-top-color: var(--primary);
                    border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;
                }
                .loader-text { font-size: 24px; font-weight: 800; letter-spacing: 2px; background: linear-gradient(to right, #fff, var(--primary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                @keyframes spin { to { transform: rotate(360deg); } }

                /* Toasts */
                .toast-container {
                    position: fixed; bottom: 32px; right: 32px;
                    padding: 16px 20px; z-index: 5000;
                    display: flex; align-items: center; gap: 16px;
                    background: var(--glass-heavy);
                    backdrop-filter: blur(20px);
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
                    min-width: 300px;
                }
                .toast-icon { padding: 8px; border-radius: 10px; background: var(--primary); color: white; }
                .toast-container.error .toast-icon { background: var(--error); }
                .toast-container.success .toast-icon { background: var(--success); }
                .toast-content { flex: 1; }
                .toast-content p { margin: 0; font-size: 14px; font-weight: 600; }
                .toast-close { background: none; border: none; color: var(--text-muted); cursor: pointer; }

                .fade-in { animation: fadeIn 0.4s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

                /* New Tasks Board Styles */
                .tasks-board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; min-height: 600px; }
                .board-column { display: flex; flex-direction: column; gap: 20px; }
                .column-header { display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 12px; }
                .column-header h3 { font-size: 13px; font-weight: 800; margin: 0; color: var(--text-muted); letter-spacing: 1px; }
                .column-header .dot { width: 6px; height: 6px; border-radius: 50%; background: #94a3b8; }
                .column-header.todo .dot { background: var(--primary); }
                .column-header.in-progress .dot { background: var(--warning); }
                .column-header.completed .dot { background: var(--success); }
                .column-header .count { margin-left: auto; font-size: 11px; background: rgba(0,0,0,0.2); padding: 2px 8px; border-radius: 20px; }

                .column-cards { display: flex; flex-direction: column; gap: 16px; }
                .task-item-card { padding: 20px; display: flex; flex-direction: column; gap: 12px; position: relative; }
                .card-top { display: flex; justify-content: space-between; align-items: flex-start; }
                .priority-tag { font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 4px 8px; border-radius: 6px; background: rgba(255,255,255,0.05); }
                .priority-tag.high { color: var(--error); background: rgba(239, 68, 68, 0.1); }
                .card-actions { display: flex; gap: 8px; }
                .card-action-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 4px; border-radius: 6px; }
                .card-action-btn:hover { background: rgba(255,255,255,0.1); color: white; }
                .card-action-btn.delete:hover { color: var(--error); }
                .task-item-card h4 { margin: 0; font-size: 16px; font-weight: 700; }
                .task-item-card p { margin: 0; font-size: 13px; color: var(--text-muted); line-height: 1.5; }
                .card-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--border); }
                .card-assignee { display: flex; align-items: center; gap: 8px; font-size: 12px; }
                .discuss-trigger { background: var(--glass); border: 1px solid var(--border); color: var(--primary); width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
                .discuss-trigger:hover { background: var(--primary); color: white; }

                /* New Members Directory Styles */
                .members-directory-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 32px; }
                .member-status-card { overflow: hidden; position: relative; padding: 0 !important; }
                .member-cover { height: 80px; background: linear-gradient(to right, var(--primary), var(--accent)); opacity: 0.2; }
                .member-card-content { padding: 24px; text-align: center; margin-top: -50px; }
                .member-avatar-large { width: 80px; height: 80px; border-radius: 20px; background: var(--bg-darker); border: 4px solid var(--surface); margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 800; color: var(--primary); box-shadow: 0 10px 20px rgba(0,0,0,0.3); }
                .member-status-card h3 { margin: 0 0 4px; font-size: 18px; }
                .member-role { font-size: 12px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
                .member-quick-stats { display: flex; justify-content: center; gap: 32px; margin: 24px 0; padding: 16px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
                .q-stat { display: flex; flex-direction: column; }
                .q-stat label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; }
                .q-stat span { font-size: 18px; font-weight: 700; }
                .secondary-btn-sm { background: var(--glass); border: 1px solid var(--border); color: white; padding: 8px 16px; border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; margin: 0 auto; transition: all 0.2s; }
                .secondary-btn-sm:hover { background: rgba(255,255,255,0.1); }

                .input-row { display: flex; gap: 16px; }
                .flex-1 { flex: 1; }
                .text-success { color: var(--success) !important; }

                /* Scrollbar */
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

                /* Mobile Optimizations */
                .mobile-only { display: none; }
                
                @media (max-width: 1024px) {
                    .main-sidebar { width: 240px; }
                    .main-content-area { padding: 24px; }
                    .tasks-board { gap: 16px; }
                }

                @media (max-width: 768px) {
                    .desktop-only { display: none; }
                    .mobile-only { display: flex; }

                    .app-shell { flex-direction: column; height: 100vh; overflow: hidden; }
                    
                    .main-sidebar {
                        position: fixed;
                        top: 0;
                        left: -100%;
                        width: 85%;
                        max-width: 320px;
                        height: 100%;
                        z-index: 2000;
                        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                        background: var(--bg-darker);
                        box-shadow: 20px 0 50px rgba(0,0,0,0.5);
                    }
                    .main-sidebar.open { left: 0; }
                    
                    .mobile-header {
                        height: auto;
                        min-height: 64px;
                        background: #020617; /* Solid dark background */
                        border-bottom: 1px solid var(--border);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: env(safe-area-inset-top) 20px 10px;
                        z-index: 1001;
                        position: relative;
                        flex-shrink: 0;
                    }
                    .mobile-header .brand { margin: 0; font-size: 16px; }
                    .mobile-header .brand-icon { width: 32px; height: 32px; }
                    .menu-toggle { 
                        background: rgba(255,255,255,0.05); 
                        border: 1px solid var(--border); 
                        color: white; 
                        cursor: pointer; 
                        padding: 8px; 
                        border-radius: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .refresh-btn { color: var(--warning); border-color: rgba(245, 158, 11, 0.2); }

                    .main-content-area { 
                        padding: 24px 20px; 
                        flex: 1;
                        height: auto;
                        overflow-y: auto;
                        -webkit-overflow-scrolling: touch;
                    }
                    
                    .view-header { flex-direction: column; gap: 12px; align-items: stretch; margin-bottom: 24px; }
                    .view-header h1 { font-size: 28px; }

                    .stats-grid { grid-template-columns: 1fr; gap: 16px; }
                    .dashboard-grid { grid-template-columns: 1fr; }
                    
                    .tasks-board { grid-template-columns: 1fr; height: auto; display: flex; flex-direction: column; gap: 24px; padding-bottom: 40px; }
                    .board-column { min-height: auto; }

                    .chat-interface { height: calc(100vh - 160px); }
                    .chat-sidebar { 
                        width: 100%; 
                        display: ${selectedChatTask ? 'none' : 'flex'}; 
                    }
                    .chat-main { 
                        display: ${selectedChatTask ? 'flex' : 'none'};
                        width: 100%;
                    }
                    .chat-header { display: flex; align-items: center; gap: 16px; padding: 16px; }
                    .back-btn { padding: 8px; margin-right: -8px; }

                    .members-directory-grid { grid-template-columns: 1fr; gap: 20px; }
                    .mind-grid { grid-template-columns: 1fr; }
                    
                    .modal-content { max-width: 95%; padding: 24px; margin: 20px; }
                }

                @media (max-width: 480px) {
                    .main-content-area { padding: 20px 16px; }
                    .stat-card { padding: 20px; gap: 16px; }
                    .stat-info h3 { font-size: 24px; }
                    .message-row { max-width: 95%; }
                    .msg-input-bar { padding: 12px; }
                }
            `}</style>
        </div>
    );
}
