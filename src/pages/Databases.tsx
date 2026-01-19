/**
 * Databases Page - Real API Integration
 */
import React, { useState } from 'react';
import { Typography, Card, Button, Tag, Spin, Table, Modal, Form, Toast, Input, Select } from '@douyinfe/semi-ui';
import { IconPlus, IconSearch, IconRefresh, IconDelete } from '@douyinfe/semi-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDatabases, createDatabase, deleteDatabase, type Database } from '../services/api';
import './Databases.css';

const { Title, Text } = Typography;

const Databases: React.FC = () => {
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [selectedEngine, setSelectedEngine] = useState<Database['engine']>('mysql');
    const [searchTerm, setSearchTerm] = useState('');
    const queryClient = useQueryClient();

    const { data: databases, isLoading } = useQuery({
        queryKey: ['databases'],
        queryFn: getDatabases,
    });

    const createMutation = useMutation({
        mutationFn: (data: Partial<Database>) => createDatabase(data),
        onSuccess: () => {
            Toast.success('Database created successfully!');
            setCreateModalVisible(false);
            queryClient.invalidateQueries({ queryKey: ['databases'] });
        },
        onError: (err: Error) => {
            Toast.error(err.message);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteDatabase(id),
        onSuccess: () => {
            Toast.success('Database deleted');
            queryClient.invalidateQueries({ queryKey: ['databases'] });
        },
        onError: (err: Error) => {
            Toast.error(err.message);
        },
    });

    const getEngineIcon = (engine: Database['engine']) => {
        switch (engine) {
            case 'mysql': return '🐬';
            case 'postgresql': return '🐘';
            case 'mongodb': return '🍃';
            case 'redis': return '🔴';
            default: return '🗄️';
        }
    };

    const getEngineLabel = (engine: Database['engine']) => {
        switch (engine) {
            case 'mysql': return 'MySQL';
            case 'postgresql': return 'PostgreSQL';
            case 'mongodb': return 'MongoDB';
            case 'redis': return 'Redis';
            default: return engine;
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const filteredDatabases = databases?.filter((db) =>
        db.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreate = (values: Record<string, unknown>) => {
        createMutation.mutate({
            name: values.name as string,
            engine: selectedEngine,
            charset: values.charset as string,
        });
    };

    const handleDelete = (db: Database) => {
        Modal.confirm({
            title: 'Delete Database',
            content: `Are you sure you want to delete "${db.name}"? This action cannot be undone.`,
            okType: 'danger',
            onOk: () => deleteMutation.mutate(db.id),
        });
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (name: string, record: Database) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{getEngineIcon(record.engine)}</span>
                    <Text strong>{name}</Text>
                </div>
            ),
        },
        {
            title: 'Engine',
            dataIndex: 'engine',
            key: 'engine',
            render: (engine: Database['engine']) => (
                <Tag color="blue">{getEngineLabel(engine)}</Tag>
            ),
        },
        {
            title: 'Size',
            dataIndex: 'size',
            key: 'size',
            render: (size: number) => formatBytes(size),
        },
        {
            title: 'Tables',
            dataIndex: 'tables',
            key: 'tables',
            render: (tables?: number) => tables ?? '-',
        },
        {
            title: 'Charset',
            dataIndex: 'charset',
            key: 'charset',
            render: (charset?: string) => charset ?? '-',
        },
        {
            title: 'Created',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => new Date(date).toLocaleDateString(),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 150,
            render: (_: unknown, record: Database) => (
                <div className="table-actions">
                    <Button icon={<IconSearch />} theme="borderless" size="small" title="Browse" />
                    <Button icon="💾" theme="borderless" size="small" title="Backup" />
                    <Button
                        icon={<IconDelete />}
                        theme="borderless"
                        size="small"
                        type="danger"
                        title="Delete"
                        onClick={() => handleDelete(record)}
                    />
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

    return (
        <div className="databases-page page-enter">
            <div className="page-header">
                <div>
                    <Title heading={3} className="page-title">Databases</Title>
                    <Text type="secondary" className="page-subtitle">
                        Manage your database instances ({databases?.length || 0} databases)
                    </Text>
                </div>
                <div className="page-actions">
                    <Button icon={<IconRefresh />} onClick={() => queryClient.invalidateQueries({ queryKey: ['databases'] })}>
                        Refresh
                    </Button>
                    <Button
                        icon={<IconPlus />}
                        theme="solid"
                        type="primary"
                        onClick={() => setCreateModalVisible(true)}
                    >
                        Create Database
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="databases-filters" style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <Input
                    prefix={<IconSearch />}
                    placeholder="Search databases..."
                    value={searchTerm}
                    onChange={setSearchTerm}
                    showClear
                    style={{ width: 300 }}
                />
                <Select
                    placeholder="Filter by engine"
                    style={{ width: 160 }}
                    onChange={(v) => setSelectedEngine(v as Database['engine'])}
                    optionList={[
                        { value: 'mysql', label: '🐬 MySQL' },
                        { value: 'postgresql', label: '🐘 PostgreSQL' },
                        { value: 'mongodb', label: '🍃 MongoDB' },
                        { value: 'redis', label: '🔴 Redis' },
                    ]}
                />
            </div>

            {/* Database Table */}
            <Card className="databases-card">
                <Table
                    columns={columns}
                    dataSource={filteredDatabases}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    className="databases-table"
                />
            </Card>

            {/* Create Modal */}
            <Modal
                title="Create Database"
                visible={createModalVisible}
                onCancel={() => setCreateModalVisible(false)}
                footer={null}
            >
                <Form layout="vertical" onSubmit={handleCreate}>
                    <Form.Input
                        field="name"
                        label="Database Name"
                        placeholder="my_database"
                        rules={[{ required: true, message: 'Name is required' }]}
                    />
                    <Form.Select
                        field="engine"
                        label="Engine"
                        initValue="mysql"
                        onChange={(v) => setSelectedEngine(v as Database['engine'])}
                        optionList={[
                            { value: 'mysql', label: '🐬 MySQL' },
                            { value: 'postgresql', label: '🐘 PostgreSQL' },
                            { value: 'mongodb', label: '🍃 MongoDB' },
                            { value: 'redis', label: '🔴 Redis' },
                        ]}
                    />
                    {(selectedEngine === 'mysql' || selectedEngine === 'postgresql') && (
                        <Form.Select
                            field="charset"
                            label="Charset"
                            initValue="utf8mb4"
                            optionList={[
                                { value: 'utf8mb4', label: 'utf8mb4 (Recommended)' },
                                { value: 'utf8', label: 'utf8' },
                                { value: 'latin1', label: 'latin1' },
                            ]}
                        />
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                        <Button onClick={() => setCreateModalVisible(false)}>Cancel</Button>
                        <Button
                            theme="solid"
                            type="primary"
                            htmlType="submit"
                            loading={createMutation.isPending}
                        >
                            Create
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default Databases;
