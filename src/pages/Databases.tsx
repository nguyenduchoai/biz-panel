/**
 * Databases Page
 */
import React, { useState } from 'react';
import { Typography, Card, Button, Tag, Spin, Table, Modal, Form, Toast } from '@douyinfe/semi-ui';
import { IconPlus, IconSearch, IconRefresh, IconSetting } from '@douyinfe/semi-icons';
import { useQuery } from '@tanstack/react-query';
import { getDatabases } from '../services/mockApi';
import type { DatabaseEngine } from '../types';
import './Databases.css';

const { Title, Text } = Typography;

const Databases: React.FC = () => {
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [selectedEngine, setSelectedEngine] = useState<DatabaseEngine>('mysql');

    const { data: databases, isLoading } = useQuery({
        queryKey: ['databases'],
        queryFn: getDatabases,
    });

    const getEngineIcon = (engine: DatabaseEngine) => {
        switch (engine) {
            case 'mysql': return '🐬';
            case 'postgresql': return '🐘';
            case 'mongodb': return '🍃';
            case 'redis': return '🔴';
            default: return '🗄️';
        }
    };

    const getEngineLabel = (engine: DatabaseEngine) => {
        switch (engine) {
            case 'mysql': return 'MySQL';
            case 'postgresql': return 'PostgreSQL';
            case 'mongodb': return 'MongoDB';
            case 'redis': return 'Redis';
            default: return engine;
        }
    };

    const getStatusColor = (status: string) => {
        return status === 'running' ? 'green' : 'red';
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const handleCreate = () => {
        Toast.success('Database created successfully!');
        setCreateModalVisible(false);
    };

    const columns = [
        { title: 'Name', dataIndex: 'name', key: 'name' },
        {
            title: 'Size',
            dataIndex: 'size',
            key: 'size',
            render: (size: number) => formatBytes(size)
        },
        {
            title: 'Tables/Keys',
            dataIndex: 'tables',
            key: 'tables',
            render: (_: unknown, record: { tables?: number; keys?: number }) => record.tables || record.keys || '-'
        },
        { title: 'Charset', dataIndex: 'charset', key: 'charset', render: (v: string) => v || '-' },
        {
            title: 'Actions',
            key: 'actions',
            render: () => (
                <div className="table-actions">
                    <Button icon={<IconSearch />} theme="borderless" size="small" title="Browse" />
                    <Button icon="💾" theme="borderless" size="small" title="Backup" />
                    <Button icon="🗑️" theme="borderless" size="small" type="danger" title="Delete" />
                </div>
            )
        }
    ];

    if (isLoading) {
        return (
            <div className="loading-container">
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className="databases-page page-enter">
            <div className="page-header">
                <div>
                    <Title heading={3} className="page-title">Databases</Title>
                    <Text type="secondary" className="page-subtitle">
                        Manage your database servers and instances
                    </Text>
                </div>
                <div className="page-actions">
                    <Button icon={<IconPlus />} onClick={() => { setSelectedEngine('mysql'); setCreateModalVisible(true); }}>
                        MySQL
                    </Button>
                    <Button icon={<IconPlus />} onClick={() => { setSelectedEngine('postgresql'); setCreateModalVisible(true); }}>
                        PostgreSQL
                    </Button>
                </div>
            </div>

            <div className="databases-list">
                {databases?.map((server) => (
                    <Card key={server.engine} className="database-card">
                        <div className="database-header">
                            <div className="database-info">
                                <span className="database-icon">{getEngineIcon(server.engine)}</span>
                                <div className="database-title">
                                    <Text strong className="database-name">
                                        {getEngineLabel(server.engine)} {server.version}
                                    </Text>
                                </div>
                            </div>
                            <Tag color={getStatusColor(server.status)} className="status-tag">
                                {server.status === 'running' ? '🟢 Running' : '🔴 Stopped'}
                            </Tag>
                        </div>

                        {server.status === 'running' && (
                            <>
                                <div className="database-stats">
                                    <div className="stat-item">
                                        <Text type="secondary">Memory</Text>
                                        <Text strong>{formatBytes(server.memory)}</Text>
                                    </div>
                                    <div className="stat-item">
                                        <Text type="secondary">Connections</Text>
                                        <Text strong>{server.connections.current}/{server.connections.max}</Text>
                                    </div>
                                    {server.metrics?.queriesPerSecond && (
                                        <div className="stat-item">
                                            <Text type="secondary">Queries/sec</Text>
                                            <Text strong>{server.metrics.queriesPerSecond}</Text>
                                        </div>
                                    )}
                                    {server.metrics?.transactionsPerSecond && (
                                        <div className="stat-item">
                                            <Text type="secondary">TPS</Text>
                                            <Text strong>{server.metrics.transactionsPerSecond}</Text>
                                        </div>
                                    )}
                                </div>

                                {server.databases.length > 0 && (
                                    <div className="database-list-section">
                                        <div className="section-header">
                                            <Text strong>Databases ({server.databases.length})</Text>
                                            <Button icon={<IconPlus />} size="small" theme="borderless">Create</Button>
                                        </div>
                                        <Table
                                            columns={columns}
                                            dataSource={server.databases}
                                            pagination={false}
                                            size="small"
                                            className="database-table"
                                        />
                                    </div>
                                )}

                                <div className="database-actions">
                                    <Button icon="📊" theme="borderless" size="small">phpMyAdmin</Button>
                                    <Button icon={<IconSetting />} theme="borderless" size="small">Config</Button>
                                    <Button icon="📜" theme="borderless" size="small">Slow Log</Button>
                                    <Button icon={<IconRefresh />} theme="borderless" size="small">Restart</Button>
                                </div>
                            </>
                        )}

                        {server.status === 'stopped' && (
                            <div className="database-stopped">
                                <Button icon="▶️" theme="solid" type="primary">Start</Button>
                            </div>
                        )}
                    </Card>
                ))}
            </div>

            {/* Create Modal */}
            <Modal
                title={`Create ${getEngineLabel(selectedEngine)} Database`}
                visible={createModalVisible}
                onCancel={() => setCreateModalVisible(false)}
                footer={
                    <>
                        <Button onClick={() => setCreateModalVisible(false)}>Cancel</Button>
                        <Button theme="solid" type="primary" onClick={handleCreate}>Create</Button>
                    </>
                }
            >
                <Form layout="vertical">
                    <Form.Input field="name" label="Database Name" placeholder="my_database" rules={[{ required: true }]} />
                    <Form.Input field="username" label="Username" placeholder="db_user" />
                    <Form.Input field="password" label="Password" type="password" mode="password" />
                    {selectedEngine === 'mysql' && (
                        <Form.Select field="charset" label="Charset" initValue="utf8mb4" optionList={[
                            { value: 'utf8mb4', label: 'utf8mb4 (Recommended)' },
                            { value: 'utf8', label: 'utf8' },
                            { value: 'latin1', label: 'latin1' },
                        ]} />
                    )}
                </Form>
            </Modal>
        </div>
    );
};

export default Databases;
