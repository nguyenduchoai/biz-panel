/**
 * Cron Jobs Page
 * Manage scheduled tasks with cron expression builder
 */
import React, { useState, useEffect } from 'react';
import {
    Typography,
    Card,
    Button,
    Table,
    Tag,
    Modal,
    Form,
    Switch,
    Space,
    Toast,
    Popconfirm,
    Empty,
} from '@douyinfe/semi-ui';
import {
    IconPlus,
    IconRefresh,
    IconPlay,
    IconDelete,
    IconEdit,
    IconHistory,
    IconTick,
    IconClose,
} from '@douyinfe/semi-icons';
import { getCronjobs } from '../services/mockApi';
import type { Cronjob } from '../types';
import './Cron.css';

const { Title, Text } = Typography;

// Cron presets
const CRON_PRESETS = [
    { value: '* * * * *', label: 'Every minute' },
    { value: '*/5 * * * *', label: 'Every 5 minutes' },
    { value: '*/15 * * * *', label: 'Every 15 minutes' },
    { value: '0 * * * *', label: 'Every hour' },
    { value: '0 */6 * * *', label: 'Every 6 hours' },
    { value: '0 0 * * *', label: 'Daily at midnight' },
    { value: '0 2 * * *', label: 'Daily at 2:00 AM' },
    { value: '0 0 * * 0', label: 'Weekly on Sunday' },
    { value: '0 0 1 * *', label: 'Monthly on 1st' },
];

// Parse cron expression to human readable
const parseCronExpression = (expr: string): string => {
    const preset = CRON_PRESETS.find((p) => p.value === expr);
    if (preset) return preset.label;

    const parts = expr.split(' ');
    if (parts.length !== 5) return expr;

    const [minute, hour, day, _month, weekday] = parts;

    // Simple parsing
    if (minute === '*' && hour === '*') return 'Every minute';
    if (minute.startsWith('*/')) return `Every ${minute.slice(2)} minutes`;
    if (hour.startsWith('*/')) return `Every ${hour.slice(2)} hours`;
    if (minute === '0' && hour !== '*' && day === '*') return `Daily at ${hour}:00`;
    if (weekday !== '*') return `Weekly on day ${weekday}`;

    return expr;
};

// Format date
const formatDate = (date: string): string => {
    return new Date(date).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const Cron: React.FC = () => {
    const [cronjobs, setCronjobs] = useState<Cronjob[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingJob, setEditingJob] = useState<Cronjob | null>(null);
    const [formApi, setFormApi] = useState<any>(null);

    // Fetch cronjobs
    const fetchCronjobs = async () => {
        setLoading(true);
        try {
            const data = await getCronjobs();
            setCronjobs(data);
        } catch {
            Toast.error('Failed to load cronjobs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCronjobs();
    }, []);

    // Open create modal
    const openCreateModal = () => {
        setEditingJob(null);
        setModalVisible(true);
        formApi?.reset();
    };

    // Open edit modal
    const openEditModal = (job: Cronjob) => {
        setEditingJob(job);
        setModalVisible(true);
        setTimeout(() => {
            formApi?.setValues({
                name: job.name,
                schedule: job.schedule,
                command: job.command,
                type: job.type,
                enabled: job.enabled,
            });
        }, 100);
    };

    // Handle save
    const handleSave = (values: Record<string, unknown>) => {
        if (editingJob) {
            // Update
            setCronjobs((prev) =>
                prev.map((j) => (j.id === editingJob.id ? { ...j, ...values } : j))
            );
            Toast.success('Cronjob updated successfully');
        } else {
            // Create
            const newJob: Cronjob = {
                id: Date.now().toString(),
                name: values.name as string,
                schedule: values.schedule as string,
                command: values.command as string,
                type: values.type as 'command' | 'script' | 'url',
                enabled: values.enabled as boolean,
                lastRun: '',
                lastStatus: undefined,
                nextRun: new Date(Date.now() + 3600000).toISOString(),
            };
            setCronjobs((prev) => [...prev, newJob]);
            Toast.success('Cronjob created successfully');
        }
        setModalVisible(false);
    };

    // Handle delete
    const handleDelete = (id: string) => {
        setCronjobs((prev) => prev.filter((j) => j.id !== id));
        Toast.success('Cronjob deleted successfully');
    };

    // Handle toggle
    const handleToggle = (id: string, enabled: boolean) => {
        setCronjobs((prev) =>
            prev.map((j) => (j.id === id ? { ...j, enabled } : j))
        );
        Toast.success(enabled ? 'Cronjob enabled' : 'Cronjob disabled');
    };

    // Run job manually
    const runJob = (job: Cronjob) => {
        Toast.success(`Running "${job.name}"...`);
        setTimeout(() => {
            setCronjobs((prev) =>
                prev.map((j) =>
                    j.id === job.id
                        ? { ...j, lastRun: new Date().toISOString(), lastStatus: 'success' as const }
                        : j
                )
            );
            Toast.success(`"${job.name}" completed successfully`);
        }, 1500);
    };

    // Table columns
    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            render: (name: string, record: Cronjob) => (
                <div>
                    <Text style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{name}</Text>
                    <div style={{ marginTop: 4 }}>
                        <Tag size="small" color="blue">{record.type}</Tag>
                    </div>
                </div>
            ),
        },
        {
            title: 'Schedule',
            dataIndex: 'schedule',
            render: (schedule: string) => (
                <div>
                    <code style={{ color: 'var(--color-primary)', fontSize: 12 }}>{schedule}</code>
                    <div style={{ marginTop: 4 }}>
                        <Text type="secondary" size="small">{parseCronExpression(schedule)}</Text>
                    </div>
                </div>
            ),
        },
        {
            title: 'Command',
            dataIndex: 'command',
            render: (cmd: string) => (
                <code style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                    {cmd.length > 40 ? cmd.slice(0, 40) + '...' : cmd}
                </code>
            ),
        },
        {
            title: 'Last Run',
            dataIndex: 'lastRun',
            width: 180,
            render: (date: string, record: Cronjob) => (
                <div>
                    {date ? (
                        <>
                            <Text type="secondary">{formatDate(date)}</Text>
                            <div style={{ marginTop: 4 }}>
                                <Tag
                                    size="small"
                                    color={record.lastStatus === 'success' ? 'green' : 'red'}
                                    prefixIcon={record.lastStatus === 'success' ? <IconTick /> : <IconClose />}
                                >
                                    {record.lastStatus}
                                </Tag>
                            </div>
                        </>
                    ) : (
                        <Text type="tertiary">Never</Text>
                    )}
                </div>
            ),
        },
        {
            title: 'Next Run',
            dataIndex: 'nextRun',
            width: 150,
            render: (date: string, record: Cronjob) => (
                record.enabled ? (
                    <Text type="secondary">{formatDate(date)}</Text>
                ) : (
                    <Text type="tertiary">Disabled</Text>
                )
            ),
        },
        {
            title: 'Status',
            dataIndex: 'enabled',
            width: 100,
            render: (enabled: boolean, record: Cronjob) => (
                <Switch
                    checked={enabled}
                    onChange={(checked) => handleToggle(record.id, checked)}
                    checkedText="ON"
                    uncheckedText="OFF"
                    size="small"
                />
            ),
        },
        {
            title: 'Actions',
            dataIndex: 'actions',
            width: 150,
            render: (_: unknown, record: Cronjob) => (
                <Space>
                    <Button
                        icon={<IconPlay />}
                        theme="borderless"
                        size="small"
                        onClick={() => runJob(record)}
                    />
                    <Button
                        icon={<IconEdit />}
                        theme="borderless"
                        size="small"
                        onClick={() => openEditModal(record)}
                    />
                    <Popconfirm
                        title="Delete this cronjob?"
                        onConfirm={() => handleDelete(record.id)}
                    >
                        <Button icon={<IconDelete />} theme="borderless" type="danger" size="small" />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div className="cron-page page-enter">
            {/* Header */}
            <div className="page-header">
                <div>
                    <Title heading={3} style={{ color: 'var(--color-text-primary)', margin: 0 }}>
                        Cronjobs
                    </Title>
                    <Text type="secondary">Schedule and manage cron tasks</Text>
                </div>
                <Space>
                    <Button icon={<IconHistory />}>History</Button>
                    <Button icon={<IconRefresh />} onClick={fetchCronjobs}>
                        Refresh
                    </Button>
                    <Button icon={<IconPlus />} theme="solid" type="primary" onClick={openCreateModal}>
                        Add Cronjob
                    </Button>
                </Space>
            </div>

            {/* Stats */}
            <div className="cron-stats">
                <Card className="stat-card">
                    <div className="stat-value">{cronjobs.length}</div>
                    <div className="stat-label">Total Jobs</div>
                </Card>
                <Card className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-success)' }}>
                        {cronjobs.filter((j) => j.enabled).length}
                    </div>
                    <div className="stat-label">Active</div>
                </Card>
                <Card className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-warning)' }}>
                        {cronjobs.filter((j) => !j.enabled).length}
                    </div>
                    <div className="stat-label">Disabled</div>
                </Card>
                <Card className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-danger)' }}>
                        {cronjobs.filter((j) => j.lastStatus === 'failed').length}
                    </div>
                    <div className="stat-label">Failed (24h)</div>
                </Card>
            </div>

            {/* Table */}
            <Card className="cron-table-card">
                {cronjobs.length === 0 && !loading ? (
                    <Empty
                        title="No cronjobs configured"
                        description="Create your first scheduled task"
                    >
                        <Button icon={<IconPlus />} theme="solid" type="primary" onClick={openCreateModal}>
                            Add Cronjob
                        </Button>
                    </Empty>
                ) : (
                    <Table
                        columns={columns}
                        dataSource={cronjobs}
                        loading={loading}
                        pagination={false}
                        rowKey="id"
                        className="cron-table"
                    />
                )}
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                title={editingJob ? 'Edit Cronjob' : 'Add Cronjob'}
                visible={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
                width={600}
            >
                <Form
                    getFormApi={setFormApi}
                    onSubmit={handleSave}
                    labelPosition="top"
                    initValues={{ type: 'command', enabled: true }}
                >
                    <Form.Input
                        field="name"
                        label="Job Name"
                        placeholder="e.g., Database Backup"
                        rules={[{ required: true, message: 'Name is required' }]}
                    />

                    <Form.Select
                        field="schedule"
                        label="Schedule"
                        placeholder="Select or enter cron expression"
                        optionList={CRON_PRESETS}
                        allowCreate
                        filter
                        rules={[{ required: true, message: 'Schedule is required' }]}
                    />

                    <div className="cron-preview">
                        <Text type="secondary">
                            Preview: <span id="cron-preview-text">Select a schedule</span>
                        </Text>
                    </div>

                    <Form.Select
                        field="type"
                        label="Type"
                        optionList={[
                            { value: 'command', label: '💻 Command' },
                            { value: 'script', label: '📜 Script' },
                            { value: 'url', label: '🌐 URL Request' },
                        ]}
                    />

                    <Form.TextArea
                        field="command"
                        label="Command / Script / URL"
                        placeholder="e.g., /scripts/backup.sh"
                        rows={3}
                        rules={[{ required: true, message: 'Command is required' }]}
                    />

                    <Form.Switch field="enabled" label="Enabled" />

                    <div style={{ marginTop: 24, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setModalVisible(false)}>Cancel</Button>
                            <Button theme="solid" type="primary" htmlType="submit">
                                {editingJob ? 'Update' : 'Create'}
                            </Button>
                        </Space>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default Cron;
