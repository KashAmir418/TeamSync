export type Member = {
    id: string;
    name: string;
    role: string;
    avatar: string;
    email: string;
};

export type Task = {
    id: string;
    title: string;
    description: string;
    assigneeId: string;
    deadline: string;
    status: 'todo' | 'in-progress' | 'completed';
    priority: 'low' | 'medium' | 'high';
};

export type Meeting = {
    id: string;
    title: string;
    startTime: string;
    link: string;
    suggestedBy: string;
};

export const TEAM_MEMBERS: Member[] = [
    {
        id: 'admin-1',
        name: 'Alex Rivera',
        role: 'Team Admin / Product Manager',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
        email: 'alex@teamsync.com',
    },
    {
        id: 'member-2',
        name: 'Sarah Chen',
        role: 'Lead Developer',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
        email: 'sarah@teamsync.com',
    },
    {
        id: 'member-3',
        name: 'Jordan Smith',
        role: 'UI/UX Designer',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan',
        email: 'jordan@teamsync.com',
    },
    {
        id: 'member-4',
        name: 'Maya Patel',
        role: 'Marketing Specialist',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maya',
        email: 'maya@teamsync.com',
    },
];

export const INITIAL_TASKS: Task[] = [
    {
        id: 'task-1',
        title: 'Finalize Q1 Project Roadmap',
        description: 'Allign all department goals for the first quarter.',
        assigneeId: 'admin-1',
        deadline: '2026-01-20',
        status: 'in-progress',
        priority: 'high',
    },
    {
        id: 'task-2',
        title: 'Refactor Auth Layout',
        description: 'Improve the performance of the login flow.',
        assigneeId: 'member-2',
        deadline: '2026-01-15',
        status: 'todo',
        priority: 'medium',
    },
    {
        id: 'task-3',
        title: 'Brand Refresh Designs',
        description: 'Create new color palettes and typography system.',
        assigneeId: 'member-3',
        deadline: '2026-01-18',
        status: 'completed',
        priority: 'high',
    },
];

export const INITIAL_MEETINGS: Meeting[] = [
    {
        id: 'meet-1',
        title: 'Weekly Sync',
        startTime: '2026-01-12T10:00:00',
        link: 'https://meet.google.com/abc-defg-hij',
        suggestedBy: 'admin-1',
    },
];
