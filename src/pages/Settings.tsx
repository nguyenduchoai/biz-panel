/**
 * Settings Page
 * Panel configuration and user management
 */
import React, { useState } from 'react';
import {
    Typography,
    Card,
    Button,
    Form,
    Tabs,
    TabPane,
    Table,
    Tag,
    Avatar,
    Space,
    Toast,
    Modal,
    Divider,
} from '@douyinfe/semi-ui';
import {
    IconSave,
    IconUser,
    IconLock,
    IconBell,
    IconCloud,
    IconSetting,
    IconPlus,
    IconDelete,
    IconEdit,
    IconMail,
} from '@douyinfe/semi-icons';
import './Settings.css';

const { Title, Text } = Typography;

interface User {
    id: string;
    username: string;
    email: string;
    role: 'admin' | 'user' | 'readonly';
    status: 'active' | 'inactive';
    lastLogin: string;
    createdAt: string;
}

// Mock users
const MOCK_USERS: User[] = [
    {
        id: '1',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        status: 'active',
        lastLogin: '2026-01-18T10:30:00Z',
        createdAt: '2025-01-01',
    },
    {
        id: '2',
        username: 'developer',
        email: 'dev@example.com',
        role: 'user',
        status: 'active',
        lastLogin: '2026-01-17T15:00:00Z',
        createdAt: '2025-06-15',
    },
    {
        id: '3',
        username: 'viewer',
        email: 'viewer@example.com',
        role: 'readonly',
        status: 'inactive',
        lastLogin: '2026-01-10T09:00:00Z',
        createdAt: '2025-09-20',
    },
];

const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState('general');
    const [users, _setUsers] = useState<User[]>(MOCK_USERS);
    const [userModalVisible, setUserModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [saving, setSaving] = useState(false);

    // Handle save settings
    const handleSave = (section: string) => {
        setSaving(true);
        setTimeout(() => {
            setSaving(false);
            Toast.success(`${section} settings saved successfully`);
        }, 1000);
    };

    // Format date
    const formatDate = (date: string): string => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    // User columns
    const userColumns = [
        {
            title: 'User',
            dataIndex: 'username',
            render: (username: string, record: User) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar size="small" color="blue">
                        {username.charAt(0).toUpperCase()}
                    </Avatar>
                    <div>
                        <Text style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
                            {username}
                        </Text>
                        <div>
                            <Text type="secondary" size="small">{record.email}</Text>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            title: 'Role',
            dataIndex: 'role',
            width: 120,
            render: (role: User['role']) => {
                const colors: Record<string, 'red' | 'blue' | 'grey'> = { admin: 'red', user: 'blue', readonly: 'grey' };
                const labels = { admin: 'Admin', user: 'User', readonly: 'Read Only' };
                return <Tag color={colors[role]}>{labels[role]}</Tag>;
            },
        },
        {
            title: 'Status',
            dataIndex: 'status',
            width: 100,
            render: (status: User['status']) => (
                <Tag color={status === 'active' ? 'green' : 'grey'}>
                    {status === 'active' ? '🟢 Active' : '⚫ Inactive'}
                </Tag>
            ),
        },
        {
            title: 'Last Login',
            dataIndex: 'lastLogin',
            width: 150,
            render: (date: string) => <Text type="secondary">{formatDate(date)}</Text>,
        },
        {
            title: 'Actions',
            dataIndex: 'actions',
            width: 100,
            render: (_: unknown, record: User) => (
                <Space>
                    <Button
                        icon={<IconEdit />}
                        theme="borderless"
                        size="small"
                        onClick={() => {
                            setEditingUser(record);
                            setUserModalVisible(true);
                        }}
                    />
                    <Button icon={<IconDelete />} theme="borderless" type="danger" size="small" />
                </Space>
            ),
        },
    ];

    return (
        <div className="settings-page page-enter">
            {/* Header */}
            <div className="page-header">
                <div>
                    <Title heading={3} style={{ color: 'var(--color-text-primary)', margin: 0 }}>
                        Settings
                    </Title>
                    <Text type="secondary">Panel configuration and user management</Text>
                </div>
            </div>

            {/* Settings Content */}
            <Card className="settings-card">
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    tabPosition="left"
                    className="settings-tabs"
                >
                    {/* General Settings */}
                    <TabPane
                        tab={<span><IconSetting style={{ marginRight: 8 }} />General</span>}
                        itemKey="general"
                    >
                        <div className="settings-section">
                            <Title heading={5}>Panel Settings</Title>
                            <Form labelPosition="top" style={{ maxWidth: 500 }}>
                                <Form.Input
                                    field="panelTitle"
                                    label="Panel Title"
                                    initValue="Biz-Panel"
                                    placeholder="Enter panel title"
                                />
                                <Form.Input
                                    field="serverIP"
                                    label="Server IP"
                                    initValue="192.168.1.100"
                                    placeholder="Server IP address"
                                />
                                <Form.Input
                                    field="panelPort"
                                    label="Panel Port"
                                    initValue="8888"
                                    placeholder="Panel port"
                                    type="number"
                                />
                                <Form.Select
                                    field="timezone"
                                    label="Timezone"
                                    initValue="UTC"
                                    optionList={[
                                        { value: 'UTC', label: 'UTC' },
                                        { value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho Chi Minh (UTC+7)' },
                                        { value: 'America/New_York', label: 'America/New York (UTC-5)' },
                                        { value: 'Europe/London', label: 'Europe/London (UTC+0)' },
                                    ]}
                                />
                                <Form.Select
                                    field="language"
                                    label="Language"
                                    initValue="en"
                                    optionList={[
                                        { value: 'en', label: '🇺🇸 English' },
                                        { value: 'vi', label: '🇻🇳 Tiếng Việt' },
                                        { value: 'zh', label: '🇨🇳 中文' },
                                    ]}
                                />
                                <Form.Switch field="darkMode" label="Dark Mode" initValue={true} />
                                <Button
                                    icon={<IconSave />}
                                    theme="solid"
                                    type="primary"
                                    loading={saving}
                                    onClick={() => handleSave('General')}
                                    style={{ marginTop: 16 }}
                                >
                                    Save Changes
                                </Button>
                            </Form>
                        </div>
                    </TabPane>

                    {/* Security Settings */}
                    <TabPane
                        tab={<span><IconLock style={{ marginRight: 8 }} />Security</span>}
                        itemKey="security"
                    >
                        <div className="settings-section">
                            <Title heading={5}>Security Settings</Title>
                            <Form labelPosition="top" style={{ maxWidth: 500 }}>
                                <Form.Switch
                                    field="enableSSL"
                                    label="Enable HTTPS"
                                    initValue={true}
                                    extraText="Redirect all HTTP traffic to HTTPS"
                                />
                                <Form.Input
                                    field="sessionTimeout"
                                    label="Session Timeout (minutes)"
                                    initValue="30"
                                    type="number"
                                />
                                <Form.Switch
                                    field="twoFactor"
                                    label="Two-Factor Authentication"
                                    initValue={false}
                                    extraText="Require 2FA for all admin users"
                                />
                                <Form.Input
                                    field="allowedIPs"
                                    label="Allowed IPs (Panel Access)"
                                    placeholder="Leave empty for all IPs"
                                    extraText="Comma-separated IP addresses or CIDR ranges"
                                />
                                <Form.Switch
                                    field="bruteForce"
                                    label="Brute Force Protection"
                                    initValue={true}
                                    extraText="Lock account after 5 failed login attempts"
                                />
                                <Divider />
                                <Title heading={6}>Change Password</Title>
                                <Form.Input
                                    field="currentPassword"
                                    label="Current Password"
                                    mode="password"
                                />
                                <Form.Input
                                    field="newPassword"
                                    label="New Password"
                                    mode="password"
                                />
                                <Form.Input
                                    field="confirmPassword"
                                    label="Confirm New Password"
                                    mode="password"
                                />
                                <Button
                                    icon={<IconSave />}
                                    theme="solid"
                                    type="primary"
                                    loading={saving}
                                    onClick={() => handleSave('Security')}
                                    style={{ marginTop: 16 }}
                                >
                                    Save Changes
                                </Button>
                            </Form>
                        </div>
                    </TabPane>

                    {/* Users */}
                    <TabPane
                        tab={<span><IconUser style={{ marginRight: 8 }} />Users</span>}
                        itemKey="users"
                    >
                        <div className="settings-section">
                            <div className="section-header">
                                <Title heading={5}>User Management</Title>
                                <Button
                                    icon={<IconPlus />}
                                    theme="solid"
                                    type="primary"
                                    onClick={() => {
                                        setEditingUser(null);
                                        setUserModalVisible(true);
                                    }}
                                >
                                    Add User
                                </Button>
                            </div>
                            <Table
                                columns={userColumns}
                                dataSource={users}
                                pagination={false}
                                rowKey="id"
                                className="users-table"
                            />
                        </div>
                    </TabPane>

                    {/* Notifications */}
                    <TabPane
                        tab={<span><IconBell style={{ marginRight: 8 }} />Notifications</span>}
                        itemKey="notifications"
                    >
                        <div className="settings-section">
                            <Title heading={5}>Notification Settings</Title>
                            <Form labelPosition="top" style={{ maxWidth: 500 }}>
                                <Title heading={6}>Email</Title>
                                <Form.Switch field="emailEnabled" label="Enable Email Notifications" initValue={true} />
                                <Form.Input
                                    field="smtpHost"
                                    label="SMTP Host"
                                    placeholder="smtp.gmail.com"
                                />
                                <Form.Input
                                    field="smtpPort"
                                    label="SMTP Port"
                                    placeholder="587"
                                    type="number"
                                />
                                <Form.Input field="smtpUser" label="SMTP Username" />
                                <Form.Input field="smtpPassword" label="SMTP Password" mode="password" />
                                <Button icon={<IconMail />} style={{ marginBottom: 24 }}>
                                    Test Email
                                </Button>

                                <Divider />

                                <Title heading={6}>Slack / Discord</Title>
                                <Form.Input
                                    field="slackWebhook"
                                    label="Slack Webhook URL"
                                    placeholder="https://hooks.slack.com/..."
                                />
                                <Form.Input
                                    field="discordWebhook"
                                    label="Discord Webhook URL"
                                    placeholder="https://discord.com/api/webhooks/..."
                                />

                                <Divider />

                                <Title heading={6}>Events</Title>
                                <Form.Switch field="notifyDeploy" label="Deploy Success/Failure" initValue={true} />
                                <Form.Switch field="notifySSL" label="SSL Expiring Soon" initValue={true} />
                                <Form.Switch field="notifyBackup" label="Backup Complete" initValue={true} />
                                <Form.Switch field="notifyResource" label="Critical Resource Usage" initValue={true} />
                                <Form.Switch field="notifyBanned" label="IP Banned by Fail2ban" initValue={false} />

                                <Button
                                    icon={<IconSave />}
                                    theme="solid"
                                    type="primary"
                                    loading={saving}
                                    onClick={() => handleSave('Notification')}
                                    style={{ marginTop: 16 }}
                                >
                                    Save Changes
                                </Button>
                            </Form>
                        </div>
                    </TabPane>

                    {/* Backup */}
                    <TabPane
                        tab={<span><IconCloud style={{ marginRight: 8 }} />Backup</span>}
                        itemKey="backup"
                    >
                        <div className="settings-section">
                            <Title heading={5}>Backup Settings</Title>
                            <Form labelPosition="top" style={{ maxWidth: 500 }}>
                                <Form.Select
                                    field="backupDestination"
                                    label="Backup Destination"
                                    initValue="local"
                                    optionList={[
                                        { value: 'local', label: '💾 Local Storage' },
                                        { value: 's3', label: '☁️ Amazon S3' },
                                        { value: 'r2', label: '☁️ Cloudflare R2' },
                                        { value: 'webdav', label: '📁 WebDAV' },
                                    ]}
                                />
                                <Form.Input
                                    field="backupPath"
                                    label="Backup Path"
                                    initValue="/backups"
                                    placeholder="/backups"
                                />
                                <Form.Select
                                    field="backupSchedule"
                                    label="Automatic Backup"
                                    initValue="daily"
                                    optionList={[
                                        { value: 'disabled', label: 'Disabled' },
                                        { value: 'hourly', label: 'Every Hour' },
                                        { value: 'daily', label: 'Daily at 2:00 AM' },
                                        { value: 'weekly', label: 'Weekly on Sunday' },
                                    ]}
                                />
                                <Form.Input
                                    field="retentionDays"
                                    label="Retention (days)"
                                    initValue="30"
                                    type="number"
                                    extraText="Automatically delete backups older than this"
                                />
                                <Form.Switch field="compressBackup" label="Compress Backups" initValue={true} />
                                <Form.Switch field="encryptBackup" label="Encrypt Backups" initValue={false} />

                                <Divider />

                                <Title heading={6}>What to Backup</Title>
                                <Form.Switch field="backupDatabases" label="Databases" initValue={true} />
                                <Form.Switch field="backupWebsites" label="Website Files" initValue={true} />
                                <Form.Switch field="backupConfig" label="Panel Configuration" initValue={true} />
                                <Form.Switch field="backupDocker" label="Docker Volumes" initValue={false} />

                                <Button
                                    icon={<IconSave />}
                                    theme="solid"
                                    type="primary"
                                    loading={saving}
                                    onClick={() => handleSave('Backup')}
                                    style={{ marginTop: 16 }}
                                >
                                    Save Changes
                                </Button>
                            </Form>
                        </div>
                    </TabPane>
                </Tabs>
            </Card>

            {/* User Modal */}
            <Modal
                title={editingUser ? 'Edit User' : 'Add User'}
                visible={userModalVisible}
                onCancel={() => setUserModalVisible(false)}
                footer={null}
                width={500}
            >
                <Form
                    labelPosition="top"
                    onSubmit={(_values) => {
                        Toast.success(editingUser ? 'User updated' : 'User created');
                        setUserModalVisible(false);
                    }}
                    initValues={editingUser || { role: 'user', status: 'active' }}
                >
                    <Form.Input
                        field="username"
                        label="Username"
                        rules={[{ required: true }]}
                    />
                    <Form.Input
                        field="email"
                        label="Email"
                        type="email"
                        rules={[{ required: true, type: 'email' }]}
                    />
                    {!editingUser && (
                        <Form.Input
                            field="password"
                            label="Password"
                            mode="password"
                            rules={[{ required: true }]}
                        />
                    )}
                    <Form.Select
                        field="role"
                        label="Role"
                        optionList={[
                            { value: 'admin', label: '👑 Admin' },
                            { value: 'user', label: '👤 User' },
                            { value: 'readonly', label: '👁️ Read Only' },
                        ]}
                    />
                    <Form.Select
                        field="status"
                        label="Status"
                        optionList={[
                            { value: 'active', label: '🟢 Active' },
                            { value: 'inactive', label: '⚫ Inactive' },
                        ]}
                    />
                    <div style={{ marginTop: 24, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setUserModalVisible(false)}>Cancel</Button>
                            <Button theme="solid" type="primary" htmlType="submit">
                                {editingUser ? 'Update' : 'Create'}
                            </Button>
                        </Space>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default Settings;
