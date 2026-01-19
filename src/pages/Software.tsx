/**
 * Software Page - Install PHP, Node.js, Python, etc.
 * Inspired by aaPanel's software management
 * Uses real backend API
 */
import React, { useState } from 'react';
import {
    Typography,
    Card,
    Button,
    Tag,
    Tabs,
    TabPane,
    Modal,
    Progress,
    Toast,
    Input,
    Switch,
    Empty,
    Spin,
} from '@douyinfe/semi-ui';
import {
    IconSearch,
    IconRefresh,
    IconPlay,
    IconStop,
    IconDelete,
    IconSetting,
} from '@douyinfe/semi-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getSoftwareList,
    installSoftware,
    uninstallSoftware,
    controlService,
    type SoftwareItem
} from '../services/api';
import './Software.css';

const { Title, Text } = Typography;

const Software: React.FC = () => {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [installing, setInstalling] = useState<string | null>(null);
    const [installProgress, setInstallProgress] = useState(0);
    const [selectedSoftware, setSelectedSoftware] = useState<SoftwareItem | null>(null);
    const [configModalVisible, setConfigModalVisible] = useState(false);
    const [activeTab, setActiveTab] = useState('all');

    // Fetch software list
    const { data: softwareList = [], isLoading, refetch } = useQuery({
        queryKey: ['software'],
        queryFn: () => getSoftwareList(),
    });

    // Install mutation
    const installMutation = useMutation({
        mutationFn: ({ id, version }: { id: string; version?: string }) =>
            installSoftware(id, version),
        onSuccess: (data) => {
            Toast.success(data.message);
            // Simulate progress
            simulateProgress();
        },
        onError: (err: Error) => {
            Toast.error(err.message);
            setInstalling(null);
        },
    });

    // Uninstall mutation
    const uninstallMutation = useMutation({
        mutationFn: uninstallSoftware,
        onSuccess: () => {
            Toast.success('Software uninstalled');
            queryClient.invalidateQueries({ queryKey: ['software'] });
        },
        onError: (err: Error) => {
            Toast.error(err.message);
        },
    });

    // Service control mutation
    const serviceMutation = useMutation({
        mutationFn: ({ id, action }: { id: string; action: 'start' | 'stop' | 'restart' }) =>
            controlService(id, action),
        onSuccess: (data) => {
            Toast.success(data.message);
            queryClient.invalidateQueries({ queryKey: ['software'] });
        },
        onError: (err: Error) => {
            Toast.error(err.message);
        },
    });

    const simulateProgress = () => {
        setInstallProgress(0);
        const interval = setInterval(() => {
            setInstallProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setInstalling(null);
                    queryClient.invalidateQueries({ queryKey: ['software'] });
                    return 100;
                }
                return prev + 10;
            });
        }, 500);
    };

    const categories = [
        { key: 'all', label: 'All Software' },
        { key: 'runtime', label: 'Runtimes' },
        { key: 'webserver', label: 'Web Servers' },
        { key: 'database', label: 'Databases' },
        { key: 'cache', label: 'Cache' },
        { key: 'tools', label: 'Tools' },
    ];

    const filterSoftware = (category: string) => {
        let filtered = softwareList;

        if (category !== 'all') {
            filtered = filtered.filter(s => s.category === category);
        }

        if (search) {
            filtered = filtered.filter(s =>
                s.name.toLowerCase().includes(search.toLowerCase()) ||
                s.description.toLowerCase().includes(search.toLowerCase())
            );
        }

        return filtered;
    };

    const handleInstall = (software: SoftwareItem) => {
        setInstalling(software.id);
        installMutation.mutate({ id: software.id });
    };

    const handleUninstall = (software: SoftwareItem) => {
        Modal.confirm({
            title: `Uninstall ${software.name}?`,
            content: 'This will remove the software and all its configurations.',
            onOk: () => {
                uninstallMutation.mutate(software.id);
            },
        });
    };

    const handleToggleService = (software: SoftwareItem) => {
        const action = software.running ? 'stop' : 'start';
        serviceMutation.mutate({ id: software.id, action });
    };

    const renderSoftwareCard = (software: SoftwareItem) => (
        <Card key={software.id} className={`software-card ${software.installed ? 'installed' : ''}`}>
            <div className="software-header">
                <span className="software-icon">{software.icon}</span>
                <div className="software-info">
                    <Text strong className="software-name">{software.name}</Text>
                    <Text type="secondary" className="software-version">
                        {software.installed ? software.installedVersion : software.version}
                    </Text>
                </div>
                {software.installed && (
                    <Tag color={software.running ? 'green' : 'grey'} className="status-tag">
                        {software.running ? '● Running' : '○ Stopped'}
                    </Tag>
                )}
            </div>

            <Text type="secondary" className="software-desc">{software.description}</Text>

            {installing === software.id ? (
                <div className="install-progress">
                    <Progress percent={installProgress} showInfo />
                    <Text type="secondary">Installing...</Text>
                </div>
            ) : (
                <div className="software-actions">
                    {software.installed ? (
                        <>
                            {software.running !== undefined && (
                                <Button
                                    icon={software.running ? <IconStop /> : <IconPlay />}
                                    onClick={() => handleToggleService(software)}
                                    type={software.running ? 'danger' : 'primary'}
                                    theme="light"
                                    size="small"
                                    loading={serviceMutation.isPending}
                                >
                                    {software.running ? 'Stop' : 'Start'}
                                </Button>
                            )}
                            <Button
                                icon={<IconSetting />}
                                onClick={() => {
                                    setSelectedSoftware(software);
                                    setConfigModalVisible(true);
                                }}
                                theme="light"
                                size="small"
                            >
                                Config
                            </Button>
                            <Button
                                icon={<IconDelete />}
                                onClick={() => handleUninstall(software)}
                                type="danger"
                                theme="light"
                                size="small"
                                loading={uninstallMutation.isPending}
                            >
                                Uninstall
                            </Button>
                        </>
                    ) : (
                        <Button
                            type="primary"
                            onClick={() => handleInstall(software)}
                            loading={installMutation.isPending && installing === software.id}
                        >
                            Install
                        </Button>
                    )}
                </div>
            )}
        </Card>
    );

    if (isLoading) {
        return (
            <div className="loading-container">
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className="software-page page-enter">
            <div className="page-header">
                <div>
                    <Title heading={3} className="page-title">Software</Title>
                    <Text type="secondary" className="page-subtitle">
                        Install and manage PHP, Node.js, databases, and more
                    </Text>
                </div>
                <div className="page-actions">
                    <Input
                        prefix={<IconSearch />}
                        placeholder="Search software..."
                        value={search}
                        onChange={setSearch}
                        showClear
                        style={{ width: 250 }}
                    />
                    <Button icon={<IconRefresh />} onClick={() => refetch()}>
                        Refresh
                    </Button>
                </div>
            </div>

            <Tabs
                type="button"
                className="software-tabs"
                activeKey={activeTab}
                onChange={setActiveTab}
            >
                {categories.map(cat => (
                    <TabPane
                        tab={`${cat.label} (${filterSoftware(cat.key).length})`}
                        itemKey={cat.key}
                        key={cat.key}
                    >
                        <div className="software-grid">
                            {filterSoftware(cat.key).length > 0 ? (
                                filterSoftware(cat.key).map(renderSoftwareCard)
                            ) : (
                                <Empty description="No software found" />
                            )}
                        </div>
                    </TabPane>
                ))}
            </Tabs>

            {/* Configuration Modal */}
            <Modal
                title={`Configure ${selectedSoftware?.name || ''}`}
                visible={configModalVisible}
                onCancel={() => setConfigModalVisible(false)}
                width={600}
                footer={
                    <div className="modal-footer">
                        <Button onClick={() => setConfigModalVisible(false)}>Cancel</Button>
                        <Button type="primary" onClick={() => {
                            Toast.success('Configuration saved');
                            setConfigModalVisible(false);
                        }}>
                            Save Changes
                        </Button>
                    </div>
                }
            >
                {selectedSoftware && (
                    <div className="config-form">
                        <div className="config-section">
                            <Text strong>Service Status</Text>
                            <div className="config-row">
                                <Text>Auto-start on boot</Text>
                                <Switch defaultChecked />
                            </div>
                            <div className="config-row">
                                <Text>Enable service</Text>
                                <Switch defaultChecked={selectedSoftware.running} />
                            </div>
                        </div>

                        <div className="config-section">
                            <Text strong>Version Management</Text>
                            <div className="config-row">
                                <Text>Current version: {selectedSoftware.installedVersion || 'N/A'}</Text>
                            </div>
                            <div className="config-row">
                                <Text>Available versions:</Text>
                                <div className="version-tags">
                                    {selectedSoftware.availableVersions.map(v => (
                                        <Tag
                                            key={v}
                                            color={v === selectedSoftware.installedVersion ? 'blue' : 'grey'}
                                        >
                                            {v}
                                        </Tag>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {selectedSoftware.category === 'runtime' && (
                            <div className="config-section">
                                <Text strong>Extensions / Modules</Text>
                                <Text type="secondary">
                                    Manage extensions for {selectedSoftware.name}
                                </Text>
                                {selectedSoftware.id === 'php82' ? (
                                    <Button
                                        style={{ marginTop: 8 }}
                                        type="primary"
                                        theme="light"
                                        onClick={() => {
                                            setConfigModalVisible(false);
                                            window.location.href = '/php';
                                        }}
                                    >
                                        🐘 Manage PHP Extensions
                                    </Button>
                                ) : selectedSoftware.id === 'nodejs20' ? (
                                    <div style={{ marginTop: 8 }}>
                                        <Text type="tertiary" size="small">
                                            Use npm/yarn/pnpm to manage Node.js packages globally
                                        </Text>
                                        <pre style={{
                                            marginTop: 8,
                                            padding: 12,
                                            background: 'var(--color-bg-3)',
                                            borderRadius: 4,
                                            fontSize: 12
                                        }}>
                                            npm install -g package-name
                                        </pre>
                                    </div>
                                ) : selectedSoftware.id === 'python311' ? (
                                    <div style={{ marginTop: 8 }}>
                                        <Text type="tertiary" size="small">
                                            Use pip to manage Python packages
                                        </Text>
                                        <pre style={{
                                            marginTop: 8,
                                            padding: 12,
                                            background: 'var(--color-bg-3)',
                                            borderRadius: 4,
                                            fontSize: 12
                                        }}>
                                            pip install package-name
                                        </pre>
                                    </div>
                                ) : (
                                    <Button style={{ marginTop: 8 }} disabled>
                                        Manage Extensions
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Software;
export { Software };
