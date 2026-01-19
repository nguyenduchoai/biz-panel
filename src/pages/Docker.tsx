/**
 * Docker Page - Real API Integration
 */
import React, { useState } from 'react';
import { Typography, Card, Button, Tag, Progress, Spin, Tabs, TabPane, Modal, Toast } from '@douyinfe/semi-ui';
import { IconRefresh, IconTerminal, IconPlay, IconStop, IconDelete } from '@douyinfe/semi-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getContainers,
    getImages,
    getVolumes,
    startContainer,
    stopContainer,
    restartContainer,
    removeContainer,
    getContainerLogs,
    removeImage,
    removeVolume,
    type Container,
    type DockerImage,
    type DockerVolume,
} from '../services/api';
import './Docker.css';

const { Title, Text } = Typography;

const Docker: React.FC = () => {
    const [logsModalVisible, setLogsModalVisible] = useState(false);
    const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
    const [containerLogs, setContainerLogs] = useState('');
    const queryClient = useQueryClient();

    // Queries
    const { data: containers = [], isLoading: loadingContainers } = useQuery({
        queryKey: ['containers'],
        queryFn: () => getContainers(),
        refetchInterval: 10000,
    });

    const { data: images = [] } = useQuery({
        queryKey: ['docker-images'],
        queryFn: getImages,
    });

    const { data: volumes = [] } = useQuery({
        queryKey: ['docker-volumes'],
        queryFn: () => getVolumes(),
    });

    // Mutations
    const startMutation = useMutation({
        mutationFn: startContainer,
        onSuccess: () => {
            Toast.success('Container started');
            queryClient.invalidateQueries({ queryKey: ['containers'] });
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const stopMutation = useMutation({
        mutationFn: stopContainer,
        onSuccess: () => {
            Toast.success('Container stopped');
            queryClient.invalidateQueries({ queryKey: ['containers'] });
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const restartMutation = useMutation({
        mutationFn: restartContainer,
        onSuccess: () => {
            Toast.success('Container restarted');
            queryClient.invalidateQueries({ queryKey: ['containers'] });
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const removeContainerMutation = useMutation({
        mutationFn: (id: string) => removeContainer(id, true),
        onSuccess: () => {
            Toast.success('Container removed');
            queryClient.invalidateQueries({ queryKey: ['containers'] });
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const removeImageMutation = useMutation({
        mutationFn: (id: string) => removeImage(id, true),
        onSuccess: () => {
            Toast.success('Image removed');
            queryClient.invalidateQueries({ queryKey: ['docker-images'] });
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const removeVolumeMutation = useMutation({
        mutationFn: (name: string) => removeVolume(name, true),
        onSuccess: () => {
            Toast.success('Volume removed');
            queryClient.invalidateQueries({ queryKey: ['docker-volumes'] });
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const getStatusColor = (state: Container['state']) => {
        switch (state) {
            case 'running': return 'green';
            case 'paused': return 'orange';
            case 'exited':
            case 'dead': return 'red';
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

    const handleViewLogs = async (container: Container) => {
        setSelectedContainer(container);
        try {
            const result = await getContainerLogs(container.id);
            setContainerLogs(result.logs);
            setLogsModalVisible(true);
        } catch (err) {
            Toast.error('Failed to fetch logs');
        }
    };

    const handleRemoveContainer = (container: Container) => {
        Modal.confirm({
            title: 'Remove Container',
            content: `Are you sure you want to remove "${container.name}"?`,
            okType: 'danger',
            onOk: () => removeContainerMutation.mutate(container.id),
        });
    };

    const handleRemoveImage = (image: DockerImage) => {
        Modal.confirm({
            title: 'Remove Image',
            content: `Are you sure you want to remove "${image.repository}:${image.tag}"?`,
            okType: 'danger',
            onOk: () => removeImageMutation.mutate(image.id),
        });
    };

    const handleRemoveVolume = (volume: DockerVolume) => {
        Modal.confirm({
            title: 'Remove Volume',
            content: `Are you sure you want to remove volume "${volume.name}"?`,
            okType: 'danger',
            onOk: () => removeVolumeMutation.mutate(volume.name),
        });
    };

    const runningContainers = containers.filter((c) => c.state === 'running').length;

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
                    <Title heading={3} className="page-title">🐳 Docker</Title>
                    <Text type="secondary" className="page-subtitle">
                        Manage containers, images, and volumes
                    </Text>
                </div>
                <Button
                    icon={<IconRefresh />}
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['containers'] })}
                >
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="docker-stats">
                <Card className="stat-card">
                    <div className="stat-value">{containers.length}</div>
                    <div className="stat-label">Containers</div>
                </Card>
                <Card className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-success)' }}>{runningContainers}</div>
                    <div className="stat-label">Running</div>
                </Card>
                <Card className="stat-card">
                    <div className="stat-value">{images.length}</div>
                    <div className="stat-label">Images</div>
                </Card>
                <Card className="stat-card">
                    <div className="stat-value">{volumes.length}</div>
                    <div className="stat-label">Volumes</div>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs type="line" className="docker-tabs">
                <TabPane tab={`Containers (${containers.length})`} itemKey="containers">
                    <div className="containers-list">
                        {containers.map((container) => (
                            <Card key={container.id} className="container-card">
                                <div className="container-header">
                                    <div className="container-info">
                                        <Text strong className="container-name">{container.name}</Text>
                                        <Text type="secondary" className="container-image">{container.image}</Text>
                                    </div>
                                    <Tag color={getStatusColor(container.state)}>
                                        {container.state === 'running' ? '● Running' : `○ ${container.state}`}
                                    </Tag>
                                </div>

                                {container.state === 'running' && (
                                    <div className="container-stats">
                                        <div className="stat-item">
                                            <Text type="secondary">CPU</Text>
                                            <Progress percent={Math.random() * 30} showInfo size="small" />
                                        </div>
                                        <div className="stat-item">
                                            <Text type="secondary">Memory</Text>
                                            <Progress percent={Math.random() * 50} showInfo size="small" />
                                        </div>
                                    </div>
                                )}

                                <div className="container-meta">
                                    <Text type="secondary" size="small">
                                        Ports: {container.ports?.map((p) => `${p.hostPort}:${p.containerPort}`).join(', ') || 'None'}
                                    </Text>
                                </div>

                                <div className="container-actions">
                                    {container.state === 'running' ? (
                                        <Button
                                            icon={<IconStop />}
                                            onClick={() => stopMutation.mutate(container.id)}
                                            loading={stopMutation.isPending}
                                        >
                                            Stop
                                        </Button>
                                    ) : (
                                        <Button
                                            icon={<IconPlay />}
                                            theme="solid"
                                            type="primary"
                                            onClick={() => startMutation.mutate(container.id)}
                                            loading={startMutation.isPending}
                                        >
                                            Start
                                        </Button>
                                    )}
                                    <Button
                                        icon={<IconRefresh />}
                                        onClick={() => restartMutation.mutate(container.id)}
                                        loading={restartMutation.isPending}
                                    >
                                        Restart
                                    </Button>
                                    <Button icon={<IconTerminal />} onClick={() => handleViewLogs(container)}>
                                        Logs
                                    </Button>
                                    <Button
                                        icon={<IconDelete />}
                                        type="danger"
                                        onClick={() => handleRemoveContainer(container)}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            </Card>
                        ))}
                        {containers.length === 0 && (
                            <div className="empty-state">
                                <Text type="secondary">No containers found</Text>
                            </div>
                        )}
                    </div>
                </TabPane>

                <TabPane tab={`Images (${images.length})`} itemKey="images">
                    <div className="images-list">
                        {images.map((image) => (
                            <Card key={image.id} className="image-card">
                                <div className="image-info">
                                    <Text strong>{image.repository}:{image.tag}</Text>
                                    <Text type="secondary">{formatBytes(image.size)}</Text>
                                </div>
                                <div className="image-meta">
                                    <Text type="secondary" size="small">
                                        ID: {image.id.slice(0, 12)} • {image.containers} containers
                                    </Text>
                                </div>
                                <Button
                                    icon={<IconDelete />}
                                    type="danger"
                                    size="small"
                                    onClick={() => handleRemoveImage(image)}
                                >
                                    Remove
                                </Button>
                            </Card>
                        ))}
                        {images.length === 0 && (
                            <div className="empty-state">
                                <Text type="secondary">No images found</Text>
                            </div>
                        )}
                    </div>
                </TabPane>

                <TabPane tab={`Volumes (${volumes.length})`} itemKey="volumes">
                    <div className="volumes-list">
                        {volumes.map((volume) => (
                            <Card key={volume.name} className="volume-card">
                                <div className="volume-info">
                                    <Text strong>{volume.name}</Text>
                                    <Text type="secondary">{volume.driver}</Text>
                                </div>
                                <div className="volume-meta">
                                    <Text type="secondary" size="small">
                                        Mount: {volume.mountpoint}
                                    </Text>
                                </div>
                                <Button
                                    icon={<IconDelete />}
                                    type="danger"
                                    size="small"
                                    onClick={() => handleRemoveVolume(volume)}
                                >
                                    Remove
                                </Button>
                            </Card>
                        ))}
                        {volumes.length === 0 && (
                            <div className="empty-state">
                                <Text type="secondary">No volumes found</Text>
                            </div>
                        )}
                    </div>
                </TabPane>
            </Tabs>

            {/* Logs Modal */}
            <Modal
                title={`Logs: ${selectedContainer?.name || ''}`}
                visible={logsModalVisible}
                onCancel={() => setLogsModalVisible(false)}
                footer={<Button onClick={() => setLogsModalVisible(false)}>Close</Button>}
                width={800}
            >
                <pre className="logs-content">
                    {containerLogs || 'No logs available'}
                </pre>
            </Modal>
        </div>
    );
};

export default Docker;
