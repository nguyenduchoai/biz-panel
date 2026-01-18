/**
 * Activity Feed Component
 */
import React from 'react';
import { Card, Typography, Tag, Spin } from '@douyinfe/semi-ui';
import { useQuery } from '@tanstack/react-query';
import { getActivities } from '../../services/mockApi';
import type { Activity } from '../../types';
import './ActivityFeed.css';

const { Text } = Typography;

const ActivityFeed: React.FC = () => {
    const { data: activities, isLoading } = useQuery({
        queryKey: ['activities'],
        queryFn: getActivities,
        refetchInterval: 30000,
    });

    const getActivityIcon = (type: Activity['type']) => {
        switch (type) {
            case 'deploy': return '🚀';
            case 'backup': return '💾';
            case 'update': return '📦';
            case 'security': return '🔒';
            case 'create': return '🌐';
            case 'delete': return '🗑️';
            case 'config': return '⚙️';
            default: return '📋';
        }
    };

    const getStatusColor = (status: Activity['status']) => {
        switch (status) {
            case 'success': return 'green';
            case 'failed': return 'red';
            case 'pending': return 'orange';
            default: return 'grey';
        }
    };

    const formatRelativeTime = (timestamp: string) => {
        const now = new Date();
        const date = new Date(timestamp);
        const diff = now.getTime() - date.getTime();

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    return (
        <Card className="activity-card" title="Recent Activity">
            {isLoading ? (
                <div className="activity-loading">
                    <Spin />
                </div>
            ) : (
                <div className="activity-list">
                    {activities?.map((activity) => (
                        <div key={activity.id} className="activity-item">
                            <span className="activity-icon">{getActivityIcon(activity.type)}</span>
                            <div className="activity-content">
                                <Text className="activity-title">{activity.title}</Text>
                                <Text type="secondary" className="activity-time">
                                    {formatRelativeTime(activity.timestamp)}
                                </Text>
                            </div>
                            <Tag
                                color={getStatusColor(activity.status)}
                                className="activity-status"
                                size="small"
                            >
                                {activity.status === 'success' ? '✓' : activity.status === 'failed' ? '✗' : '...'}
                            </Tag>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
};

export default ActivityFeed;
