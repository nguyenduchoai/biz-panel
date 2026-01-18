/**
 * Quick Actions Component
 */
import React from 'react';
import { Card, Button, Typography } from '@douyinfe/semi-ui';
import { IconRefresh } from '@douyinfe/semi-icons';
import { useNavigate } from 'react-router-dom';
import './QuickActions.css';

const { Text } = Typography;

interface QuickAction {
    icon: React.ReactNode;
    label: string;
    path?: string;
    onClick?: () => void;
    color?: string;
}

const QuickActions: React.FC = () => {
    const navigate = useNavigate();

    const actions: QuickAction[] = [
        { icon: '🌐', label: 'Website', path: '/websites', color: '#00c853' },
        { icon: '🗄️', label: 'Database', path: '/databases', color: '#0066ff' },
        { icon: '🐳', label: 'Docker', path: '/docker', color: '#17a2b8' },
        { icon: '📦', label: 'App Store', path: '/appstore', color: '#ff9800' },
        { icon: '💾', label: 'Backup', onClick: () => alert('Backup started'), color: '#9c27b0' },
        { icon: <IconRefresh />, label: 'Refresh', onClick: () => window.location.reload(), color: '#607d8b' },
    ];

    const handleClick = (action: QuickAction) => {
        if (action.path) {
            navigate(action.path);
        } else if (action.onClick) {
            action.onClick();
        }
    };

    return (
        <Card className="quick-actions-card" title="Quick Actions">
            <div className="quick-actions-grid">
                {actions.map((action, index) => (
                    <Button
                        key={index}
                        className="quick-action-button"
                        theme="borderless"
                        onClick={() => handleClick(action)}
                    >
                        <span className="quick-action-icon">{action.icon}</span>
                        <Text className="quick-action-label">{action.label}</Text>
                    </Button>
                ))}
            </div>
        </Card>
    );
};

export default QuickActions;
