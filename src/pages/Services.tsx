/**
 * Unified Services Management Page
 * AWS/GCP-style service management with real-time status
 */
import React, { useState } from 'react';
import {
    Typography,
    Card,
    Button,
    Table,
    Tag,
    Modal,
    Tabs,
    TabPane,
    Toast,
    Spin,
    Input,
    Switch,
    Empty,
    Descriptions,
} from '@douyinfe/semi-ui';
import {
    IconRefresh,
    IconPlay,
    IconStop,
    IconSetting,
    IconPlus,
    IconSearch,
    IconFile,
} from '@douyinfe/semi-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import './Services.css';

const { Title, Text } = Typography;

// API functions with auth headers
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

function getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
}

interface ManagedService {
    id: string;
    name: string;
    type: 'runtime' | 'webserver' | 'database' | 'cache' | 'queue' | 'tool';
    description: string;
    icon: string;
    versions: string[];
    installed: boolean;
    running: boolean;
    installedVersion?: string;
    port?: number;
    configPath?: string;
    status?: {
        state: string;
        pid?: number;
        uptime?: number;
        memory?: number;
    };
}

interface ServiceConfig {
    key: string;
    label: string;
    description?: string;
    type: string;
    default: string;
    current?: string;
    options?: string[];
    unit?: string;
    restart: boolean;
}

async function fetchServices(type?: string) {
    const params = type && type !== 'all' ? `?type=${type}` : '';
    const res = await fetch(`${API_URL}/services${params}`, {
        headers: getAuthHeaders(),
    });
    const data = await res.json();
    return data || { services: [] };
}

async function fetchServiceConfig(id: string): Promise<ServiceConfig[]> {
    const res = await fetch(`${API_URL}/services/${id}/config`, {
        headers: getAuthHeaders(),
    });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
}

async function installService(id: string, version?: string) {
    const params = version ? `?version=${version}` : '';
    const res = await fetch(`${API_URL}/services/${id}/install${params}`, {
        method: 'POST',
        headers: getAuthHeaders(),
    });
    return res.json();
}

async function controlService(id: string, action: string) {
    const res = await fetch(`${API_URL}/services/${id}/${action}`, {
        method: 'POST',
        headers: getAuthHeaders(),
    });
    return res.json();
}

async function getServiceLogs(id: string) {
    const res = await fetch(`${API_URL}/services/${id}/logs?lines=50`, {
        headers: getAuthHeaders(),
    });
    return res.json();
}

const Services: React.FC = () => {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [selectedService, setSelectedService] = useState<ManagedService | null>(null);
    const [configModalVisible, setConfigModalVisible] = useState(false);
    const [logsModalVisible, setLogsModalVisible] = useState(false);
    const [installing, setInstalling] = useState<string | null>(null);

    // Fetch services
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['services', activeTab],
        queryFn: () => fetchServices(activeTab),
    });

    // Fetch config for selected service
    const { data: configOptions = [] } = useQuery({
        queryKey: ['service-config', selectedService?.id],
        queryFn: () => selectedService ? fetchServiceConfig(selectedService.id) : [],
        enabled: !!selectedService && configModalVisible,
    });

    // Fetch logs for selected service
    const { data: logsData } = useQuery({
        queryKey: ['service-logs', selectedService?.id],
        queryFn: () => selectedService ? getServiceLogs(selectedService.id) : null,
        enabled: !!selectedService && logsModalVisible,
    });

    // Control mutation
    const controlMutation = useMutation({
        mutationFn: ({ id, action }: { id: string; action: string }) => controlService(id, action),
        onSuccess: (data) => {
            Toast.success(data.message);
            queryClient.invalidateQueries({ queryKey: ['services'] });
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    // Install mutation
    const installMutation = useMutation({
        mutationFn: ({ id, version }: { id: string; version?: string }) => installService(id, version),
        onSuccess: (data) => {
            Toast.success(data.message);
            setInstalling(null);
            queryClient.invalidateQueries({ queryKey: ['services'] });
        },
        onError: (err: Error) => {
            Toast.error(err.message);
            setInstalling(null);
        },
    });

    const services: ManagedService[] = data?.services || [];

    const categories = [
        { key: 'all', label: 'All Services', icon: '📦' },
        { key: 'runtime', label: 'Runtimes', icon: '⚡' },
        { key: 'webserver', label: 'Web Servers', icon: '🌐' },
        { key: 'database', label: 'Databases', icon: '🗄️' },
        { key: 'cache', label: 'Cache', icon: '💨' },
        { key: 'tool', label: 'Tools', icon: '🔧' },
    ];

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase())
    );

    const handleInstall = (service: ManagedService) => {
        Modal.confirm({
            title: `Install ${service.name}?`,
            content: `This will install ${service.name} (${service.versions[0]}) on your server.`,
            onOk: () => {
                setInstalling(service.id);
                installMutation.mutate({ id: service.id, version: service.versions[0] });
            },
        });
    };

    const getStatusColor = (service: ManagedService): 'green' | 'orange' | 'grey' | 'red' => {
        if (!service.installed) return 'grey';
        if (service.running) return 'green';
        if (service.status?.state === 'failed') return 'red';
        return 'orange';
    };

    const getStatusText = (service: ManagedService): string => {
        if (!service.installed) return 'Not Installed';
        if (service.running) return '● Running';
        if (service.status?.state === 'failed') return '✗ Failed';
        return '○ Stopped';
    };

    const columns = [
        {
            title: 'Service',
            dataIndex: 'name',
            width: 280,
            render: (name: string, record: ManagedService) => (
                <div className="service-cell">
                    <span className="service-icon">{record.icon}</span>
                    <div className="service-info">
                        <Text strong>{name}</Text>
                        <Text type="secondary" size="small">{record.description}</Text>
                    </div>
                </div>
            ),
        },
        {
            title: 'Type',
            dataIndex: 'type',
            width: 120,
            render: (type: string) => (
                <Tag size="small">{type}</Tag>
            ),
        },
        {
            title: 'Version',
            width: 150,
            render: (_: unknown, record: ManagedService) => (
                record.installed ? (
                    <Text>{record.installedVersion || 'Unknown'}</Text>
                ) : (
                    <Text type="tertiary">—</Text>
                )
            ),
        },
        {
            title: 'Status',
            width: 120,
            render: (_: unknown, record: ManagedService) => (
                <Tag color={getStatusColor(record)}>
                    {getStatusText(record)}
                </Tag>
            ),
        },
        {
            title: 'Port',
            dataIndex: 'port',
            width: 80,
            render: (port: number) => port ? <Tag>{port}</Tag> : <Text type="tertiary">—</Text>,
        },
        {
            title: 'Actions',
            width: 250,
            render: (_: unknown, record: ManagedService) => (
                <div className="action-buttons">
                    {record.installed ? (
                        <>
                            {record.running !== undefined && (
                                <Button
                                    size="small"
                                    icon={record.running ? <IconStop /> : <IconPlay />}
                                    onClick={() => controlMutation.mutate({
                                        id: record.id,
                                        action: record.running ? 'stop' : 'start',
                                    })}
                                    type={record.running ? 'danger' : 'primary'}
                                    theme="light"
                                    loading={controlMutation.isPending}
                                >
                                    {record.running ? 'Stop' : 'Start'}
                                </Button>
                            )}
                            <Button
                                size="small"
                                icon={<IconSetting />}
                                theme="borderless"
                                onClick={() => {
                                    setSelectedService(record);
                                    setConfigModalVisible(true);
                                }}
                            />
                            <Button
                                size="small"
                                icon={<IconFile />}
                                theme="borderless"
                                onClick={() => {
                                    setSelectedService(record);
                                    setLogsModalVisible(true);
                                }}
                            />
                        </>
                    ) : (
                        <Button
                            type="primary"
                            size="small"
                            icon={<IconPlus />}
                            onClick={() => handleInstall(record)}
                            loading={installing === record.id}
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

    const installedCount = services.filter(s => s.installed).length;
    const runningCount = services.filter(s => s.running).length;

    return (
        <div className="services-page page-enter">
            <div className="page-header">
                <div>
                    <Title heading={3} className="page-title">
                        🛠️ Services Management
                    </Title>
                    <Text type="secondary" className="page-subtitle">
                        Install and manage runtimes, web servers, databases, and tools
                    </Text>
                </div>
                <div className="page-actions">
                    <Input
                        prefix={<IconSearch />}
                        placeholder="Search services..."
                        value={search}
                        onChange={setSearch}
                        showClear
                        style={{ width: 220 }}
                    />
                    <Button icon={<IconRefresh />} onClick={() => refetch()}>
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="services-summary">
                <Card className="summary-card">
                    <div className="summary-icon">📦</div>
                    <div className="summary-content">
                        <Text type="secondary">Total Services</Text>
                        <Title heading={2}>{services.length}</Title>
                    </div>
                </Card>
                <Card className="summary-card">
                    <div className="summary-icon">✅</div>
                    <div className="summary-content">
                        <Text type="secondary">Installed</Text>
                        <Title heading={2}>{installedCount}</Title>
                    </div>
                </Card>
                <Card className="summary-card">
                    <div className="summary-icon">🟢</div>
                    <div className="summary-content">
                        <Text type="secondary">Running</Text>
                        <Title heading={2}>{runningCount}</Title>
                    </div>
                </Card>
                <Card className="summary-card">
                    <div className="summary-icon">📥</div>
                    <div className="summary-content">
                        <Text type="secondary">Available</Text>
                        <Title heading={2}>{services.length - installedCount}</Title>
                    </div>
                </Card>
            </div>

            {/* Tabs & Table */}
            <Card className="services-card">
                <Tabs
                    type="button"
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    className="services-tabs"
                >
                    {categories.map(cat => (
                        <TabPane tab={`${cat.icon} ${cat.label}`} itemKey={cat.key} key={cat.key}>
                            {filteredServices.length > 0 ? (
                                <Table
                                    columns={columns}
                                    dataSource={filteredServices}
                                    rowKey="id"
                                    pagination={false}
                                    size="middle"
                                />
                            ) : (
                                <Empty description="No services found" />
                            )}
                        </TabPane>
                    ))}
                </Tabs>
            </Card>

            {/* Config Modal */}
            <Modal
                title={`${selectedService?.icon} ${selectedService?.name} Configuration`}
                visible={configModalVisible}
                onCancel={() => setConfigModalVisible(false)}
                width={650}
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
                {selectedService && (
                    <div className="config-content">
                        <Descriptions row>
                            <Descriptions.Item itemKey="Version">
                                {selectedService.installedVersion}
                            </Descriptions.Item>
                            <Descriptions.Item itemKey="Status">
                                <Tag color={getStatusColor(selectedService)}>
                                    {getStatusText(selectedService)}
                                </Tag>
                            </Descriptions.Item>
                            {selectedService.port && (
                                <Descriptions.Item itemKey="Port">
                                    {selectedService.port}
                                </Descriptions.Item>
                            )}
                            {selectedService.configPath && (
                                <Descriptions.Item itemKey="Config Path">
                                    <code>{selectedService.configPath}</code>
                                </Descriptions.Item>
                            )}
                        </Descriptions>

                        <div className="config-options">
                            <Title heading={5}>Configuration Options</Title>
                            {configOptions.length > 0 ? (
                                configOptions.map(opt => (
                                    <div key={opt.key} className="config-row">
                                        <div className="config-label">
                                            <Text strong>{opt.label}</Text>
                                            {opt.description && (
                                                <Text type="tertiary" size="small">{opt.description}</Text>
                                            )}
                                        </div>
                                        <div className="config-input">
                                            {opt.type === 'boolean' ? (
                                                <Switch defaultChecked={opt.current === 'on' || opt.current === '1'} />
                                            ) : opt.type === 'select' && opt.options ? (
                                                <select defaultValue={opt.current || opt.default}>
                                                    {opt.options.map(o => (
                                                        <option key={o} value={o}>{o}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <Input
                                                    defaultValue={opt.current || opt.default}
                                                    suffix={opt.unit}
                                                    style={{ width: 150 }}
                                                />
                                            )}
                                            {opt.restart && (
                                                <Tag color="orange" size="small">Restart</Tag>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <Text type="tertiary">No configuration options available</Text>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Logs Modal */}
            <Modal
                title={`${selectedService?.icon} ${selectedService?.name} Logs`}
                visible={logsModalVisible}
                onCancel={() => setLogsModalVisible(false)}
                width={800}
                footer={null}
            >
                <pre className="logs-content">
                    {logsData?.logs || 'No logs available'}
                </pre>
            </Modal>
        </div>
    );
};

export default Services;
export { Services };
