/**
 * Databases Page - Full CRUD with Edit and Details
 */
import React, { useState } from 'react';
import {
    Typography,
    Card,
    Button,
    Tag,
    Spin,
    Table,
    Modal,
    Form,
    Toast,
    Input,
    Popconfirm,
    SideSheet,
    Descriptions,
} from '@douyinfe/semi-ui';
import {
    IconPlus,
    IconSearch,
    IconRefresh,
    IconDelete,
    IconEdit,
    IconEyeOpened,
} from '@douyinfe/semi-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getDatabases,
    createDatabase,
    updateDatabase,
    deleteDatabase,
    type Database,
    formatBytes,
} from '../services/api';
import './Databases.css';

const { Title, Text } = Typography;

const Databases: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [detailsVisible, setDetailsVisible] = useState(false);
    const [selectedDB, setSelectedDB] = useState<Database | null>(null);
    const queryClient = useQueryClient();

    const { data: databases = [], isLoading } = useQuery({
        queryKey: ['databases'],
        queryFn: getDatabases,
    });

    const createMutation = useMutation({
        mutationFn: createDatabase,
        onSuccess: () => {
            Toast.success('Database created successfully!');
            queryClient.invalidateQueries({ queryKey: ['databases'] });
            setCreateModalVisible(false);
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Database> }) => updateDatabase(id, data),
        onSuccess: () => {
            Toast.success('Database updated successfully!');
            queryClient.invalidateQueries({ queryKey: ['databases'] });
            setEditModalVisible(false);
            setSelectedDB(null);
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteDatabase,
        onSuccess: () => {
            Toast.success('Database deleted!');
            queryClient.invalidateQueries({ queryKey: ['databases'] });
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const filteredDatabases = databases.filter(db =>
        db.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreate = (values: Record<string, unknown>) => {
        createMutation.mutate({
            name: values.name as string,
            engine: values.engine as Database['engine'],
            charset: (values.charset as string) || 'utf8mb4',
        });
    };

    const handleEdit = (values: Record<string, unknown>) => {
        if (!selectedDB) return;
        updateMutation.mutate({
            id: selectedDB.id,
            data: {
                name: values.name as string,
                charset: values.charset as string,
            },
        });
    };

    const openEdit = (db: Database) => {
        setSelectedDB(db);
        setEditModalVisible(true);
    };

    const openDetails = (db: Database) => {
        setSelectedDB(db);
        setDetailsVisible(true);
    };

    const getEngineIcon = (engine: string) => {
        const icons: Record<string, string> = {
            mysql: '🐬',
            postgresql: '🐘',
            mongodb: '🍃',
            redis: '🔴',
        };
        return icons[engine] || '📦';
    };

    const columns = [
        {
            title: 'Database',
            dataIndex: 'name',
            key: 'name',
            render: (name: string, record: Database) => (
                <div className="db-name">
                    <span className="db-icon">{getEngineIcon(record.engine)}</span>
                    <div>
                        <Text strong>{name}</Text>
                        <br />
                        <Text type="tertiary" size="small">{record.engine.toUpperCase()}</Text>
                    </div>
                </div>
            ),
        },
        {
            title: 'Engine',
            dataIndex: 'engine',
            key: 'engine',
            render: (engine: string) => (
                <Tag color={
                    engine === 'mysql' ? 'blue' :
                        engine === 'postgresql' ? 'cyan' :
                            engine === 'mongodb' ? 'green' :
                                'red'
                }>
                    {engine.toUpperCase()}
                </Tag>
            ),
            width: 120,
        },
        {
            title: 'Size',
            dataIndex: 'size',
            key: 'size',
            render: (size: number) => formatBytes(size),
            width: 100,
        },
        {
            title: 'Tables',
            dataIndex: 'tables',
            key: 'tables',
            render: (tables: number) => tables || '-',
            width: 80,
        },
        {
            title: 'Charset',
            dataIndex: 'charset',
            key: 'charset',
            render: (charset: string) => charset || 'utf8mb4',
            width: 100,
        },
        {
            title: 'Created',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => new Date(date).toLocaleDateString(),
            width: 120,
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 150,
            render: (_: unknown, record: Database) => (
                <div className="table-actions">
                    <Button
                        icon={<IconEyeOpened />}
                        theme="borderless"
                        size="small"
                        onClick={() => openDetails(record)}
                    />
                    <Button
                        icon={<IconEdit />}
                        theme="borderless"
                        size="small"
                        onClick={() => openEdit(record)}
                    />
                    <Popconfirm
                        title="Delete this database?"
                        content="This action cannot be undone. All data will be lost."
                        onConfirm={() => deleteMutation.mutate(record.id)}
                    >
                        <Button
                            icon={<IconDelete />}
                            theme="borderless"
                            size="small"
                            type="danger"
                        />
                    </Popconfirm>
                </div>
            ),
        },
    ];

    // Stats
    const totalSize = databases.reduce((acc, db) => acc + (db.size || 0), 0);
    const engineCounts = databases.reduce((acc, db) => {
        acc[db.engine] = (acc[db.engine] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

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
                    <Title heading={3} className="page-title">🗄️ Databases</Title>
                    <Text type="secondary" className="page-subtitle">
                        Manage your database instances
                    </Text>
                </div>
                <div className="header-actions">
                    <Button
                        icon={<IconRefresh />}
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['databases'] })}
                    >
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

            {/* Stats */}
            <div className="db-stats">
                <Card className="stat-card">
                    <div className="stat-value">{databases.length}</div>
                    <div className="stat-label">Total Databases</div>
                </Card>
                <Card className="stat-card">
                    <div className="stat-value">{formatBytes(totalSize)}</div>
                    <div className="stat-label">Total Size</div>
                </Card>
                {Object.entries(engineCounts).map(([engine, count]) => (
                    <Card key={engine} className="stat-card">
                        <div className="stat-value">{count}</div>
                        <div className="stat-label">{getEngineIcon(engine)} {engine.toUpperCase()}</div>
                    </Card>
                ))}
            </div>

            {/* Search */}
            <Card className="search-card">
                <Input
                    prefix={<IconSearch />}
                    placeholder="Search databases..."
                    value={searchTerm}
                    onChange={setSearchTerm}
                    showClear
                    style={{ width: 300 }}
                />
            </Card>

            {/* Table */}
            <Card className="db-table-card">
                <Table
                    columns={columns}
                    dataSource={filteredDatabases}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    className="db-table"
                />
            </Card>

            {/* Create Modal */}
            <Modal
                title="Create Database"
                visible={createModalVisible}
                onCancel={() => setCreateModalVisible(false)}
                footer={null}
                width={450}
            >
                <Form onSubmit={handleCreate} labelPosition="left" labelWidth={100}>
                    <Form.Input
                        field="name"
                        label="Name"
                        placeholder="my_database"
                        rules={[
                            { required: true, message: 'Name is required' },
                            { pattern: /^[a-z][a-z0-9_]*$/, message: 'Lowercase letters, numbers, underscores only' },
                        ]}
                    />
                    <Form.Select
                        field="engine"
                        label="Engine"
                        initValue="mysql"
                        optionList={[
                            { value: 'mysql', label: '🐬 MySQL' },
                            { value: 'postgresql', label: '🐘 PostgreSQL' },
                            { value: 'mongodb', label: '🍃 MongoDB' },
                            { value: 'redis', label: '🔴 Redis' },
                        ]}
                        rules={[{ required: true }]}
                    />
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
                    <div style={{ marginTop: 24, textAlign: 'right' }}>
                        <Button onClick={() => setCreateModalVisible(false)} style={{ marginRight: 8 }}>
                            Cancel
                        </Button>
                        <Button
                            htmlType="submit"
                            theme="solid"
                            type="primary"
                            loading={createMutation.isPending}
                        >
                            Create
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* Edit Modal */}
            <Modal
                title="Edit Database"
                visible={editModalVisible}
                onCancel={() => {
                    setEditModalVisible(false);
                    setSelectedDB(null);
                }}
                footer={null}
                width={450}
            >
                {selectedDB && (
                    <Form
                        onSubmit={handleEdit}
                        initValues={{
                            name: selectedDB.name,
                            charset: selectedDB.charset || 'utf8mb4',
                        }}
                        labelPosition="left"
                        labelWidth={100}
                    >
                        <Form.Input
                            field="name"
                            label="Name"
                            rules={[{ required: true }]}
                        />
                        <div style={{ marginBottom: 16 }}>
                            <Text type="secondary">Engine: </Text>
                            <Tag>{getEngineIcon(selectedDB.engine)} {selectedDB.engine.toUpperCase()}</Tag>
                            <Text type="tertiary" size="small"> (cannot be changed)</Text>
                        </div>
                        <Form.Select
                            field="charset"
                            label="Charset"
                            optionList={[
                                { value: 'utf8mb4', label: 'utf8mb4' },
                                { value: 'utf8', label: 'utf8' },
                                { value: 'latin1', label: 'latin1' },
                            ]}
                        />
                        <div style={{ marginTop: 24, textAlign: 'right' }}>
                            <Button onClick={() => setEditModalVisible(false)} style={{ marginRight: 8 }}>
                                Cancel
                            </Button>
                            <Button
                                htmlType="submit"
                                theme="solid"
                                type="primary"
                                loading={updateMutation.isPending}
                            >
                                Save Changes
                            </Button>
                        </div>
                    </Form>
                )}
            </Modal>

            {/* Details SideSheet */}
            <SideSheet
                title={`Database: ${selectedDB?.name || ''}`}
                visible={detailsVisible}
                onCancel={() => {
                    setDetailsVisible(false);
                    setSelectedDB(null);
                }}
                width={450}
            >
                {selectedDB && (
                    <div className="db-details">
                        <div className="db-details-header">
                            <span className="details-icon">{getEngineIcon(selectedDB.engine)}</span>
                            <div>
                                <Title heading={4}>{selectedDB.name}</Title>
                                <Tag color="blue">{selectedDB.engine.toUpperCase()}</Tag>
                            </div>
                        </div>
                        <Descriptions
                            data={[
                                { key: 'Name', value: selectedDB.name },
                                { key: 'Engine', value: selectedDB.engine.toUpperCase() },
                                { key: 'Size', value: formatBytes(selectedDB.size) },
                                { key: 'Tables', value: selectedDB.tables || 0 },
                                { key: 'Charset', value: selectedDB.charset || 'utf8mb4' },
                                { key: 'Created', value: new Date(selectedDB.createdAt).toLocaleString() },
                            ]}
                            style={{ marginTop: 24 }}
                        />
                        <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
                            <Button onClick={() => {
                                setDetailsVisible(false);
                                openEdit(selectedDB);
                            }}>
                                Edit
                            </Button>
                            <Button onClick={() => Toast.info('Export functionality coming soon!')}>
                                Export
                            </Button>
                            <Button onClick={() => Toast.info('phpMyAdmin/pgAdmin integration coming soon!')}>
                                Open Admin
                            </Button>
                        </div>
                    </div>
                )}
            </SideSheet>
        </div>
    );
};

export default Databases;
