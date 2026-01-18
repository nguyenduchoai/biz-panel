/**
 * Docker Page
 */
import React, { useState } from 'react';
import { Typography, Card, Button, Tag, Progress, Spin, Tabs, TabPane, Modal, Input, Toast } from '@douyinfe/semi-ui';
import { IconPlus, IconRefresh, IconTerminal, IconFile, IconSetting } from '@douyinfe/semi-icons';
import { useQuery } from '@tanstack/react-query';
import { getContainers, getImages, getComposeStacks } from '../services/mockApi';
import type { Container } from '../types';
import './Docker.css';

const { Title, Text } = Typography;

const Docker: React.FC = () => {
    const [logsModalVisible, setLogsModalVisible] = useState(false);
    const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);

    const { data: containers, isLoading: loadingContainers } = useQuery({
        queryKey: ['containers'],
        queryFn: getContainers,
        refetchInterval: 10000,
    });

    const { data: images } = useQuery({
        queryKey: ['images'],
        queryFn: getImages,
    });

    const { data: stacks } = useQuery({
        queryKey: ['stacks'],
        queryFn: getComposeStacks,
    });

    const getStatusColor = (status: Container['status']) => {
        switch (status) {
            case 'running': return 'green';
            case 'paused': return 'orange';
            case 'exited': return 'red';
            case 'restarting': return 'blue';
            default: return 'grey';
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const getUptime = (startedAt: string) => {
        const start = new Date(startedAt);
        const now = new Date();
        const diff = now.getTime() - start.getTime();
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        if (days > 0) return `${days}d`;
        return `${hours}h`;
    };

    const handleViewLogs = (container: Container) => {
        setSelectedContainer(container);
        setLogsModalVisible(true);
    };

    const handleContainerAction = (action: string, container: Container) => {
        Toast.success(`${action} ${container.name} successfully!`);
    };

    if (loadingContainers) {
        return (
            <div className="loading-container">
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className="docker-page page-enter">
            <div className="page-header">
                <div>
                    <Title heading={3} className="page-title">Docker</Title>
                    <Text type="secondary" className="page-subtitle">
                        Container and image management
                    </Text>
                </div>
                <div className="page-actions">
                    <Button icon={<IconPlus />}>Run Container</Button>
                    <Button icon={<IconPlus />} theme="solid" type="primary">Deploy Compose</Button>
                </div>
            </div>

            <Tabs type="button" className="docker-tabs">
                <TabPane tab={`Containers (${containers?.length || 0})`} itemKey="containers">
                    <div className="docker-filters">
                        <Input
                            prefix={<span>🔍</span>}
                            placeholder="Filter containers..."
                            showClear
                            style={{ maxWidth: 300 }}
                        />
                        <Button icon={<IconRefresh />} theme="borderless">Refresh</Button>
                    </div>

                    <div className="containers-list">
                        {containers?.map((container) => (
                            <Card key={container.id} className="container-card">
                                <div className="container-header">
                                    <div className="container-info">
                                        <Text strong className="container-name">{container.name}</Text>
                                        <Text type="secondary" className="container-image">{container.image}</Text>
                                    </div>
                                    <Tag color={getStatusColor(container.status)} className="status-tag">
                                        {container.status === 'running' ? '🟢' : '🔴'} {container.status} ({getUptime(container.state.startedAt)})
                                    </Tag>
                                </div>

                                <div className="container-stats">
                                    <div className="stat-row">
                                        <div className="stat-item">
                                            <Text type="secondary" size="small">CPU</Text>
                                            <div className="stat-bar">
                                                <Progress
                                                    percent={container.stats.cpu}
                                                    showInfo={false}
                                                    style={{ width: 100 }}
                                                    stroke={container.stats.cpu > 80 ? '#ff3d00' : '#0066ff'}
                                                />
                                                <Text size="small">{container.stats.cpu}%</Text>
                                            </div>
                                        </div>
                                        <div className="stat-item">
                                            <Text type="secondary" size="small">Memory</Text>
                                            <div className="stat-bar">
                                                <Progress
                                                    percent={container.stats.memory.percentage}
                                                    showInfo={false}
                                                    style={{ width: 100 }}
                                                    stroke={container.stats.memory.percentage > 80 ? '#ff3d00' : '#00c853'}
                                                />
                                                <Text size="small">
                                                    {formatBytes(container.stats.memory.usage)}/{formatBytes(container.stats.memory.limit)}
                                                </Text>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="container-details">
                                    {container.ports.length > 0 && (
                                        <div className="detail-row">
                                            <Text type="secondary" size="small">Ports:</Text>
                                            <Text size="small">
                                                {container.ports.map(p => `${p.host}:${p.container}`).join(', ')}
                                            </Text>
                                        </div>
                                    )}
                                    {container.volumes.length > 0 && (
                                        <div className="detail-row">
                                            <Text type="secondary" size="small">Volumes:</Text>
                                            <Text size="small">
                                                {container.volumes.map(v => `${v.source} → ${v.destination}`).join(', ')}
                                            </Text>
                                        </div>
                                    )}
                                </div>

                                <div className="container-actions">
                                    <Button
                                        icon={<IconFile />}
                                        theme="borderless"
                                        size="small"
                                        onClick={() => handleViewLogs(container)}
                                    >
                                        Logs
                                    </Button>
                                    <Button icon={<IconTerminal />} theme="borderless" size="small">Shell</Button>
                                    <Button icon={<IconSetting />} theme="borderless" size="small">Inspect</Button>
                                    <Button
                                        icon={<IconRefresh />}
                                        theme="borderless"
                                        size="small"
                                        onClick={() => handleContainerAction('Restarted', container)}
                                    >
                                        Restart
                                    </Button>
                                    {container.status === 'running' ? (
                                        <Button
                                            icon="⏹️"
                                            theme="borderless"
                                            size="small"
                                            type="danger"
                                            onClick={() => handleContainerAction('Stopped', container)}
                                        >
                                            Stop
                                        </Button>
                                    ) : (
                                        <Button
                                            icon="▶️"
                                            theme="borderless"
                                            size="small"
                                            onClick={() => handleContainerAction('Started', container)}
                                        >
                                            Start
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                </TabPane>

                <TabPane tab={`Images (${images?.length || 0})`} itemKey="images">
                    <div className="images-list">
                        {images?.map((image) => (
                            <Card key={image.id} className="image-card">
                                <div className="image-info">
                                    <Text strong>{image.repository}:{image.tag}</Text>
                                    <div className="image-details">
                                        <Tag>{formatBytes(image.size)}</Tag>
                                        <Text type="secondary" size="small">{image.containers} containers</Text>
                                    </div>
                                </div>
                                <div className="image-actions">
                                    <Button theme="borderless" size="small">Run</Button>
                                    <Button theme="borderless" size="small" type="danger">Remove</Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </TabPane>

                <TabPane tab={`Stacks (${stacks?.length || 0})`} itemKey="stacks">
                    <div className="stacks-list">
                        {stacks?.map((stack) => (
                            <Card key={stack.name} className="stack-card">
                                <div className="stack-info">
                                    <span className="stack-icon">📦</span>
                                    <div>
                                        <Text strong>{stack.name}</Text>
                                        <Text type="secondary" size="small">{stack.path}</Text>
                                    </div>
                                </div>
                                <div className="stack-status">
                                    <Text size="small">{stack.runningServices}/{stack.services} services</Text>
                                    <Tag color={stack.status === 'running' ? 'green' : stack.status === 'partial' ? 'orange' : 'red'}>
                                        {stack.status}
                                    </Tag>
                                </div>
                                <div className="stack-actions">
                                    <Button theme="borderless" size="small">View</Button>
                                    <Button theme="borderless" size="small">Up</Button>
                                    <Button theme="borderless" size="small" type="danger">Down</Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </TabPane>

                <TabPane tab="Volumes" itemKey="volumes">
                    <div className="empty-state">
                        <Text type="secondary">Volume management coming soon</Text>
                    </div>
                </TabPane>

                <TabPane tab="Networks" itemKey="networks">
                    <div className="empty-state">
                        <Text type="secondary">Network management coming soon</Text>
                    </div>
                </TabPane>
            </Tabs>

            {/* Logs Modal */}
            <Modal
                title={`Logs: ${selectedContainer?.name || ''}`}
                visible={logsModalVisible}
                onCancel={() => setLogsModalVisible(false)}
                width={900}
                footer={null}
                className="logs-modal"
            >
                <div className="logs-container">
                    <pre className="logs-content">
                        {`2026-01-18 10:30:45 | 192.168.1.1 "GET /api/users" 200 0.023s
2026-01-18 10:30:46 | 192.168.1.1 "POST /api/orders" 201 0.045s
2026-01-18 10:30:47 | 192.168.1.2 "GET /health" 200 0.001s
2026-01-18 10:30:48 | [warn] upstream timed out (110: Connection timeout)
2026-01-18 10:30:49 | 192.168.1.1 "GET /api/products" 200 0.089s
2026-01-18 10:30:50 | 192.168.1.3 "GET /static/app.js" 200 0.012s
2026-01-18 10:30:51 | [error] connect() failed (111: Connection refused)
2026-01-18 10:30:52 | 192.168.1.1 "GET /api/users/123" 404 0.005s
● Streaming...`}
                    </pre>
                </div>
            </Modal>
        </div>
    );
};

export default Docker;
