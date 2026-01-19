/**
 * Dashboard Page - Connected to Real Backend
 */
import React, { useMemo } from 'react';
import { Typography, Card, Spin } from '@douyinfe/semi-ui';
// Icons imported as needed
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ResourceCard, QuickActions, ServicesStatus, ActivityFeed } from '../components/dashboard';
import { getSystemMetrics, type SystemMetrics } from '../services/api';
import './Dashboard.css';

const { Title, Text } = Typography;

// Generate fake historical data for charts
const generateChartData = (count: number, maxValue: number) => {
    return Array.from({ length: count }, (_, i) => ({
        time: i,
        value: Math.floor(Math.random() * maxValue * 0.3) + maxValue * 0.3,
    }));
};

const Dashboard: React.FC = () => {
    // Use real backend API for metrics
    const { data: metrics, isLoading } = useQuery<SystemMetrics>({
        queryKey: ['system-metrics'],
        queryFn: getSystemMetrics,
        refetchInterval: 5000, // Refresh every 5 seconds
        retry: 3,
    });

    const networkData = useMemo(() => generateChartData(20, 100), []);
    const cpuTrend = useMemo(() => Array.from({ length: 12 }, () => Math.floor(Math.random() * 30) + 40), []);
    const memoryTrend = useMemo(() => Array.from({ length: 12 }, () => Math.floor(Math.random() * 20) + 55), []);

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const formatUptime = (seconds: number) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        return `${days}d ${hours}h`;
    };

    if (isLoading) {
        return (
            <div className="dashboard-loading">
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className="dashboard page-enter">
            <div className="page-header">
                <div>
                    <Title heading={3} className="page-title">Dashboard</Title>
                    <Text type="secondary" className="page-subtitle">
                        Server overview and quick actions
                    </Text>
                </div>
                <Text type="tertiary" className="last-updated">
                    Updated just now
                </Text>
            </div>

            {/* Resource Cards */}
            <div className="resource-grid">
                <ResourceCard
                    icon="🖥️"
                    title="CPU Usage"
                    value={`${metrics?.cpu.usage.toFixed(1)}%`}
                    percentage={metrics?.cpu.usage || 0}
                    subtitle={`${metrics?.cpu.cores} cores`}
                    trend={cpuTrend}
                    color="#0066ff"
                />
                <ResourceCard
                    icon="🧠"
                    title="Memory"
                    value={formatBytes(metrics?.memory.used || 0)}
                    percentage={metrics?.memory.usedPercent || 0}
                    subtitle={`of ${formatBytes(metrics?.memory.total || 0)}`}
                    trend={memoryTrend}
                    color="#00c853"
                />
                <ResourceCard
                    icon="💾"
                    title="Disk Usage"
                    value={formatBytes(metrics?.disk.used || 0)}
                    percentage={metrics?.disk.usedPercent || 0}
                    subtitle={`of ${formatBytes(metrics?.disk.total || 0)}`}
                    color="#ff9800"
                />
                <ResourceCard
                    icon="⏱️"
                    title="Uptime"
                    value={formatUptime(metrics?.uptime || 0)}
                    percentage={100}
                    subtitle={metrics?.platform || 'Linux'}
                    color="#17a2b8"
                />
            </div>

            {/* Charts & Actions Row */}
            <div className="dashboard-row">
                <Card className="network-card" title="Network I/O">
                    <ResponsiveContainer width="100%" height={150}>
                        <AreaChart data={networkData}>
                            <defs>
                                <linearGradient id="networkGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#0066ff" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#0066ff" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="time" hide />
                            <YAxis hide />
                            <Tooltip
                                contentStyle={{
                                    background: 'var(--color-bg-elevated)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius-md)',
                                }}
                                labelStyle={{ color: 'var(--color-text-secondary)' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#0066ff"
                                strokeWidth={2}
                                fill="url(#networkGradient)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                    <div className="network-stats">
                        <div className="network-stat">
                            <Text type="secondary">↑ Upload</Text>
                            <Text strong>{formatBytes(metrics?.network.bytesSent || 0)}</Text>
                        </div>
                        <div className="network-stat">
                            <Text type="secondary">↓ Download</Text>
                            <Text strong>{formatBytes(metrics?.network.bytesRecv || 0)}</Text>
                        </div>
                    </div>
                </Card>

                <QuickActions />
            </div>

            {/* Services & Activity Row */}
            <div className="dashboard-row">
                <ServicesStatus />
                <ActivityFeed />
            </div>

            {/* System Info */}
            <Card className="system-info-card" title="System Information">
                <div className="system-info-grid">
                    <div className="system-info-item">
                        <Text type="secondary">Uptime</Text>
                        <Text strong>{formatUptime(metrics?.uptime || 0)}</Text>
                    </div>
                    <div className="system-info-item">
                        <Text type="secondary">OS</Text>
                        <Text strong>Ubuntu 22.04 LTS</Text>
                    </div>
                    <div className="system-info-item">
                        <Text type="secondary">Kernel</Text>
                        <Text strong>5.15.0-91-generic</Text>
                    </div>
                    <div className="system-info-item">
                        <Text type="secondary">Panel Version</Text>
                        <Text strong>Biz-Panel v1.0.0</Text>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default Dashboard;
