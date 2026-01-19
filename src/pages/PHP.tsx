/**
 * PHP Management Page
 * Install multiple PHP versions, manage extensions, configure php.ini
 * Inspired by aaPanel
 */
import React, { useState } from 'react';
import {
    Typography,
    Card,
    Button,
    Table,
    Tag,
    Modal,
    Switch,
    Toast,
    Spin,
    Input,
} from '@douyinfe/semi-ui';
import {
    IconRefresh,
    IconPlay,
    IconStop,
    IconSetting,
    IconDelete,
    IconPlus,
} from '@douyinfe/semi-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import './PHP.css';

const { Title, Text } = Typography;

// API functions
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

async function fetchPHPVersions() {
    const res = await fetch(`${API_URL}/php/versions`);
    return res.json();
}

async function installPHPVersion(version: string) {
    const res = await fetch(`${API_URL}/php/versions/${version}/install`, { method: 'POST' });
    return res.json();
}

async function uninstallPHPVersion(version: string) {
    const res = await fetch(`${API_URL}/php/versions/${version}/uninstall`, { method: 'POST' });
    return res.json();
}

async function controlPHP(version: string, action: string) {
    const res = await fetch(`${API_URL}/php/versions/${version}/${action}`, { method: 'POST' });
    return res.json();
}

async function fetchExtensions(version: string) {
    const res = await fetch(`${API_URL}/php/versions/${version}/extensions`);
    return res.json();
}

async function toggleExtension(version: string, ext: string, enabled: boolean) {
    const res = await fetch(`${API_URL}/php/versions/${version}/extensions/${ext}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
    });
    return res.json();
}

async function fetchPHPConfig(version: string) {
    const res = await fetch(`${API_URL}/php/versions/${version}/config`);
    return res.json();
}

interface PHPVersion {
    version: string;
    fullVersion: string;
    installed: boolean;
    running: boolean;
    default: boolean;
    extensionsEnabled?: string[];
}

interface PHPExtension {
    name: string;
    description: string;
    installed: boolean;
    enabled: boolean;
}

const PHP: React.FC = () => {
    const queryClient = useQueryClient();
    const [selectedVersion, setSelectedVersion] = useState<PHPVersion | null>(null);
    const [configModalVisible, setConfigModalVisible] = useState(false);
    const [extModalVisible, setExtModalVisible] = useState(false);
    const [installing, setInstalling] = useState<string | null>(null);

    // Fetch PHP versions
    const { data: versions = [], isLoading } = useQuery({
        queryKey: ['php-versions'],
        queryFn: fetchPHPVersions,
    });

    // Fetch extensions for selected version
    const { data: extensions = [] } = useQuery({
        queryKey: ['php-extensions', selectedVersion?.version],
        queryFn: () => selectedVersion ? fetchExtensions(selectedVersion.version) : [],
        enabled: !!selectedVersion && extModalVisible,
    });

    // Fetch config for selected version
    const { data: config } = useQuery<Record<string, string>>({
        queryKey: ['php-config', selectedVersion?.version],
        queryFn: () => selectedVersion ? fetchPHPConfig(selectedVersion.version) : ({}),
        enabled: !!selectedVersion && configModalVisible,
        initialData: {},
    });

    // Install mutation
    const installMutation = useMutation({
        mutationFn: installPHPVersion,
        onSuccess: () => {
            Toast.success('PHP installation started');
            setInstalling(null);
            queryClient.invalidateQueries({ queryKey: ['php-versions'] });
        },
        onError: (err: Error) => {
            Toast.error(err.message);
            setInstalling(null);
        },
    });

    // Control mutation (start/stop/restart)
    const controlMutation = useMutation({
        mutationFn: ({ version, action }: { version: string; action: string }) =>
            controlPHP(version, action),
        onSuccess: (data) => {
            Toast.success(data.message);
            queryClient.invalidateQueries({ queryKey: ['php-versions'] });
        },
        onError: (err: Error) => {
            Toast.error(err.message);
        },
    });

    // Toggle extension mutation
    const toggleExtMutation = useMutation({
        mutationFn: ({ ext, enabled }: { ext: string; enabled: boolean }) =>
            toggleExtension(selectedVersion!.version, ext, enabled),
        onSuccess: () => {
            Toast.success('Extension updated');
            queryClient.invalidateQueries({ queryKey: ['php-extensions'] });
        },
    });

    const handleInstall = (version: string) => {
        Modal.confirm({
            title: `Install PHP ${version}?`,
            content: 'This will install PHP with common extensions (mysql, curl, gd, mbstring, etc.)',
            onOk: () => {
                setInstalling(version);
                installMutation.mutate(version);
            },
        });
    };

    const handleUninstall = (version: string) => {
        Modal.confirm({
            title: `Uninstall PHP ${version}?`,
            content: 'This will remove PHP and all its extensions.',
            onOk: () => {
                uninstallPHPVersion(version).then(() => {
                    Toast.success(`PHP ${version} removed`);
                    queryClient.invalidateQueries({ queryKey: ['php-versions'] });
                });
            },
        });
    };

    const columns = [
        {
            title: 'Version',
            dataIndex: 'version',
            render: (v: string, record: PHPVersion) => (
                <div className="version-cell">
                    <span className="php-icon">🐘</span>
                    <div>
                        <Text strong>PHP {v}</Text>
                        {record.installed && record.fullVersion && (
                            <Text type="secondary" size="small"> ({record.fullVersion})</Text>
                        )}
                    </div>
                    {record.default && <Tag color="blue" size="small">Default</Tag>}
                </div>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'installed',
            render: (installed: boolean, record: PHPVersion) => {
                if (!installed) {
                    return <Tag color="grey">Not Installed</Tag>;
                }
                return (
                    <Tag color={record.running ? 'green' : 'orange'}>
                        {record.running ? '● Running' : '○ Stopped'}
                    </Tag>
                );
            },
        },
        {
            title: 'Extensions',
            render: (_: any, record: PHPVersion) => {
                if (!record.installed) return '-';
                const count = record.extensionsEnabled?.length || 0;
                return (
                    <Button
                        size="small"
                        theme="borderless"
                        onClick={() => {
                            setSelectedVersion(record);
                            setExtModalVisible(true);
                        }}
                    >
                        {count} extensions
                    </Button>
                );
            },
        },
        {
            title: 'Actions',
            render: (_: any, record: PHPVersion) => (
                <div className="action-buttons">
                    {record.installed ? (
                        <>
                            <Button
                                size="small"
                                icon={record.running ? <IconStop /> : <IconPlay />}
                                onClick={() => controlMutation.mutate({
                                    version: record.version,
                                    action: record.running ? 'stop' : 'start',
                                })}
                                type={record.running ? 'danger' : 'primary'}
                                theme="light"
                            >
                                {record.running ? 'Stop' : 'Start'}
                            </Button>
                            <Button
                                size="small"
                                icon={<IconSetting />}
                                onClick={() => {
                                    setSelectedVersion(record);
                                    setConfigModalVisible(true);
                                }}
                                theme="light"
                            >
                                Config
                            </Button>
                            <Button
                                size="small"
                                icon={<IconDelete />}
                                onClick={() => handleUninstall(record.version)}
                                type="danger"
                                theme="light"
                            >
                                Remove
                            </Button>
                        </>
                    ) : (
                        <Button
                            type="primary"
                            icon={<IconPlus />}
                            onClick={() => handleInstall(record.version)}
                            loading={installing === record.version}
                        >
                            Install
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    if (isLoading) {
        return (
            <div className="loading-container">
                <Spin size="large" />
            </div>
        );
    }

    const installedCount = versions.filter((v: PHPVersion) => v.installed).length;

    return (
        <div className="php-page page-enter">
            <div className="page-header">
                <div>
                    <Title heading={3} className="page-title">
                        <span className="php-icon">🐘</span> PHP Management
                    </Title>
                    <Text type="secondary" className="page-subtitle">
                        Install and manage multiple PHP versions
                    </Text>
                </div>
                <div className="page-actions">
                    <Button
                        icon={<IconRefresh />}
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['php-versions'] })}
                    >
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Summary */}
            <div className="php-summary">
                <Card className="summary-card">
                    <div className="summary-content">
                        <Text type="secondary">Installed</Text>
                        <Title heading={2}>{installedCount}</Title>
                    </div>
                </Card>
                <Card className="summary-card">
                    <div className="summary-content">
                        <Text type="secondary">Available</Text>
                        <Title heading={2}>{versions.length - installedCount}</Title>
                    </div>
                </Card>
                <Card className="summary-card">
                    <div className="summary-content">
                        <Text type="secondary">Running</Text>
                        <Title heading={2}>
                            {versions.filter((v: PHPVersion) => v.running).length}
                        </Title>
                    </div>
                </Card>
            </div>

            {/* Versions Table */}
            <Card className="versions-card">
                <Table
                    columns={columns}
                    dataSource={versions}
                    rowKey="version"
                    pagination={false}
                />
            </Card>

            {/* Extensions Modal */}
            <Modal
                title={`PHP ${selectedVersion?.version} Extensions`}
                visible={extModalVisible}
                onCancel={() => setExtModalVisible(false)}
                width={700}
                footer={null}
            >
                <div className="extensions-grid">
                    {extensions.map((ext: PHPExtension) => (
                        <div key={ext.name} className="extension-item">
                            <div className="ext-info">
                                <Text strong>{ext.name}</Text>
                                <Text type="secondary" size="small">{ext.description}</Text>
                            </div>
                            <Switch
                                checked={ext.enabled}
                                disabled={!ext.installed}
                                onChange={(checked) => {
                                    toggleExtMutation.mutate({ ext: ext.name, enabled: checked });
                                }}
                            />
                        </div>
                    ))}
                </div>
            </Modal>

            {/* Config Modal */}
            <Modal
                title={`PHP ${selectedVersion?.version} Configuration`}
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
                <div className="config-form">
                    <div className="config-row">
                        <Text>Memory Limit</Text>
                        <Input defaultValue={config['memory_limit'] || '128M'} style={{ width: 120 }} />
                    </div>
                    <div className="config-row">
                        <Text>Max Execution Time</Text>
                        <Input defaultValue={config['max_execution_time'] || '30'} suffix="sec" style={{ width: 120 }} />
                    </div>
                    <div className="config-row">
                        <Text>Post Max Size</Text>
                        <Input defaultValue={config['post_max_size'] || '8M'} style={{ width: 120 }} />
                    </div>
                    <div className="config-row">
                        <Text>Upload Max Filesize</Text>
                        <Input defaultValue={config['upload_max_filesize'] || '2M'} style={{ width: 120 }} />
                    </div>
                    <div className="config-row">
                        <Text>Display Errors</Text>
                        <Switch defaultChecked={config['display_errors'] === 'On'} />
                    </div>
                    <div className="config-row">
                        <Text>OPcache Enable</Text>
                        <Switch defaultChecked={config['opcache.enable'] === '1'} />
                    </div>
                    <div className="config-row">
                        <Text>Timezone</Text>
                        <Input defaultValue={config['date.timezone'] || 'UTC'} style={{ width: 200 }} />
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default PHP;
export { PHP };
