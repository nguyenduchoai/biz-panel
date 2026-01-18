/**
 * Placeholder Pages
 * These are simple pages for modules that need more detailed implementation
 */
import React from 'react';
import { Typography, Card, Button } from '@douyinfe/semi-ui';
import { IconPlus } from '@douyinfe/semi-icons';

const { Title, Text } = Typography;

// Generic placeholder component
const PlaceholderPage: React.FC<{
    title: string;
    description: string;
    icon: string;
}> = ({ title, description, icon }) => (
    <div className="placeholder-page page-enter" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
                <Title heading={3} style={{ color: 'var(--color-text-primary)', margin: 0 }}>{title}</Title>
                <Text type="secondary" style={{ fontSize: 14, marginTop: 4 }}>{description}</Text>
            </div>
            <Button icon={<IconPlus />} theme="solid" type="primary">Create New</Button>
        </div>

        <Card style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: 8
        }}>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 48
            }}>
                <span style={{ fontSize: 64, marginBottom: 16 }}>{icon}</span>
                <Title heading={4} style={{ color: 'var(--color-text-primary)' }}>{title}</Title>
                <Text type="secondary">This feature is under development. Coming soon!</Text>
                <Button style={{ marginTop: 16 }} theme="solid" type="primary">
                    Get Started
                </Button>
            </div>
        </Card>
    </div>
);

// Projects Page
export const Projects: React.FC = () => (
    <PlaceholderPage
        title="Projects"
        description="Deploy applications from Git repositories"
        icon="📦"
    />
);

// Files Page
export const Files: React.FC = () => (
    <PlaceholderPage
        title="File Manager"
        description="Browse and manage server files"
        icon="📁"
    />
);

// Logs Page
export const Logs: React.FC = () => (
    <PlaceholderPage
        title="Logs"
        description="View real-time log streams"
        icon="📜"
    />
);

// Terminal Page
export const Terminal: React.FC = () => (
    <PlaceholderPage
        title="Terminal"
        description="Web-based SSH terminal"
        icon="💻"
    />
);

// Cronjobs Page
export const Cron: React.FC = () => (
    <PlaceholderPage
        title="Cronjobs"
        description="Schedule and manage cron tasks"
        icon="⏰"
    />
);

// Settings Page
export const Settings: React.FC = () => (
    <PlaceholderPage
        title="Settings"
        description="Panel configuration and user management"
        icon="⚙️"
    />
);
