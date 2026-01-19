/**
 * Settings Page - System Configuration
 */
import React, { useState } from 'react';
import {
    Typography,
    Card,
    Button,
    Form,
    Toast,
    Spin,
    Tabs,
    TabPane,
    Divider,
    Modal,
} from '@douyinfe/semi-ui';
import {
    IconSave,
    IconRefresh,
    IconSetting,
    IconLock,
    IconBell,
    IconCloud,
} from '@douyinfe/semi-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSettings, updateSettings, changePassword } from '../services/api';
import './Settings.css';

const { Title, Text } = Typography;

const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState('general');
    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    const queryClient = useQueryClient();

    const { data: settings, isLoading } = useQuery({
        queryKey: ['settings'],
        queryFn: getSettings,
    });

    const updateMutation = useMutation({
        mutationFn: updateSettings,
        onSuccess: () => {
            Toast.success('Settings saved successfully!');
            queryClient.invalidateQueries({ queryKey: ['settings'] });
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const passwordMutation = useMutation({
        mutationFn: ({ current, newPass }: { current: string; newPass: string }) =>
            changePassword(current, newPass),
        onSuccess: () => {
            Toast.success('Password changed successfully!');
            setPasswordModalVisible(false);
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const handleGeneralSubmit = (values: Record<string, unknown>) => {
        if (!settings) return;
        updateMutation.mutate({
            ...settings,
            general: {
                panelTitle: values.panelTitle as string,
                panelPort: values.panelPort as number,
                timezone: values.timezone as string,
                language: values.language as string,
                darkMode: values.darkMode as boolean,
            },
        });
    };

    const handleSecuritySubmit = (values: Record<string, unknown>) => {
        if (!settings) return;
        updateMutation.mutate({
            ...settings,
            security: {
                enableSSL: values.enableSSL as boolean,
                sessionTimeout: values.sessionTimeout as number,
                twoFactorEnabled: values.twoFactorEnabled as boolean,
                bruteForceEnabled: values.bruteForceEnabled as boolean,
            },
        });
    };

    const handleNotificationsSubmit = (values: Record<string, unknown>) => {
        if (!settings) return;
        updateMutation.mutate({
            ...settings,
            notifications: {
                emailEnabled: values.emailEnabled as boolean,
                smtpHost: values.smtpHost as string,
                slackWebhook: values.slackWebhook as string,
                discordWebhook: values.discordWebhook as string,
            },
        });
    };

    const handleBackupSubmit = (values: Record<string, unknown>) => {
        if (!settings) return;
        updateMutation.mutate({
            ...settings,
            backup: {
                enabled: values.enabled as boolean,
                schedule: values.schedule as string,
                retentionDays: values.retentionDays as number,
                backupDatabases: values.backupDatabases as boolean,
                backupWebsites: values.backupWebsites as boolean,
            },
        });
    };

    const handlePasswordChange = (values: Record<string, unknown>) => {
        const newPass = values.newPassword as string;
        const confirmPass = values.confirmPassword as string;
        if (newPass !== confirmPass) {
            Toast.error('Passwords do not match');
            return;
        }
        passwordMutation.mutate({
            current: values.currentPassword as string,
            newPass: newPass,
        });
    };

    if (isLoading || !settings) {
        return (
            <div className="loading-container">
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className="settings-page page-enter">
            <div className="page-header">
                <div>
                    <Title heading={3} className="page-title">⚙️ Settings</Title>
                    <Text type="secondary" className="page-subtitle">
                        Configure your panel settings
                    </Text>
                </div>
                <Button
                    icon={<IconRefresh />}
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['settings'] })}
                >
                    Refresh
                </Button>
            </div>

            <Card className="settings-card">
                <Tabs activeKey={activeTab} onChange={setActiveTab}>
                    {/* General Settings */}
                    <TabPane
                        tab={<span><IconSetting style={{ marginRight: 8 }} />General</span>}
                        itemKey="general"
                    >
                        <Form
                            onSubmit={handleGeneralSubmit}
                            initValues={settings.general}
                            labelPosition="left"
                            labelWidth={150}
                            className="settings-form"
                        >
                            <Form.Input
                                field="panelTitle"
                                label="Panel Title"
                                placeholder="Biz-Panel"
                            />
                            <Form.InputNumber
                                field="panelPort"
                                label="Panel Port"
                                min={1}
                                max={65535}
                            />
                            <Form.Select
                                field="timezone"
                                label="Timezone"
                                optionList={[
                                    { value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho Chi Minh (UTC+7)' },
                                    { value: 'UTC', label: 'UTC' },
                                    { value: 'America/New_York', label: 'America/New York' },
                                    { value: 'Europe/London', label: 'Europe/London' },
                                ]}
                            />
                            <Form.Select
                                field="language"
                                label="Language"
                                optionList={[
                                    { value: 'en', label: '🇺🇸 English' },
                                    { value: 'vi', label: '🇻🇳 Tiếng Việt' },
                                ]}
                            />
                            <Form.Switch field="darkMode" label="Dark Mode" />
                            <div className="form-actions">
                                <Button
                                    htmlType="submit"
                                    theme="solid"
                                    type="primary"
                                    icon={<IconSave />}
                                    loading={updateMutation.isPending}
                                >
                                    Save Changes
                                </Button>
                            </div>
                        </Form>
                    </TabPane>

                    {/* Security Settings */}
                    <TabPane
                        tab={<span><IconLock style={{ marginRight: 8 }} />Security</span>}
                        itemKey="security"
                    >
                        <Form
                            onSubmit={handleSecuritySubmit}
                            initValues={settings.security}
                            labelPosition="left"
                            labelWidth={180}
                            className="settings-form"
                        >
                            <Form.Switch field="enableSSL" label="Enable SSL (HTTPS)" />
                            <Form.InputNumber
                                field="sessionTimeout"
                                label="Session Timeout (minutes)"
                                min={5}
                                max={1440}
                            />
                            <Form.Switch field="twoFactorEnabled" label="Two-Factor Auth (2FA)" />
                            <Form.Switch field="bruteForceEnabled" label="Brute Force Protection" />

                            <Divider margin={24} />

                            <div className="password-section">
                                <Text strong>Password</Text>
                                <Button
                                    style={{ marginLeft: 16 }}
                                    onClick={() => setPasswordModalVisible(true)}
                                >
                                    Change Password
                                </Button>
                            </div>

                            <div className="form-actions">
                                <Button
                                    htmlType="submit"
                                    theme="solid"
                                    type="primary"
                                    icon={<IconSave />}
                                    loading={updateMutation.isPending}
                                >
                                    Save Changes
                                </Button>
                            </div>
                        </Form>
                    </TabPane>

                    {/* Notifications */}
                    <TabPane
                        tab={<span><IconBell style={{ marginRight: 8 }} />Notifications</span>}
                        itemKey="notifications"
                    >
                        <Form
                            onSubmit={handleNotificationsSubmit}
                            initValues={settings.notifications}
                            labelPosition="left"
                            labelWidth={150}
                            className="settings-form"
                        >
                            <Form.Switch field="emailEnabled" label="Email Notifications" />
                            <Form.Input
                                field="smtpHost"
                                label="SMTP Host"
                                placeholder="smtp.gmail.com:587"
                            />
                            <Divider margin={16}>Webhooks</Divider>
                            <Form.Input
                                field="slackWebhook"
                                label="Slack Webhook"
                                placeholder="https://hooks.slack.com/..."
                            />
                            <Form.Input
                                field="discordWebhook"
                                label="Discord Webhook"
                                placeholder="https://discord.com/api/webhooks/..."
                            />
                            <div className="form-actions">
                                <Button
                                    htmlType="submit"
                                    theme="solid"
                                    type="primary"
                                    icon={<IconSave />}
                                    loading={updateMutation.isPending}
                                >
                                    Save Changes
                                </Button>
                            </div>
                        </Form>
                    </TabPane>

                    {/* Backup */}
                    <TabPane
                        tab={<span><IconCloud style={{ marginRight: 8 }} />Backup</span>}
                        itemKey="backup"
                    >
                        <Form
                            onSubmit={handleBackupSubmit}
                            initValues={settings.backup}
                            labelPosition="left"
                            labelWidth={180}
                            className="settings-form"
                        >
                            <Form.Switch field="enabled" label="Enable Automatic Backup" />
                            <Form.Select
                                field="schedule"
                                label="Schedule"
                                optionList={[
                                    { value: '0 0 * * *', label: 'Daily at midnight' },
                                    { value: '0 0 * * 0', label: 'Weekly (Sunday)' },
                                    { value: '0 0 1 * *', label: 'Monthly (1st day)' },
                                ]}
                            />
                            <Form.InputNumber
                                field="retentionDays"
                                label="Retention (days)"
                                min={1}
                                max={365}
                            />
                            <Divider margin={16}>What to Backup</Divider>
                            <Form.Switch field="backupDatabases" label="Backup Databases" />
                            <Form.Switch field="backupWebsites" label="Backup Websites" />
                            <div className="form-actions">
                                <Button
                                    htmlType="submit"
                                    theme="solid"
                                    type="primary"
                                    icon={<IconSave />}
                                    loading={updateMutation.isPending}
                                >
                                    Save Changes
                                </Button>
                                <Button style={{ marginLeft: 8 }} onClick={() => Toast.info('Manual backup started...')}>
                                    Backup Now
                                </Button>
                            </div>
                        </Form>
                    </TabPane>
                </Tabs>
            </Card>

            {/* Password Change Modal */}
            <Modal
                title="Change Password"
                visible={passwordModalVisible}
                onCancel={() => setPasswordModalVisible(false)}
                footer={null}
                width={400}
            >
                <Form onSubmit={handlePasswordChange} labelPosition="left" labelWidth={140}>
                    <Form.Input
                        field="currentPassword"
                        label="Current Password"
                        type="password"
                        rules={[{ required: true }]}
                    />
                    <Form.Input
                        field="newPassword"
                        label="New Password"
                        type="password"
                        rules={[
                            { required: true },
                            { min: 8, message: 'Minimum 8 characters' },
                        ]}
                    />
                    <Form.Input
                        field="confirmPassword"
                        label="Confirm Password"
                        type="password"
                        rules={[{ required: true }]}
                    />
                    <div style={{ marginTop: 24, textAlign: 'right' }}>
                        <Button onClick={() => setPasswordModalVisible(false)} style={{ marginRight: 8 }}>
                            Cancel
                        </Button>
                        <Button
                            htmlType="submit"
                            theme="solid"
                            type="primary"
                            loading={passwordMutation.isPending}
                        >
                            Change Password
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default Settings;
