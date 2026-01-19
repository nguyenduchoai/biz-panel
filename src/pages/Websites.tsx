/**
 * Websites Page - Full CRUD with Edit and Details
 */
import React, { useState } from 'react';
import {
    Typography,
    Card,
    Button,
    Tag,
    Input,
    Spin,
    Modal,
    Form,
    Toast,
    Table,
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
    IconGlobe,
} from '@douyinfe/semi-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getWebsites,
    createWebsite,
    updateWebsite,
    deleteWebsite,
    type Website,
} from '../services/api';
import './Websites.css';

const { Title, Text } = Typography;

const Websites: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [detailsVisible, setDetailsVisible] = useState(false);
    const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);
    const queryClient = useQueryClient();

    const { data: websites = [], isLoading } = useQuery({
        queryKey: ['websites'],
        queryFn: getWebsites,
    });

    const createMutation = useMutation({
        mutationFn: createWebsite,
        onSuccess: () => {
            Toast.success('Website created successfully!');
            queryClient.invalidateQueries({ queryKey: ['websites'] });
            setCreateModalVisible(false);
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Website> }) => updateWebsite(id, data),
        onSuccess: () => {
            Toast.success('Website updated successfully!');
            queryClient.invalidateQueries({ queryKey: ['websites'] });
            setEditModalVisible(false);
            setSelectedWebsite(null);
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteWebsite,
        onSuccess: () => {
            Toast.success('Website deleted!');
            queryClient.invalidateQueries({ queryKey: ['websites'] });
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const filteredWebsites = websites.filter(site =>
        site.domain.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreate = (values: Record<string, unknown>) => {
        createMutation.mutate({
            domain: values.domain as string,
            port: (values.port as number) || 80,
            phpVersion: (values.phpVersion as string) || '8.2',
            ssl: {
                enabled: values.sslEnabled as boolean || false,
                provider: 'letsencrypt',
                autoRenew: true,
            },
            documentRoot: `/var/www/${values.domain}`,
            status: 'running',
        });
    };

    const handleEdit = (values: Record<string, unknown>) => {
        if (!selectedWebsite) return;
        updateMutation.mutate({
            id: selectedWebsite.id,
            data: {
                domain: values.domain as string,
                port: values.port as number,
                phpVersion: values.phpVersion as string,
                ssl: {
                    enabled: values.sslEnabled as boolean,
                    provider: selectedWebsite.ssl.provider,
                    autoRenew: values.sslAutoRenew as boolean,
                },
                documentRoot: values.documentRoot as string,
            },
        });
    };

    const openEdit = (website: Website) => {
        setSelectedWebsite(website);
        setEditModalVisible(true);
    };

    const openDetails = (website: Website) => {
        setSelectedWebsite(website);
        setDetailsVisible(true);
    };

    const columns = [
        {
            title: 'Domain',
            dataIndex: 'domain',
            key: 'domain',
            render: (domain: string, record: Website) => (
                <div className="website-domain">
                    <IconGlobe style={{ marginRight: 8 }} />
                    <div>
                        <Text strong>{domain}</Text>
                        <br />
                        <Text type="tertiary" size="small">:{record.port}</Text>
                    </div>
                </div>
            ),
        },
        {
            title: 'PHP',
            dataIndex: 'phpVersion',
            key: 'phpVersion',
            render: (v: string) => <Tag color="blue">PHP {v}</Tag>,
            width: 100,
        },
        {
            title: 'SSL',
            dataIndex: 'ssl',
            key: 'ssl',
            render: (ssl: Website['ssl']) => (
                <Tag color={ssl?.enabled ? 'green' : 'grey'}>
                    {ssl?.enabled ? '🔒 HTTPS' : '🔓 HTTP'}
                </Tag>
            ),
            width: 100,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const colors: Record<string, 'green' | 'red' | 'orange'> = {
                    running: 'green',
                    stopped: 'red',
                    error: 'orange',
                };
                const icons: Record<string, string> = {
                    running: '●',
                    stopped: '○',
                    error: '⚠',
                };
                return (
                    <Tag color={colors[status] || 'grey'}>
                        {icons[status]} {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Tag>
                );
            },
            width: 120,
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
            render: (_: unknown, record: Website) => (
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
                        title="Delete this website?"
                        content="This will remove all files and configurations."
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
        <div className="websites-page page-enter">
            <div className="page-header">
                <div>
                    <Title heading={3} className="page-title">🌐 Websites</Title>
                    <Text type="secondary" className="page-subtitle">
                        Manage your web applications and domains
                    </Text>
                </div>
                <div className="header-actions">
                    <Button
                        icon={<IconRefresh />}
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['websites'] })}
                    >
                        Refresh
                    </Button>
                    <Button
                        icon={<IconPlus />}
                        theme="solid"
                        type="primary"
                        onClick={() => setCreateModalVisible(true)}
                    >
                        Add Website
                    </Button>
                </div>
            </div>

            {/* Search */}
            <Card className="search-card">
                <Input
                    prefix={<IconSearch />}
                    placeholder="Search websites..."
                    value={searchTerm}
                    onChange={setSearchTerm}
                    showClear
                    style={{ width: 300 }}
                />
                <Text type="secondary" style={{ marginLeft: 16 }}>
                    {filteredWebsites.length} websites
                </Text>
            </Card>

            {/* Table */}
            <Card className="websites-table-card">
                <Table
                    columns={columns}
                    dataSource={filteredWebsites}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    className="websites-table"
                />
            </Card>

            {/* Create Modal */}
            <Modal
                title="Add Website"
                visible={createModalVisible}
                onCancel={() => setCreateModalVisible(false)}
                footer={null}
                width={500}
            >
                <Form onSubmit={handleCreate} labelPosition="left" labelWidth={120}>
                    <Form.Input
                        field="domain"
                        label="Domain"
                        placeholder="example.com"
                        rules={[{ required: true, message: 'Domain is required' }]}
                    />
                    <Form.InputNumber
                        field="port"
                        label="Port"
                        initValue={80}
                        min={1}
                        max={65535}
                    />
                    <Form.Select
                        field="phpVersion"
                        label="PHP Version"
                        initValue="8.2"
                        optionList={[
                            { value: '8.3', label: 'PHP 8.3' },
                            { value: '8.2', label: 'PHP 8.2' },
                            { value: '8.1', label: 'PHP 8.1' },
                            { value: '7.4', label: 'PHP 7.4' },
                        ]}
                    />
                    <Form.Switch field="sslEnabled" label="Enable SSL" />
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
                title="Edit Website"
                visible={editModalVisible}
                onCancel={() => {
                    setEditModalVisible(false);
                    setSelectedWebsite(null);
                }}
                footer={null}
                width={500}
            >
                {selectedWebsite && (
                    <Form
                        onSubmit={handleEdit}
                        initValues={{
                            domain: selectedWebsite.domain,
                            port: selectedWebsite.port,
                            phpVersion: selectedWebsite.phpVersion,
                            documentRoot: selectedWebsite.documentRoot,
                            sslEnabled: selectedWebsite.ssl?.enabled,
                            sslAutoRenew: selectedWebsite.ssl?.autoRenew,
                        }}
                        labelPosition="left"
                        labelWidth={120}
                    >
                        <Form.Input
                            field="domain"
                            label="Domain"
                            rules={[{ required: true }]}
                        />
                        <Form.InputNumber
                            field="port"
                            label="Port"
                            min={1}
                            max={65535}
                        />
                        <Form.Select
                            field="phpVersion"
                            label="PHP Version"
                            optionList={[
                                { value: '8.3', label: 'PHP 8.3' },
                                { value: '8.2', label: 'PHP 8.2' },
                                { value: '8.1', label: 'PHP 8.1' },
                                { value: '7.4', label: 'PHP 7.4' },
                            ]}
                        />
                        <Form.Input field="documentRoot" label="Document Root" />
                        <Form.Switch field="sslEnabled" label="Enable SSL" />
                        <Form.Switch field="sslAutoRenew" label="Auto Renew SSL" />
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
                title={`Website Details: ${selectedWebsite?.domain || ''}`}
                visible={detailsVisible}
                onCancel={() => {
                    setDetailsVisible(false);
                    setSelectedWebsite(null);
                }}
                width={500}
            >
                {selectedWebsite && (
                    <div className="website-details">
                        <Descriptions
                            data={[
                                { key: 'Domain', value: selectedWebsite.domain },
                                { key: 'Port', value: selectedWebsite.port },
                                { key: 'PHP Version', value: `PHP ${selectedWebsite.phpVersion}` },
                                { key: 'Document Root', value: selectedWebsite.documentRoot },
                                { key: 'SSL Enabled', value: selectedWebsite.ssl?.enabled ? 'Yes' : 'No' },
                                { key: 'SSL Provider', value: selectedWebsite.ssl?.provider || '-' },
                                { key: 'SSL Auto Renew', value: selectedWebsite.ssl?.autoRenew ? 'Yes' : 'No' },
                                { key: 'Status', value: selectedWebsite.status },
                                { key: 'Created', value: new Date(selectedWebsite.createdAt).toLocaleString() },
                            ]}
                        />
                        <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
                            <Button onClick={() => {
                                setDetailsVisible(false);
                                openEdit(selectedWebsite);
                            }}>
                                Edit
                            </Button>
                            <Button
                                onClick={() => window.open(`http${selectedWebsite.ssl?.enabled ? 's' : ''}://${selectedWebsite.domain}`, '_blank')}
                            >
                                Open in Browser
                            </Button>
                        </div>
                    </div>
                )}
            </SideSheet>
        </div>
    );
};

export default Websites;
