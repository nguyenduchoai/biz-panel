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
    Tabs,
    TabPane,
} from '@douyinfe/semi-ui';
import {
    IconPlus,
    IconSearch,
    IconRefresh,
    IconDelete,
    IconEdit,
    IconEyeOpened,
    IconGlobe,
    IconFolder,
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
    const [websitePath, setWebsitePath] = useState('/www/wwwroot');
    // FTP and Database option states
    const [ftpOption, setFtpOption] = useState('none');
    const [dbOption, setDbOption] = useState('none');
    // Auto-generated credentials based on domain
    const [dbName, setDbName] = useState('');
    const [dbUser, setDbUser] = useState('');
    const [dbPass, setDbPass] = useState('');
    const [ftpUser, setFtpUser] = useState('');
    const [ftpPass, setFtpPass] = useState('');
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
            // Reset all states
            setWebsitePath('/www/wwwroot');
            setFtpOption('none');
            setDbOption('none');
            setDbName('');
            setDbUser('');
            setDbPass('');
            setFtpUser('');
            setFtpPass('');
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
        // Parse domains from textarea (one per line)
        const domainsText = values.domains as string;
        const domains = domainsText.split('\n').filter(d => d.trim()).map(d => d.trim());

        if (domains.length === 0) {
            Toast.error('Please enter at least one domain');
            return;
        }

        // Get the first domain and port
        const firstDomain = domains[0];
        let domain = firstDomain;
        let port = 80;

        // Check if domain includes port (e.g., example.com:8080)
        if (firstDomain.includes(':')) {
            const parts = firstDomain.split(':');
            domain = parts[0];
            port = parseInt(parts[1]) || 80;
        }

        // Use the websitePath state which is auto-updated based on domain
        const documentRoot = websitePath || `/www/wwwroot/${domain}`;

        // Build request with all options
        const requestData = {
            domain: domain,
            port: port,
            phpVersion: values.phpVersion === 'static' ? '' : (values.phpVersion as string) || '8.2',
            documentRoot: documentRoot,
            description: values.description as string || '',
            category: values.category as string || 'default',
            sslEnabled: values.sslEnabled as boolean || false,
            // FTP options
            createFTP: ftpOption === 'create',
            ftpUsername: ftpUser,
            ftpPassword: ftpPass,
            // Database options
            createDatabase: dbOption !== 'none',
            databaseType: dbOption,
            databaseName: dbName,
            databaseUser: dbUser,
            databasePass: dbPass,
        };

        createMutation.mutate(requestData as never);
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
                        title="🗑️ Xoá Website?"
                        content="Thao tác này sẽ xoá tất cả cấu hình nginx. Thư mục website sẽ được giữ lại."
                        onConfirm={() => deleteMutation.mutate(record.id)}
                        position="left"
                        okText="Xoá"
                        cancelText="Huỷ"
                        okType="danger"
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

            {/* Create Modal - aaPanel Style */}
            <Modal
                title="Add Website - Support batch site building"
                visible={createModalVisible}
                onCancel={() => setCreateModalVisible(false)}
                footer={null}
                width={650}
            >
                <Tabs type="line" defaultActiveKey="create">
                    <TabPane tab="🌐 Create Site" itemKey="create">
                        <Form onSubmit={handleCreate} labelPosition="left" labelWidth={140}>
                            <Form.RadioGroup
                                field="dnsMode"
                                label="Resolve Domain"
                                initValue="manual"
                                options={[
                                    { value: 'manual', label: '● Manual Add Record' },
                                    { value: 'auto', label: '○ Automatic Add Record ✨' },
                                ]}
                            />
                            <Form.TextArea
                                field="domains"
                                label="Domain Name"
                                placeholder={`A domain per line, the default port is 80\nWildcard domain format: *.domain.com\nTo add another port, the format is www.domain.com:88`}
                                rows={4}
                                rules={[{ required: true, message: 'At least one domain is required' }]}
                                onChange={(value) => {
                                    // Auto-generate website path and credentials from first domain
                                    if (value) {
                                        const lines = value.split('\n').filter((l: string) => l.trim());
                                        if (lines.length > 0) {
                                            let domain = lines[0].trim();
                                            // Remove port if present
                                            if (domain.includes(':')) {
                                                domain = domain.split(':')[0];
                                            }
                                            // Remove wildcard prefix
                                            if (domain.startsWith('*.')) {
                                                domain = domain.substring(2);
                                            }
                                            setWebsitePath(`/www/wwwroot/${domain}`);

                                            // Auto-generate DB/FTP credentials from domain
                                            const safeName = domain.replace(/\./g, '_').replace(/-/g, '_');
                                            setDbName(safeName);
                                            setDbUser(safeName);
                                            setDbPass(Math.random().toString(36).substring(2, 14));
                                            setFtpUser(safeName);
                                            setFtpPass(Math.random().toString(36).substring(2, 14));
                                        }
                                    } else {
                                        setWebsitePath('/www/wwwroot');
                                        setDbName('');
                                        setDbUser('');
                                        setDbPass('');
                                        setFtpUser('');
                                        setFtpPass('');
                                    }
                                }}
                            />
                            <Form.Input
                                field="description"
                                label="Description"
                                placeholder="Website description (optional)"
                            />
                            <div className="semi-form-field" style={{ marginBottom: 16 }}>
                                <label className="semi-form-field-label" style={{ display: 'block', marginBottom: 8 }}>
                                    <span style={{ color: 'var(--color-text-1)' }}>Website Path</span>
                                </label>
                                <Input
                                    value={websitePath}
                                    onChange={(value) => setWebsitePath(value)}
                                    placeholder="/www/wwwroot"
                                    suffix={<Button size="small" theme="borderless" icon={<IconFolder />}>📂</Button>}
                                />
                            </div>
                            <Form.Select
                                field="ftpOption"
                                label="FTP"
                                initValue="none"
                                optionList={[
                                    { value: 'none', label: 'Not create' },
                                    { value: 'create', label: 'Create FTP account' },
                                ]}
                                onChange={(value) => setFtpOption(value as string)}
                            />
                            {/* FTP Credentials - show when create is selected */}
                            {ftpOption === 'create' && (
                                <div style={{
                                    background: 'var(--color-bg-2)',
                                    padding: '12px 16px',
                                    borderRadius: 8,
                                    marginBottom: 16,
                                    marginTop: -8,
                                    border: '1px solid var(--color-border)'
                                }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--color-text-2)' }}>FTP Username</label>
                                            <Input size="small" value={ftpUser} onChange={setFtpUser} placeholder="ftp_user" />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--color-text-2)' }}>FTP Password</label>
                                            <Input size="small" value={ftpPass} onChange={setFtpPass} placeholder="Password" />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <Form.Select
                                field="databaseOption"
                                label="Database"
                                initValue="none"
                                optionList={[
                                    { value: 'none', label: 'Not create' },
                                    { value: 'mysql', label: 'Create MySQL database' },
                                    { value: 'postgresql', label: 'Create PostgreSQL database' },
                                ]}
                                onChange={(value) => setDbOption(value as string)}
                            />
                            {/* Database Credentials - show when create is selected */}
                            {(dbOption === 'mysql' || dbOption === 'postgresql') && (
                                <div style={{
                                    background: 'var(--color-bg-2)',
                                    padding: '12px 16px',
                                    borderRadius: 8,
                                    marginBottom: 16,
                                    marginTop: -8,
                                    border: '1px solid var(--color-border)'
                                }}>
                                    <div style={{ marginBottom: 8 }}>
                                        <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--color-text-2)' }}>Database Name</label>
                                        <Input size="small" value={dbName} onChange={setDbName} placeholder="database_name" />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--color-text-2)' }}>DB Username</label>
                                            <Input size="small" value={dbUser} onChange={setDbUser} placeholder="db_user" />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: 'var(--color-text-2)' }}>DB Password</label>
                                            <Input size="small" value={dbPass} onChange={setDbPass} placeholder="Password" />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <Form.Select
                                field="phpVersion"
                                label="PHP Version"
                                initValue="8.2"
                                optionList={[
                                    { value: '8.3', label: 'PHP 8.3 (Latest)' },
                                    { value: '8.2', label: 'PHP 8.2 (Recommended)' },
                                    { value: '8.1', label: 'PHP 8.1' },
                                    { value: '7.4', label: 'PHP 7.4 (Legacy)' },
                                    { value: 'static', label: 'Pure static (No PHP)' },
                                ]}
                            />
                            <Form.Select
                                field="category"
                                label="Site Category"
                                initValue="default"
                                optionList={[
                                    { value: 'default', label: 'Default category' },
                                    { value: 'wordpress', label: 'WordPress' },
                                    { value: 'laravel', label: 'Laravel' },
                                    { value: 'nodejs', label: 'Node.js' },
                                    { value: 'static', label: 'Static Website' },
                                ]}
                            />
                            <Form.Switch field="sslEnabled" label="Enable SSL (HTTPS)" />
                            <Form.Switch field="enableWWW" label="Enable www redirect" initValue={true} />
                            <div style={{ marginTop: 24, textAlign: 'right', borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
                                <Button onClick={() => setCreateModalVisible(false)} style={{ marginRight: 8 }}>
                                    Cancel
                                </Button>
                                <Button
                                    htmlType="submit"
                                    theme="solid"
                                    type="primary"
                                    loading={createMutation.isPending}
                                >
                                    Confirm
                                </Button>
                            </div>
                        </Form>
                    </TabPane>
                    <TabPane tab="📦 Create for Git" itemKey="git">
                        <Form labelPosition="left" labelWidth={140}>
                            <Form.Input
                                field="gitRepo"
                                label="Git Repository"
                                placeholder="https://github.com/user/repo.git"
                                rules={[{ required: true }]}
                            />
                            <Form.Input
                                field="gitBranch"
                                label="Branch"
                                initValue="main"
                            />
                            <Form.Input
                                field="deployPath"
                                label="Deploy Path"
                                initValue="/www/wwwroot"
                            />
                            <Form.Select
                                field="buildCommand"
                                label="Build Command"
                                optionList={[
                                    { value: 'none', label: 'None' },
                                    { value: 'npm', label: 'npm install && npm run build' },
                                    { value: 'yarn', label: 'yarn && yarn build' },
                                    { value: 'composer', label: 'composer install' },
                                ]}
                            />
                            <Form.Switch field="autoDeployOnPush" label="Auto deploy on push" initValue={true} />
                            <div style={{ marginTop: 24, textAlign: 'right', borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
                                <Button onClick={() => setCreateModalVisible(false)} style={{ marginRight: 8 }}>
                                    Cancel
                                </Button>
                                <Button
                                    theme="solid"
                                    type="primary"
                                    onClick={() => Toast.info('Git deployment coming soon!')}
                                >
                                    Deploy from Git
                                </Button>
                            </div>
                        </Form>
                    </TabPane>
                    <TabPane tab="🚀 Batch Create" itemKey="batch">
                        <Form labelPosition="left" labelWidth={140}>
                            <Form.TextArea
                                field="batchDomains"
                                label="Domains"
                                placeholder={`Enter multiple domains, one per line:\nexample1.com\nexample2.com\nexample3.com`}
                                rows={6}
                            />
                            <Form.Select
                                field="batchPhpVersion"
                                label="PHP Version"
                                initValue="8.2"
                                optionList={[
                                    { value: '8.2', label: 'PHP 8.2' },
                                    { value: '8.1', label: 'PHP 8.1' },
                                    { value: '7.4', label: 'PHP 7.4' },
                                ]}
                            />
                            <Form.Switch field="batchSSL" label="Enable SSL for all" />
                            <Form.Switch field="batchDatabase" label="Create database for each" />
                            <div style={{ marginTop: 24, textAlign: 'right', borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
                                <Button onClick={() => setCreateModalVisible(false)} style={{ marginRight: 8 }}>
                                    Cancel
                                </Button>
                                <Button
                                    theme="solid"
                                    type="primary"
                                    onClick={() => Toast.info('Batch creation coming soon!')}
                                >
                                    Create All ({0} sites)
                                </Button>
                            </div>
                        </Form>
                    </TabPane>
                </Tabs>
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
