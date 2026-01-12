"use client";

import { useState, useEffect } from "react";
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
    Menu
} from "lucide-react";
import { TEAM_MEMBERS as INITIAL_MEMBERS, INITIAL_TASKS, INITIAL_MEETINGS, Task, Member, Meeting } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import Auth from "@/components/Auth";
import { Session } from '@supabase/supabase-js';

// Toast Notification Component
const Toast = ({ message, onClose }: { message: string, onClose: () => void }) => (
    <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="toast-container glass-panel"
    >
        <div className="toast-content">
            <div className="toast-icon"><Send size={18} /></div>
            <p>{message}</p>
        </div>
        <button onClick={onClose}><X size={14} /></button>
        <style jsx>{`
      .toast-container {
        position: fixed; bottom: 32px; right: 32px;
        padding: 16px 20px; z-index: 2000;
        display: flex; align-items: center; gap: 16px;
        background: var(--primary);
        color: white; border: none;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      }
      .toast-content { display: flex; align-items: center; gap: 12px; }
      .toast-icon { background: rgba(255,255,255,0.2); padding: 8px; border-radius: 8px; }
    `}</style>
    </motion.div>
);

const Modal = ({ title, children, onClose }: { title: string, children: React.ReactNode, onClose: () => void }) => (
    <div className="modal-overlay">
        <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="modal-content glass-panel"
        >
            <div className="modal-header">
                <h3>{title}</h3>
                <button onClick={onClose} className="icon-btn-sm"><X size={20} /></button>
            </div>
            {children}
        </motion.div>
    </div>
);

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState("dashboard");
    const [members, setMembers] = useState<Member[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [currentUser, setCurrentUser] = useState<Member | null>(null);
    const [showModal, setShowModal] = useState<string | null>(null);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [currentTime, setCurrentTime] = useState<Date | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [mindItems, setMindItems] = useState<any[]>([]);
    const [comments, setComments] = useState<any[]>([]);
    const [resources, setResources] = useState<any[]>([]);
    const [showComments, setShowComments] = useState<string | null>(null); // task_id
    const [dbStatus, setDbStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');

    useEffect(() => {
        const checkConnection = async () => {
            if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
                console.error("Supabase URL is missing in environment!");
                setDbStatus('offline');
                return;
            }
            try {
                const { error } = await supabase.from('members').select('count', { count: 'exact', head: true });
                setDbStatus(error ? 'offline' : 'online');
            } catch {
                setDbStatus('offline');
            }
        };
        checkConnection();
    }, []);

    useEffect(() => {
        // Handle Session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        const fetchData = async () => {
            if (!session) return;

            try {
                // 1. Fetch Current User Member Profile
                const { data: profile, error: profileErr } = await supabase
                    .from('members')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (profile) {
                    setCurrentUser(profile);
                } else if (!profileErr || profileErr.code === 'PGRST116') {
                    // Auto-create profile if missing (PGRST116 is 'no rows returned')
                    const { data: newProfile } = await supabase.from('members').insert([{
                        id: session.user.id,
                        name: session.user.user_metadata.name || 'Anonymous',
                        email: session.user.email,
                        role: 'member',
                        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.id}`
                    }]).select().single();
                    if (newProfile) setCurrentUser(newProfile);
                }

                // 2. Fetch all Members
                const { data: membersData } = await supabase.from('members').select('*');
                if (membersData && membersData.length > 0) {
                    setMembers(membersData);
                } else if (profile) {
                    // If no members in DB yet, at least show the current user
                    setMembers([profile]);
                }

                // 3. Fetch Tasks
                const { data: tasksData } = await supabase.from('tasks').select('*');
                if (tasksData) {
                    setTasks(tasksData.map(t => ({
                        ...t,
                        assigneeId: t.assignee_id
                    })));
                }

                // 4. Fetch Meetings
                const { data: meetingsData } = await supabase.from('meetings').select('*');
                if (meetingsData) {
                    setMeetings(meetingsData.map(m => ({
                        ...m,
                        startTime: m.start_time,
                        suggestedBy: m.suggested_by
                    })));
                }

                // 5. Fetch Mindspace
                const { data: mindData } = await supabase.from('mindspace_items').select('*').order('created_at', { ascending: false });
                if (mindData) setMindItems(mindData);

                // 6. Fetch Resources
                const { data: resData } = await supabase.from('resources').select('*').order('category');
                if (resData) setResources(resData);

                // 7. Fetch Comments
                const { data: commentData } = await supabase.from('task_comments').select('*').order('created_at', { ascending: true });
                if (commentData) setComments(commentData);

            } catch (err: any) {
                console.error("Critical error fetching data:", err);
                if (err.message === 'Failed to fetch') {
                    showNotification("Network Error: Check your internet or ad-blocker.");
                } else {
                    showNotification(`Sync Error: ${err.message}`);
                }
            } finally {
                setIsInitialized(true);
            }
        };

        // 5. Setup Real-time Subscriptions
        const tasksChannel = supabase.channel('tasks-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload: any) => {
                if (payload.eventType === 'INSERT') {
                    const newTask = { ...payload.new, assigneeId: payload.new.assignee_id };
                    setTasks(prev => {
                        if (prev.find(t => t.id === newTask.id)) return prev;
                        return [...prev, newTask];
                    });
                } else if (payload.eventType === 'UPDATE') {
                    const updatedTask = { ...payload.new, assigneeId: payload.new.assignee_id };
                    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
                } else if (payload.eventType === 'DELETE') {
                    setTasks(prev => prev.filter(t => t.id !== payload.old.id));
                }
            })
            .subscribe();

        const meetingsChannel = supabase.channel('meetings-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, (payload: any) => {
                if (payload.eventType === 'INSERT') {
                    const newMeet = { ...payload.new, startTime: payload.new.start_time, suggestedBy: payload.new.suggested_by };
                    setMeetings(prev => {
                        if (prev.find(m => m.id === newMeet.id)) return prev;
                        return [...prev, newMeet];
                    });
                } else if (payload.eventType === 'DELETE') {
                    setMeetings(prev => prev.filter(m => m.id !== payload.old.id));
                }
            })
            .subscribe();

        const membersChannel = supabase.channel('members-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, (payload: any) => {
                if (payload.eventType === 'INSERT') {
                    setMembers(prev => {
                        if (prev.find(m => m.id === payload.new.id)) return prev;
                        return [...prev, payload.new];
                    });
                } else if (payload.eventType === 'UPDATE') {
                    setMembers(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
                    if (session?.user.id === payload.new.id) setCurrentUser(payload.new);
                } else if (payload.eventType === 'DELETE') {
                    setMembers(prev => prev.filter(m => m.id !== payload.old.id));
                }
            })
            .subscribe();

        const mindChannel = supabase.channel('mind-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'mindspace_items' }, (payload: any) => {
                if (payload.eventType === 'INSERT') {
                    setMindItems(prev => {
                        if (prev.find(i => i.id === payload.new.id)) return prev;
                        return [payload.new, ...prev];
                    });
                } else if (payload.eventType === 'UPDATE') {
                    setMindItems(prev => prev.map(i => i.id === payload.new.id ? payload.new : i));
                } else if (payload.eventType === 'DELETE') {
                    setMindItems(prev => prev.filter(i => i.id !== payload.old.id));
                }
            })
            .subscribe();

        const commentsChannel = supabase.channel('comments-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_comments' }, (payload: any) => {
                setComments(prev => {
                    if (prev.find(c => c.id === payload.new.id)) return prev;
                    return [...prev, payload.new];
                });
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'task_comments' }, (payload: any) => {
                setComments(prev => prev.filter(c => c.id !== payload.old.id));
            })
            .subscribe();

        const resourcesChannel = supabase.channel('resources-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'resources' }, (payload: any) => {
                if (payload.eventType === 'INSERT') setResources(prev => [...prev, payload.new]);
                else if (payload.eventType === 'DELETE') setResources(prev => prev.filter(r => r.id !== payload.old.id));
            })
            .subscribe();

        if (session) {
            fetchData();
        } else {
            setIsInitialized(true);
        }

        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => {
            clearInterval(timer);
            subscription.unsubscribe();
            supabase.removeChannel(tasksChannel);
            supabase.removeChannel(meetingsChannel);
            supabase.removeChannel(membersChannel);
            supabase.removeChannel(mindChannel);
            supabase.removeChannel(commentsChannel);
            supabase.removeChannel(resourcesChannel);
        };
    }, [session]);

    if (!isInitialized) return <div className="loading-screen" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Workspace...</div>;

    if (!session) {
        return <Auth onAuthSuccess={() => window.location.reload()} />;
    }

    const getAssignee = (id: string) => members.find(m => m.id === id);
    const isAdmin = currentUser?.role.toLowerCase().includes('admin');

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setSession(null);
    };

    const showNotification = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 4000);
    };

    const handleAddTask = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const notify = formData.get('notify') === 'on';
        const assigneeId = formData.get('assigneeId') as string;
        const assignee = getAssignee(assigneeId);
        const title = formData.get('title') as string;

        const taskData = {
            title,
            description: formData.get('description') as string,
            assignee_id: assigneeId,
            deadline: formData.get('deadline') as string,
            priority: formData.get('priority') as 'low' | 'medium' | 'high',
        };

        if (editingTask) {
            const { error } = await supabase.from('tasks').update(taskData).eq('id', editingTask.id);
            if (!error) {
                setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...taskData, assigneeId } : t));
                showNotification("Task updated successfully");
            } else {
                console.error("Error updating task:", error);
                showNotification("Error: Could not update task");
            }
            setEditingTask(null);
        } else {
            const { data, error } = await supabase.from('tasks').insert([{ ...taskData, status: 'todo' }]).select();
            if (data && !error) {
                const newTask = { ...data[0], id: data[0].id, assigneeId: data[0].assignee_id };
                setTasks(prev => {
                    if (prev.find(t => t.id === newTask.id)) return prev;
                    return [...prev, newTask];
                });
                showNotification("Task created successfully");
            } else {
                console.error("Supabase Error:", error);
                showNotification(`Error: ${error?.message || "Could not create task"}`);
            }
        }

        setShowModal(null);
    };

    const handleDeleteTask = async (id: string) => {
        setConfirmAction({
            title: "Delete Task",
            message: "Are you sure you want to permanently delete this task?",
            onConfirm: async () => {
                const { error } = await supabase.from('tasks').delete().eq('id', id);
                if (!error) {
                    setTasks(prev => prev.filter(t => t.id !== id));
                    showNotification("Task deleted");
                }
                setConfirmAction(null);
            }
        });
    };

    const openEditTask = (task: Task) => {
        setEditingTask(task);
        setShowModal('task');
    };

    const handleAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const memberData = {
            name: formData.get('name') as string,
            email: formData.get('email') as string,
            role: formData.get('role') as string,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.get('name')}`,
        };

        const { data, error } = await supabase.from('members').insert([memberData]).select();
        if (data && !error) {
            setMembers(prev => [...prev, data[0]]);
            showNotification(`${memberData.name} added to team`);
        }
        setShowModal(null);
    };

    const handleDeleteMember = async (memberId: string) => {
        if (memberId === currentUser?.id) {
            showNotification("Cannot delete your own active profile.");
            return;
        }
        setConfirmAction({
            title: "Remove Member",
            message: "Are you sure you want to remove this member?",
            onConfirm: async () => {
                const { error } = await supabase.from('members').delete().eq('id', memberId);
                if (!error) {
                    setMembers(prev => prev.filter(m => m.id !== memberId));
                    setTasks(prev => prev.filter(t => t.assigneeId !== memberId));
                    showNotification("Member removed");
                }
                setConfirmAction(null);
            }
        });
    };

    const handleDeleteMeeting = async (id: string) => {
        setConfirmAction({
            title: "Cancel Meeting",
            message: "Are you sure you want to cancel this meeting?",
            onConfirm: async () => {
                const { error } = await supabase.from('meetings').delete().eq('id', id);
                if (!error) {
                    setMeetings(prev => prev.filter(m => m.id !== id));
                    showNotification("Meeting cancelled");
                }
                setConfirmAction(null);
            }
        });
    };

    const handleSuggestMeeting = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const notify = formData.get('notify') === 'on';
        const title = formData.get('title') as string;
        const time = formData.get('time') as string;

        const meetData = {
            title,
            start_time: time,
            link: formData.get('link') as string,
            suggested_by: currentUser?.id,
        };

        const { data, error } = await supabase.from('meetings').insert([meetData]).select();
        if (data && !error) {
            const newMeet = { ...data[0], startTime: data[0].start_time, suggestedBy: data[0].suggested_by };
            setMeetings(prev => [...prev, newMeet]);
            showNotification("Meeting suggested");
        }
        setShowModal(null);
    };

    const toggleTaskStatus = async (id: string) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        const nextStatus = task.status === 'todo' ? 'in-progress' : task.status === 'in-progress' ? 'completed' : 'todo';
        const { error } = await supabase.from('tasks').update({ status: nextStatus }).eq('id', id);

        if (!error) {
            setTasks(prev => prev.map(t => t.id === id ? { ...t, status: nextStatus } : t));
        }
    };

    const handleAddMindItem = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const type = formData.get('type') as 'idea' | 'issue';

        if (!title.trim() || !description.trim()) return;

        const item = {
            title,
            description,
            type,
            author_id: session?.user.id,
            upvotes: 0
        };

        const { data, error } = await supabase.from('mindspace_items').insert([item]).select();
        if (error) {
            console.error("Mindspace Error:", error);
            showNotification(`Error: ${error.message}`);
        } else {
            showNotification(`${type === 'idea' ? 'Idea' : 'Issue'} shared!`);
            // Realtime will handle the state update if enabled, but let's be safe
            if (data && data[0]) {
                setMindItems(prev => {
                    if (prev.find(i => i.id === data[0].id)) return prev;
                    return [data[0], ...prev];
                });
            }
            setShowModal(null);
            e.currentTarget.reset();
        }
    };

    const handleUpvote = async (id: string, current: number) => {
        await supabase.from('mindspace_items').update({ upvotes: current + 1 }).eq('id', id);
    };

    const handleConvertToTask = async (item: any) => {
        const taskData = {
            title: item.title,
            description: item.description,
            priority: item.type === 'issue' ? 'high' : 'medium',
            status: 'todo',
            assignee_id: session?.user.id
        };
        const { error: taskErr } = await supabase.from('tasks').insert([taskData]);
        if (!taskErr) {
            await supabase.from('mindspace_items').delete().eq('id', item.id);
            showNotification("Converted to task!");
        }
    };

    const handleDeleteComment = async (id: string) => {
        const { error } = await supabase.from('task_comments').delete().eq('id', id);
        if (error) {
            showNotification(`Error: ${error.message}`);
        } else {
            setComments(prev => prev.filter(c => c.id !== id));
        }
    };

    const handleAddComment = async (e: React.FormEvent<HTMLFormElement>, taskId: string) => {
        e.preventDefault();
        const input = e.currentTarget.querySelector('input') as HTMLInputElement;
        const content = input.value.trim();
        if (!content) return;

        // Clear input immediately for WhatsApp-like feel
        input.value = '';

        const { data, error } = await supabase.from('task_comments').insert([{
            task_id: taskId,
            author_id: session?.user.id,
            content: content
        }]).select();

        if (error) {
            console.error("Comment Error:", error);
            showNotification(`Error: ${error.message}`);
            // Restore content if failed? Usually better to just notify.
        } else {
            if (data && data[0]) {
                setComments(prev => {
                    if (prev.find(c => c.id === data[0].id)) return prev;
                    return [...prev, data[0]];
                });
            }
        }
    };

    const handleAddResource = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const res = {
            title: formData.get('title') as string,
            url: formData.get('url') as string,
            category: formData.get('category') as string,
            added_by: session?.user.id
        };
        const { error } = await supabase.from('resources').insert([res]);
        if (!error) {
            showNotification("Resource added to Vault");
            setShowModal(null);
        }
    };

    const renderDashboard = () => (
        <div className="dashboard-content fade-in">
            <header className="content-header">
                <div>
                    <h1>Welcome, {currentUser?.name}</h1>
                    <p className="subtitle">{currentTime?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="header-actions">
                    <div className={`db-status-pill ${dbStatus}`}>
                        <div className="status-dot"></div>
                        <span>Supabase: {dbStatus === 'online' ? 'Live' : dbStatus === 'offline' ? 'Blocked' : 'Connecting...'}</span>
                    </div>
                    <div className="search-bar"><Search size={18} /><input type="text" placeholder="Search tasks..." /></div>
                    <button className="icon-btn"><Bell size={20} /></button>
                    <img src={currentUser?.avatar} className="profile-img-header" alt="" />
                </div>
            </header>

            <div className="stats-grid">
                <div className="stat-card glass-panel" onClick={() => setActiveTab('tasks')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon" style={{ backgroundColor: '#3b82f620', color: '#3b82f6' }}><CheckSquare size={24} /></div>
                    <div className="stat-info"><h3>{tasks.filter(t => t.status !== 'completed').length}</h3><p>Active Tasks</p></div>
                </div>
                <div className="stat-card glass-panel" onClick={() => setActiveTab('mindspace')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon" style={{ backgroundColor: '#14b8a620', color: '#14b8a6' }}><Lightbulb size={24} /></div>
                    <div className="stat-info"><h3>{mindItems.length}</h3><p>Mindspace Items</p></div>
                </div>
                <div className="stat-card glass-panel">
                    <div className="stat-icon" style={{ backgroundColor: '#8b5cf620', color: '#8b5cf6' }}><Video size={24} /></div>
                    <div className="stat-info"><h3>{meetings.length}</h3><p>Syncs Scheduled</p></div>
                </div>
                <div className="stat-card glass-panel" onClick={() => setActiveTab('vault')} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon" style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}><Folder size={24} /></div>
                    <div className="stat-info"><h3>{resources.length}</h3><p>Vault Resources</p></div>
                </div>
            </div>

            <div className="dashboard-main-grid">
                <div className="tasks-preview glass-panel">
                    <div className="section-header"><h2>Live Task Feed</h2><button className="text-btn" onClick={() => setActiveTab('tasks')}>Explore Board</button></div>
                    <div className="task-list">
                        {tasks.slice(0, 3).map(task => (
                            <div key={task.id} className="task-preview-item">
                                <div className={`priority-indicator ${task.priority}`}></div>
                                <div className="task-body">
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <h4>{task.title}</h4>
                                        <button className="icon-btn-xs" onClick={() => setShowComments(task.id)}><MessageCircle size={12} /> {comments.filter(c => c.task_id === task.id).length}</button>
                                    </div>
                                    <div className="task-meta">
                                        <span><Clock size={14} /> {task.deadline}</span>
                                        <span className="assignee-tag"><img src={getAssignee(task.assigneeId)?.avatar} alt="" /> {getAssignee(task.assigneeId)?.name}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="meetings-preview glass-panel">
                    <div className="section-header"><h2>Upcoming</h2><button className="primary-btn sm" onClick={() => setShowModal('meeting')}><Plus size={16} /> Suggest</button></div>
                    <div className="meetings-list">
                        {meetings.map((meet, i) => (
                            <div key={meet.id} className="meeting-item">
                                <div className="meeting-time">
                                    <span className="time">{new Date(meet.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="meeting-details">
                                    <h4>{meet.title}</h4>
                                    <div className="meeting-actions-row">
                                        <a href={meet.link} target="_blank" rel="noreferrer" className="meeting-link">Join Google Meet <Video size={14} /></a>
                                        <button className="icon-btn-xs" onClick={() => handleDeleteMeeting(meet.id)}><Trash2 size={12} /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderMindspace = () => (
        <div className="mindspace-view fade-in">
            <header className="content-header">
                <div><h1>Mindspace</h1><p className="subtitle">Ideas & Bug Tracking Hub</p></div>
                <div className="header-actions">
                    <button className="primary-btn" onClick={() => setShowModal('mind')}><Plus size={20} /> Share Thought</button>
                </div>
            </header>
            <div className="mind-grid">
                {mindItems.map(item => (
                    <div key={item.id} className="mind-card glass-panel">
                        <div className="mind-card-header">
                            <span className={`mind-badge ${item.type}`}>{item.type === 'idea' ? <Lightbulb size={12} /> : <Bug size={12} />} {item.type.toUpperCase()}</span>
                            <button className="upvote-btn" onClick={() => handleUpvote(item.id, item.upvotes)}><ArrowUp size={14} /> {item.upvotes}</button>
                        </div>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                        <div className="mind-card-footer">
                            <div className="author">
                                <img src={getAssignee(item.author_id)?.avatar} alt="" />
                                <span>{getAssignee(item.author_id)?.name}</span>
                            </div>
                            {isAdmin && <button className="secondary-btn sm" onClick={() => handleConvertToTask(item)}>Convert to Task</button>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderVault = () => (
        <div className="vault-view fade-in">
            <header className="content-header">
                <div><h1>Resource Vault</h1><p className="subtitle">Project links and assets</p></div>
                <div className="header-actions">
                    {isAdmin && <button className="primary-btn" onClick={() => setShowModal('resource')}><Plus size={20} /> Add Resource</button>}
                </div>
            </header>
            <div className="vault-grid">
                {Array.from(new Set(resources.map(r => r.category))).map(cat => (
                    <div key={cat} className="vault-section">
                        <h3 className="section-title">{cat}</h3>
                        <div className="resources-list">
                            {resources.filter(r => r.category === cat).map(res => (
                                <div key={res.id} className="resource-card glass-panel">
                                    <div className="res-icon"><LinkIcon size={20} /></div>
                                    <div className="res-info">
                                        <h4>{res.title}</h4>
                                        <p>{new URL(res.url).hostname}</p>
                                    </div>
                                    <div className="res-actions">
                                        <button className="icon-btn-sm" onClick={() => { navigator.clipboard.writeText(res.url); showNotification("Link copied!"); }}><Copy size={16} /></button>
                                        <a href={res.url} target="_blank" rel="noreferrer" className="icon-btn-sm"><ExternalLink size={16} /></a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="app-container">
            <header className="mobile-header">
                <div className="logo"><div className="logo-icon">TS</div><span>TeamSync</span></div>
                <button className="icon-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                    {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="logo"><div className="logo-icon">TS</div><span>TeamSync</span></div>
                <nav>
                    <button className={activeTab === "dashboard" ? "active" : ""} onClick={() => { setActiveTab("dashboard"); setIsSidebarOpen(false); }}><LayoutDashboard size={20} /> Dashboard</button>
                    <button className={activeTab === "tasks" ? "active" : ""} onClick={() => { setActiveTab("tasks"); setIsSidebarOpen(false); }}><CheckSquare size={20} /> Tasks</button>
                    <button className={activeTab === "mindspace" ? "active" : ""} onClick={() => { setActiveTab("mindspace"); setIsSidebarOpen(false); }}><Lightbulb size={20} /> Mindspace</button>
                    <button className={activeTab === "vault" ? "active" : ""} onClick={() => { setActiveTab("vault"); setIsSidebarOpen(false); }}><Folder size={20} /> Vault</button>
                    <button className={activeTab === "team" ? "active" : ""} onClick={() => { setActiveTab("team"); setIsSidebarOpen(false); }}><Users size={20} /> Team Hub</button>
                    <button className="logout" onClick={handleLogout} style={{ marginTop: 'auto', color: 'var(--error)' }}><LogOut size={20} /> Logout</button>
                </nav>
                <div className="sidebar-footer">
                    <div className="current-user-info">
                        <img src={currentUser?.avatar} alt="" />
                        <div className="user-details" style={{ overflow: 'hidden' }}>
                            <p className="user-name" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{currentUser?.name}</p>
                            <p className="user-role" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{currentUser?.role}</p>
                        </div>
                    </div>
                </div>
            </div>

            {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

            <div className="bottom-nav">
                <button className={activeTab === "dashboard" ? "active" : ""} onClick={() => setActiveTab("dashboard")}><LayoutDashboard size={20} /><span>Home</span></button>
                <button className={activeTab === "tasks" ? "active" : ""} onClick={() => setActiveTab("tasks")}><CheckSquare size={20} /><span>Tasks</span></button>
                <button className={activeTab === "mindspace" ? "active" : ""} onClick={() => setActiveTab("mindspace")}><Plus size={24} className="add-btn-mobile" /></button>
                <button className={activeTab === "vault" ? "active" : ""} onClick={() => setActiveTab("vault")}><Folder size={20} /><span>Vault</span></button>
                <button className={activeTab === "team" ? "active" : ""} onClick={() => setActiveTab("team")}><Users size={20} /><span>Team</span></button>
            </div>

            <div className="main-content">
                <AnimatePresence mode="wait">
                    {activeTab === "dashboard" && <motion.div key="dash" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>{renderDashboard()}</motion.div>}
                    {activeTab === "mindspace" && <motion.div key="mind" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>{renderMindspace()}</motion.div>}
                    {activeTab === "vault" && <motion.div key="vault" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>{renderVault()}</motion.div>}

                    {activeTab === "tasks" && (
                        <motion.div key="tasks" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="tasks-view">
                            <header className="content-header">
                                <div><h1>Task Board</h1><p className="subtitle">Track team commitments</p></div>
                                <div className="header-actions">
                                    {isAdmin && <button className="primary-btn" onClick={() => setShowModal('task')}><Plus size={20} /> New Task</button>}
                                </div>
                            </header>
                            <div className="kanban-board">
                                {['todo', 'in-progress', 'completed'].map(status => (
                                    <div key={status} className="kanban-column glass-panel">
                                        <h3 className="column-title">{status.toUpperCase()}</h3>
                                        <div className="column-content">
                                            {tasks.filter(t => t.status === status).map((task, i) => (
                                                <div key={i} className="task-card">
                                                    <div className="task-card-header">
                                                        <span className={`badge ${task.priority}`}>{task.priority}</span>
                                                        <div className="card-actions">
                                                            <button className="icon-btn-xs" onClick={() => setShowComments(task.id)}><MessageSquare size={12} /></button>
                                                            <button className="icon-btn-xs" onClick={() => openEditTask(task)}><Settings size={12} /></button>
                                                            <button className="icon-btn-xs" onClick={() => handleDeleteTask(task.id)} style={{ color: 'var(--error)' }}><Trash2 size={12} /></button>
                                                        </div>
                                                    </div>
                                                    <h4>{task.title}</h4>
                                                    <p>{task.description}</p>
                                                    <div className="task-card-footer">
                                                        <div className="assignee">
                                                            <img src={getAssignee(task.assigneeId)?.avatar} alt="" />
                                                            <span>{getAssignee(task.assigneeId)?.name}</span>
                                                        </div>
                                                        <button
                                                            className={`status-btn ${task.status}`}
                                                            onClick={() => toggleTaskStatus(task.id)}
                                                            title="Toggle status"
                                                        >
                                                            <CheckSquare size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === "team" && (
                        <motion.div key="team" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="team-view">
                            <header className="content-header">
                                <div><h1>Team Hub</h1><p className="subtitle">Member directory and access</p></div>
                                <div className="header-actions">
                                    {isAdmin && <button className="primary-btn" onClick={() => setShowModal('member')}><UserPlus size={20} /> Add Member</button>}
                                </div>
                            </header>
                            <div className="members-grid">
                                {members.map(member => (
                                    <div key={member.id} className="member-card glass-panel">
                                        <div className="member-avatar-large"><img src={member.avatar} alt="" /></div>
                                        <h3>{member.name}</h3>
                                        <p className="member-role">{member.role}</p>
                                        <p className="member-email"><Mail size={14} style={{ marginRight: '4px' }} /> {member.email}</p>
                                        <div className="member-actions" style={{ marginTop: '16px' }}>
                                            <button className="secondary-btn" onClick={() => setCurrentUser(member)}>Assume Profile</button>
                                            {isAdmin && (
                                                <button className="icon-btn-sm" onClick={() => handleDeleteMember(member.id)} style={{ color: 'var(--error)' }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showModal === 'task' && (
                    <Modal title={editingTask ? "Edit Task" : "Assign Task"} onClose={() => { setShowModal(null); setEditingTask(null); }}>
                        <form onSubmit={handleAddTask} className="form-layout">
                            <input name="title" defaultValue={editingTask?.title} placeholder="What needs to be done?" required />
                            <textarea name="description" defaultValue={editingTask?.description} placeholder="Add more details..." required />

                            <div className="assignee-select-container">
                                <p className="label-sm">Assign To:</p>
                                <div className="assignee-grid-select">
                                    {members.map(m => (
                                        <label key={m.id} className="assignee-option">
                                            <input
                                                type="radio"
                                                name="assigneeId"
                                                value={m.id}
                                                defaultChecked={editingTask ? editingTask.assigneeId === m.id : members[0].id === m.id}
                                                required
                                            />
                                            <div className="assignee-card-mini">
                                                <img src={m.avatar} alt="" />
                                                <span>{m.name.split(' ')[0]}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="input-group">
                                    <p className="label-sm">Deadline</p>
                                    <input type="date" name="deadline" defaultValue={editingTask?.deadline} required />
                                </div>
                                <div className="input-group">
                                    <p className="label-sm">Priority</p>
                                    <select name="priority" defaultValue={editingTask?.priority || "medium"}>
                                        <option value="low">Low Priority</option>
                                        <option value="medium">Medium Priority</option>
                                        <option value="high">High Priority</option>
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="primary-btn full-width">
                                {editingTask ? "Update Task" : "Create Task"}
                            </button>
                        </form>
                    </Modal>
                )}

                {showModal === 'member' && (
                    <Modal title="Invite Member" onClose={() => setShowModal(null)}>
                        <form onSubmit={handleAddMember} className="form-layout">
                            <input name="name" placeholder="Full Name" required />
                            <input name="email" type="email" placeholder="Google Email Address" required />
                            <input name="role" placeholder="Role (e.g. Lead Designer)" required />
                            <button type="submit" className="primary-btn full-width">Add to Workspace</button>
                        </form>
                    </Modal>
                )}

                {showModal === 'meeting' && (
                    <Modal title="Suggest Meeting" onClose={() => setShowModal(null)}>
                        <form onSubmit={handleSuggestMeeting} className="form-layout">
                            <input name="title" placeholder="Meeting Topic" required />
                            <input name="time" type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} required />
                            <input name="link" placeholder="Meet Link" defaultValue="https://meet.google.com/new" required />
                            <button type="submit" className="primary-btn full-width">Post Suggestion</button>
                        </form>
                    </Modal>
                )}

                {showModal === 'mind' && (
                    <Modal title="Share Thought" onClose={() => setShowModal(null)}>
                        <form onSubmit={handleAddMindItem} className="form-layout">
                            <input name="title" placeholder="Idea or Issue Title" required />
                            <textarea name="description" placeholder="Explain the thought..." required />
                            <select name="type">
                                <option value="idea">Idea</option>
                                <option value="issue">Issue/Bug</option>
                            </select>
                            <button type="submit" className="primary-btn full-width">Post to Mindspace</button>
                        </form>
                    </Modal>
                )}

                {showModal === 'resource' && (
                    <Modal title="Add to Vault" onClose={() => setShowModal(null)}>
                        <form onSubmit={handleAddResource} className="form-layout">
                            <input name="title" placeholder="Resource Name" required />
                            <input name="url" type="url" placeholder="https://..." required />
                            <input name="category" placeholder="Category (e.g. Design, API)" required />
                            <button type="submit" className="primary-btn full-width">Link Resource</button>
                        </form>
                    </Modal>
                )}

                {showComments && (
                    <Modal title="Activity Thread" onClose={() => setShowComments(null)}>
                        <div className="comments-view">
                            <div className="comments-list-full">
                                {comments.filter(c => c.task_id === showComments).map((comm) => (
                                    <div key={comm.id} className={`comment-item ${comm.author_id === session?.user.id ? 'own-comment' : ''}`}>
                                        <div className="comment-bubble-wrapper">
                                            <div className="comment-bubble">
                                                <div className="comment-header-row">
                                                    <p className="comment-author">{getAssignee(comm.author_id)?.name || 'Team Member'}</p>
                                                    {(comm.author_id === session?.user.id || isAdmin) && (
                                                        <button className="delete-comment-btn" onClick={() => handleDeleteComment(comm.id)}>
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="comment-text">{comm.content}</p>
                                                <div className="comment-footer">
                                                    <p className="comment-time">{new Date(comm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {comments.filter(c => c.task_id === showComments).length === 0 && <p className="empty-text">No discussion yet. Start the thread!</p>}
                            </div>
                            <form onSubmit={(e) => handleAddComment(e, showComments)} className="comment-input-area">
                                <input placeholder="Write a comment..." />
                                <button type="submit" className="icon-btn"><Send size={18} /></button>
                            </form>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {confirmAction && (
                    <div className="modal-overlay" style={{ zIndex: 3000 }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="modal-content glass-panel confirm-dialog"
                        >
                            <h3>{confirmAction.title}</h3>
                            <p>{confirmAction.message}</p>
                            <div className="confirm-actions">
                                <button className="secondary-btn" onClick={() => setConfirmAction(null)}>Cancel</button>
                                <button className="primary-btn" style={{ backgroundColor: 'var(--error)' }} onClick={confirmAction.onConfirm}>Confirm</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Toast Notification */}
            <AnimatePresence>
                {toast && <Toast message={toast} onClose={() => setToast(null)} />}
            </AnimatePresence>

            <style jsx global>{`
        .profile-img-header { width: 40px; height: 40px; border-radius: 12px; border: 2px solid var(--primary); }
        .loading-screen { background: var(--background); color: white; font-size: 1.2rem; }
        .checkbox-container { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-muted); cursor: pointer; margin-top: 4px; }
        .checkbox-container input { width: 16px !important; height: 16px !important; margin: 0; cursor: pointer; }
        .member-email { display: flex; align-items: center; justify-content: center; color: var(--primary); font-size: 12px; font-weight: 500; }
        
        .db-status-pill { display: flex; align-items: center; gap: 8px; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; background: rgba(255,255,255,0.05); }
        .db-status-pill.online { color: #22c55e; }
        .db-status-pill.offline { color: #ef4444; }
        .db-status-pill.connecting { color: #f59e0b; }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 8px currentColor; }
        
        /* New Styles */
        .card-actions { display: flex; gap: 4px; }
        .icon-btn-xs { width: 24px; height: 24px; border-radius: 6px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; color: var(--text-muted); }
        .icon-btn-xs:hover { background: rgba(255,255,255,0.1); color: white; }
        .status-btn { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--text-muted); background: var(--surface); }
        .status-btn.completed { color: var(--success); background: rgba(34, 197, 94, 0.1); }
        .status-btn.in-progress { color: #f59e0b; background: rgba(245, 158, 11, 0.1); }
        
        .label-sm { font-size: 12px; color: var(--text-muted); margin-bottom: 4px; font-weight: 500; }
        .assignee-grid-select { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 8px; }
        .assignee-option { cursor: pointer; position: relative; }
        .assignee-option input { position: absolute; opacity: 0; width: 0; height: 0; }
        .assignee-card-mini { padding: 8px; border-radius: 12px; background: var(--surface); border: 1px solid var(--border); display: flex; flex-direction: column; align-items: center; gap: 4px; transition: 0.2s; }
        .assignee-card-mini img { width: 24px; height: 24px; border-radius: 50%; }
        .assignee-card-mini span { font-size: 11px; font-weight: 500; }
        .assignee-option input:checked + .assignee-card-mini { background: rgba(59, 130, 246, 0.1); border-color: var(--primary); color: var(--primary); }
        .input-group { display: flex; flex-direction: column; }
        
        .confirm-dialog { max-width: 400px; text-align: center; }
        .confirm-dialog p { color: var(--text-muted); margin: 16px 0 24px; font-size: 14px; line-height: 1.6; }
        .confirm-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .meeting-actions-row { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }

        /* Mindspace */
        .mind-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-top: 24px; }
        .mind-card { padding: 24px; display: flex; flex-direction: column; gap: 12px; }
        .mind-card-header { display: flex; justify-content: space-between; align-items: center; }
        .mind-badge { padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 700; display: flex; align-items: center; gap: 4px; }
        .mind-badge.idea { background: rgba(20, 184, 166, 0.1); color: #14b8a6; }
        .mind-badge.issue { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        .upvote-btn { background: rgba(255,255,255,0.05); color: white; border: none; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px; cursor: pointer; transition: 0.2s; }
        .upvote-btn:hover { background: var(--primary); transform: translateY(-2px); }
        .mind-card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border); }
        
        /* Vault */
        .vault-grid { display: grid; gap: 40px; }
        .vault-section .section-title { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 20px; }
        .resources-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        .resource-card { padding: 16px; display: flex; align-items: center; gap: 16px; height: 80px; }
        .res-icon { width: 48px; height: 48px; border-radius: 12px; background: rgba(59, 130, 246, 0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; }
        .res-info { flex: 1; }
        .res-info h4 { font-size: 15px; margin-bottom: 2px; }
        .res-info p { font-size: 12px; color: var(--text-muted); }
        .res-actions { display: flex; gap: 8px; }

        @media (max-width: 768px) {
            .mind-grid, .resources-list {
                grid-template-columns: 1fr;
            }
            .sidebar-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.5);
                backdrop-filter: blur(4px);
                z-index: 999;
            }
        }

        /* Premium WhatsApp Overhaul */
        .comments-view { display: flex; flex-direction: column; height: 550px; max-height: 80vh; background: #0b141a; border-radius: 0 0 16px 16px; position: relative; }
        .comments-list-full { flex: 1; overflow-y: auto; padding: 24px 16px; display: flex; flex-direction: column; gap: 8px; scroll-behavior: smooth; }
        .comment-item { display: flex; width: 100%; }
        .comment-item.own-comment { justify-content: flex-end; }
        .comment-bubble-wrapper { max-width: 85%; display: flex; flex-direction: column; }
        .comment-bubble { 
            padding: 8px 12px; 
            border-radius: 12px; 
            background: #202c33; 
            box-shadow: 0 1px 2px rgba(0,0,0,0.2);
            position: relative;
        }
        .comment-item.own-comment .comment-bubble { 
            background: #005c4b; 
            border-bottom-right-radius: 2px;
        }
        .comment-item:not(.own-comment) .comment-bubble {
            border-bottom-left-radius: 2px;
        }
        .comment-header-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 4px; }
        .comment-author { font-size: 11px; font-weight: 700; color: #53bdeb; margin-bottom: 2px; }
        .comment-item.own-comment .comment-author { color: #8696a0; }
        .delete-comment-btn { 
            opacity: 0; 
            color: rgba(255,255,255,0.4); 
            padding: 2px; 
            transition: 0.2s;
            margin-top: -2px;
        }
        .comment-bubble:hover .delete-comment-btn { opacity: 1; }
        .delete-comment-btn:hover { color: #ef4444; }
        .comment-text { font-size: 14.5px; line-height: 1.5; color: #e9edef; white-space: pre-wrap; word-break: break-word; }
        .comment-footer { display: flex; justify-content: flex-end; margin-top: 2px; }
        .comment-time { font-size: 10px; color: rgba(255,255,255,0.4); }
        .comment-input-area { 
            padding: 12px 16px; 
            display: flex; 
            gap: 12px; 
            background: #202c33; 
            align-items: center; 
            box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
        }
        .comment-input-area input { 
            flex: 1; 
            background: #2a3942; 
            border: none; 
            color: #d1d7db; 
            padding: 12px 18px; 
            border-radius: 24px; 
            outline: none; 
            font-size: 14px;
            box-shadow: inset 0 1px 2px rgba(0,0,0,0.2);
        }
        .comment-input-area .icon-btn { 
            background: #00a884; 
            color: white; 
            width: 40px; 
            height: 40px; 
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        .comment-input-area .icon-btn:hover { background: #008f6f; transform: scale(1.05); }
        .empty-text { text-align: center; color: #8696a0; margin-top: 40px; font-style: italic; font-size: 13px; font-weight: 500; }
      `}</style>
        </div>
    );
}
