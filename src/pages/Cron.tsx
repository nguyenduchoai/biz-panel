/**
 * Cron Jobs Page - Real API Integration
 * Manage scheduled tasks with cron expression builder
 */
import React, { useState } from 'react';
import {
    Typography,
    Card,
    Button,
    Table,
    Tag,
    Modal,
    Form,
    Toast,
    Popconfirm,
    Spin,
} from '@douyinfe/semi-ui';
import {
    IconPlus,
    IconRefresh,
    IconPlay,
    IconDelete,
    IconEdit,
} from '@douyinfe/semi-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getCronjobs,
    createCronjob,
    updateCronjob,
    deleteCronjob,
    runCronjob,
    type Cronjob,
} from '../services/api';
import './Cron.css';

const { Title, Text } = Typography;

const Cron: React.FC = () => {
    const [modalVisible, setModalVisible] = useState(false);
    const [editingJob, setEditingJob] = useState<Cronjob | null>(null);
    const queryClient = useQueryClient();

    const { data: cronjobs = [], isLoading } = useQuery({
        queryKey: ['cronjobs'],
        queryFn: getCronjobs,
    });

    const createMutation = useMutation({
        mutationFn: createCronjob,
        onSuccess: () => {
            Toast.success('Cronjob created');
            queryClient.invalidateQueries({ queryKey: ['cronjobs'] });
            setModalVisible(false);
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Cronjob> }) => updateCronjob(id, data),
        onSuccess: () => {
            Toast.success('Cronjob updated');
            queryClient.invalidateQueries({ queryKey: ['cronjobs'] });
            setModalVisible(false);
            setEditingJob(null);
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteCronjob,
        onSuccess: () => {
            Toast.success('Cronjob deleted');
            queryClient.invalidateQueries({ queryKey: ['cronjobs'] });
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const runMutation = useMutation({
        mutationFn: runCronjob,
        onSuccess: () => {
            Toast.success('Cronjob executed');
            queryClient.invalidateQueries({ queryKey: ['cronjobs'] });
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const handleSubmit = (values: Record<string, unknown>) => {
        const data: Partial<Cronjob> = {
            name: values.name as string,
            schedule: values.schedule as string,
            command: values.command as string,
            type: (values.type as 'command' | 'script' | 'url') || 'command',
            enabled: values.enabled !== false,
        };

        if (editingJob) {
            updateMutation.mutate({ id: editingJob.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const openEditModal = (job: Cronjob) => {
        setEditingJob(job);
        setModalVisible(true);
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: Cronjob) => (
                <div>
                    <Text strong>{text}</Text>
                    <br />
                    <Text type="tertiary" size="small">{record.command}</Text>
                </div>
            ),
        },
        {
            title: 'Schedule',
            dataIndex: 'schedule',
            key: 'schedule',
            render: (text: string) => <code className="cron-schedule">{text}</code>,
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: (type: string) => (
                <Tag>{type === 'command' ? '💻 Command' : type === 'script' ? '📜 Script' : '🌐 URL'}</Tag>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'enabled',
            key: 'enabled',
            render: (enabled: boolean, record: Cronjob) => (
                <div>
                    <Tag color={enabled ? 'green' : 'grey'}>
                        {enabled ? '● Active' : '○ Disabled'}
                    </Tag>
                    {record.lastStatus && (
                        <Tag color={record.lastStatus === 'success' ? 'green' : 'red'} style={{ marginLeft: 4 }}>
                            {record.lastStatus === 'success' ? '✓' : '✗'}
                        </Tag>
                    )}
                </div>
            ),
        },
        {
            title: 'Last Run',
            dataIndex: 'lastRun',
            key: 'lastRun',
            render: (date: string) => date ? new Date(date).toLocaleString() : 'Never',
        },
        {
            title: 'Next Run',
            dataIndex: 'nextRun',
            key: 'nextRun',
            render: (date: string) => date ? new Date(date).toLocaleString() : '-',
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: unknown, record: Cronjob) => (
                <div className="table-actions">
                    <Button
                        icon={<IconPlay />}
                        theme="borderless"
                        size="small"
                        onClick={() => runMutation.mutate(record.id)}
                        loading={runMutation.isPending}
                    />
                    <Button
                        icon={<IconEdit />}
                        theme="borderless"
                        size="small"
                        onClick={() => openEditModal(record)}
                    />
                    <Popconfirm
                        title="Delete this cronjob?"
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

    if (isLoading) {
        return (
            <div className="loading-container">
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className="cron-page page-enter">
            <div className="page-header">
                <div>
                    <Title heading={3} className="page-title">⏰ Cron Jobs</Title>
                    <Text type="secondary" className="page-subtitle">
                        Schedule and manage recurring tasks
                    </Text>
                </div>
                <div className="header-actions">
                    <Button
                        icon={<IconRefresh />}
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['cronjobs'] })}
                    >
                        Refresh
                    </Button>
                    <Button
                        icon={<IconPlus />}
                        theme="solid"
                        type="primary"
                        onClick={() => {
                            setEditingJob(null);
                            setModalVisible(true);
                        }}
                    >
                        Add Cronjob
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="cron-stats">
                <Card className="stat-card">
                    <div className="stat-value">{cronjobs.length}</div>
                    <div className="stat-label">Total Jobs</div>
                </Card>
                <Card className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-success)' }}>
                        {cronjobs.filter(j => j.enabled).length}
                    </div>
                    <div className="stat-label">Active</div>
                </Card>
                <Card className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-warning)' }}>
                        {cronjobs.filter(j => j.lastStatus === 'failed').length}
                    </div>
                    <div className="stat-label">Failed</div>
                </Card>
            </div>

            {/* Table */}
            <Card className="cron-table-card">
                <Table
                    columns={columns}
                    dataSource={cronjobs}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    className="cron-table"
                />
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                title={editingJob ? 'Edit Cronjob' : 'Add Cronjob'}
                visible={modalVisible}
                onCancel={() => {
                    setModalVisible(false);
                    setEditingJob(null);
                }}
                footer={null}
                width={600}
            >
                <Form
                    onSubmit={handleSubmit}
                    initValues={editingJob ? { ...editingJob } as Record<string, unknown> : { type: 'command', enabled: true }}
                    labelPosition="left"
                    labelWidth={100}
                >
                    <Form.Input
                        field="name"
                        label="Name"
                        placeholder="Daily backup"
                        rules={[{ required: true, message: 'Name is required' }]}
                    />
                    <Form.Input
                        field="schedule"
                        label="Schedule"
                        placeholder="0 0 * * * (cron expression)"
                        rules={[{ required: true, message: 'Schedule is required' }]}
                        extraText="Format: minute hour day month weekday"
                    />
                    <Form.Select
                        field="type"
                        label="Type"
                        optionList={[
                            { value: 'command', label: '💻 Command' },
                            { value: 'script', label: '📜 Script' },
                            { value: 'url', label: '🌐 URL' },
                        ]}
                    />
                    <Form.TextArea
                        field="command"
                        label="Command"
                        placeholder="/usr/bin/backup.sh"
                        rules={[{ required: true, message: 'Command is required' }]}
                        rows={3}
                    />
                    <Form.Switch field="enabled" label="Enabled" />
                    <div style={{ marginTop: 24, textAlign: 'right' }}>
                        <Button onClick={() => setModalVisible(false)} style={{ marginRight: 8 }}>
                            Cancel
                        </Button>
                        <Button
                            htmlType="submit"
                            theme="solid"
                            type="primary"
                            loading={createMutation.isPending || updateMutation.isPending}
                        >
                            {editingJob ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div >
    );
};

export default Cron;
