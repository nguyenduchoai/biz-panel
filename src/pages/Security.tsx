/**
 * Security Page - Real API Integration
 * Firewall rules and SSL management
 */
import React, { useState } from 'react';
import {
    Typography,
    Card,
    Button,
    Tag,
    Progress,
    Table,
    Spin,
    Modal,
    Form,
    Toast,
    Popconfirm,
} from '@douyinfe/semi-ui';
import { IconPlus, IconDelete, IconRefresh } from '@douyinfe/semi-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getFirewallRules,
    createFirewallRule,
    deleteFirewallRule,
    getSSLCertificates,
    checkSSLExpiry,
    renewSSLCertificate,
    deleteSSLCertificate,
    type FirewallRule,
    type SSLCertificate,
} from '../services/api';
import './Security.css';

const { Title, Text } = Typography;

const Security: React.FC = () => {
    const [addRuleModalVisible, setAddRuleModalVisible] = useState(false);
    const [blockIPModalVisible, setBlockIPModalVisible] = useState(false);
    const queryClient = useQueryClient();

    // Queries
    const { data: firewallRules = [], isLoading: loadingRules } = useQuery({
        queryKey: ['firewallRules'],
        queryFn: getFirewallRules,
    });

    const { data: sslCerts = [] } = useQuery({
        queryKey: ['sslCertificates'],
        queryFn: getSSLCertificates,
    });

    const { data: sslStatus } = useQuery({
        queryKey: ['sslExpiry'],
        queryFn: checkSSLExpiry,
    });

    // Mutations
    const createRuleMutation = useMutation({
        mutationFn: createFirewallRule,
        onSuccess: () => {
            Toast.success('Firewall rule added');
            queryClient.invalidateQueries({ queryKey: ['firewallRules'] });
            setAddRuleModalVisible(false);
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const deleteRuleMutation = useMutation({
        mutationFn: deleteFirewallRule,
        onSuccess: () => {
            Toast.success('Firewall rule deleted');
            queryClient.invalidateQueries({ queryKey: ['firewallRules'] });
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const renewCertMutation = useMutation({
        mutationFn: renewSSLCertificate,
        onSuccess: () => {
            Toast.success('Certificate renewal initiated');
            queryClient.invalidateQueries({ queryKey: ['sslCertificates', 'sslExpiry'] });
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const deleteCertMutation = useMutation({
        mutationFn: deleteSSLCertificate,
        onSuccess: () => {
            Toast.success('Certificate deleted');
            queryClient.invalidateQueries({ queryKey: ['sslCertificates', 'sslExpiry'] });
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    // Calculate security score
    const validCerts = sslStatus?.valid || 0;
    const expiringCerts = sslStatus?.expiring?.length || 0;
    const expiredCerts = sslStatus?.expired?.length || 0;
    const activeRules = firewallRules.filter(r => r.enabled).length;

    const securityScore = Math.max(0, Math.min(100,
        80 + (validCerts * 2) - (expiringCerts * 5) - (expiredCerts * 10) + (activeRules > 0 ? 10 : 0)
    ));

    const handleAddRule = (values: Record<string, unknown>) => {
        createRuleMutation.mutate({
            port: values.port as number,
            protocol: (values.protocol as 'tcp' | 'udp' | 'both') || 'tcp',
            source: (values.source as string) || '0.0.0.0/0',
            action: 'allow',
            description: values.description as string,
            enabled: true,
        });
    };

    const handleBlockIP = (values: Record<string, unknown>) => {
        createRuleMutation.mutate({
            port: 0,
            protocol: 'both',
            source: values.ip as string,
            action: 'deny',
            description: values.reason as string || 'Blocked IP',
            enabled: true,
        });
        setBlockIPModalVisible(false);
    };

    const firewallColumns = [
        { title: 'Port', dataIndex: 'port', key: 'port', render: (v: number) => v === 0 ? 'All' : v },
        { title: 'Protocol', dataIndex: 'protocol', key: 'protocol', render: (v: string) => v.toUpperCase() },
        { title: 'Source', dataIndex: 'source', key: 'source' },
        {
            title: 'Action',
            dataIndex: 'action',
            key: 'action',
            render: (action: string) => (
                <Tag color={action === 'allow' ? 'green' : 'red'}>
                    {action === 'allow' ? '✅ Allow' : '❌ Deny'}
                </Tag>
            )
        },
        { title: 'Description', dataIndex: 'description', key: 'description' },
        {
            title: 'Status',
            dataIndex: 'enabled',
            key: 'enabled',
            render: (enabled: boolean) => (
                <Tag color={enabled ? 'green' : 'grey'}>
                    {enabled ? '● Active' : '○ Disabled'}
                </Tag>
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: unknown, record: FirewallRule) => (
                <Popconfirm
                    title="🗑️ Xoá Rule?"
                    content="Rule firewall này sẽ bị xoá."
                    onConfirm={() => deleteRuleMutation.mutate(record.id)}
                    position="left"
                    okText="Xoá"
                    cancelText="Huỷ"
                    okType="danger"
                >
                    <Button icon={<IconDelete />} theme="borderless" size="small" type="danger" />
                </Popconfirm>
            )
        }
    ];

    const sslColumns = [
        { title: 'Domain', dataIndex: 'domain', key: 'domain' },
        {
            title: 'Provider',
            dataIndex: 'provider',
            key: 'provider',
            render: (provider: string) => {
                const labels: Record<string, string> = {
                    'letsencrypt': "🔒 Let's Encrypt",
                    'custom': '📜 Custom',
                    'self-signed': '🔐 Self-signed'
                };
                return labels[provider] || provider;
            }
        },
        {
            title: 'Expires',
            dataIndex: 'expiresAt',
            key: 'expiresAt',
            render: (date: string) => {
                const d = new Date(date);
                const daysLeft = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                    <span>
                        {d.toLocaleDateString()}
                        {daysLeft <= 30 && daysLeft > 0 && (
                            <Tag color="orange" style={{ marginLeft: 8 }}>{daysLeft}d left</Tag>
                        )}
                    </span>
                );
            }
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const colors: Record<string, 'green' | 'orange' | 'red' | 'blue' | 'grey'> = {
                    valid: 'green',
                    expiring: 'orange',
                    expired: 'red',
                    pending: 'blue',
                    error: 'red'
                };
                const labels: Record<string, string> = {
                    valid: '✓ Valid',
                    expiring: '⚠ Expiring',
                    expired: '✗ Expired',
                    pending: '⏳ Pending',
                    error: '✗ Error'
                };
                return <Tag color={colors[status] || 'grey'}>{labels[status] || status}</Tag>;
            }
        },
        {
            title: 'Auto Renew',
            dataIndex: 'autoRenew',
            key: 'autoRenew',
            render: (auto: boolean) => auto ? '✓' : '-'
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: unknown, record: SSLCertificate) => (
                <div className="table-actions">
                    <Button
                        size="small"
                        theme="borderless"
                        onClick={() => renewCertMutation.mutate(record.id)}
                        loading={renewCertMutation.isPending}
                    >
                        🔄 Renew
                    </Button>
                    <Popconfirm
                        title="🗑️ Xoá Certificate?"
                        content="Chứng chỉ SSL này sẽ bị xoá khỏi hệ thống."
                        onConfirm={() => deleteCertMutation.mutate(record.id)}
                        position="left"
                        okText="Xoá"
                        cancelText="Huỷ"
                        okType="danger"
                    >
                        <Button icon={<IconDelete />} theme="borderless" size="small" type="danger" />
                    </Popconfirm>
                </div>
            )
        }
    ];

    if (loadingRules) {
        return (
            <div className="loading-container">
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className="security-page page-enter">
            <div className="page-header">
                <div>
                    <Title heading={3} className="page-title">🔒 Security</Title>
                    <Text type="secondary" className="page-subtitle">
                        Firewall, SSL, and security management
                    </Text>
                </div>
                <Button
                    icon={<IconRefresh />}
                    onClick={() => {
                        queryClient.invalidateQueries({ queryKey: ['firewallRules'] });
                        queryClient.invalidateQueries({ queryKey: ['sslCertificates'] });
                    }}
                >
                    Refresh
                </Button>
            </div>

            {/* Security Score */}
            <Card className="security-score-card">
                <div className="score-container">
                    <div className="score-circle">
                        <Progress
                            percent={securityScore}
                            type="circle"
                            width={120}
                            strokeWidth={8}
                            stroke={securityScore >= 80 ? '#00c853' : securityScore >= 60 ? '#ffab00' : '#ff3d00'}
                            format={() => (
                                <div className="score-value">
                                    <span className="score-number">{securityScore}</span>
                                    <span className="score-label">/100</span>
                                </div>
                            )}
                        />
                    </div>
                    <div className="score-details">
                        <Title heading={4}>Security Score</Title>
                        <div className="score-stats">
                            <Tag color="green">✅ {firewallRules.length} Firewall Rules</Tag>
                            <Tag color="green">🔒 {validCerts} Valid Certs</Tag>
                            {expiringCerts > 0 && <Tag color="orange">⚠️ {expiringCerts} Expiring</Tag>}
                            {expiredCerts > 0 && <Tag color="red">❌ {expiredCerts} Expired</Tag>}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Status Cards */}
            <div className="security-status-row">
                <Card className="status-card">
                    <div className="status-header">
                        <span className="status-icon">🔥</span>
                        <Text strong>Firewall</Text>
                        <Tag color="green">🟢</Tag>
                    </div>
                    <div className="status-stats">
                        <div className="stat">
                            <Text type="secondary">Active Rules</Text>
                            <Text strong>{activeRules}</Text>
                        </div>
                        <div className="stat">
                            <Text type="secondary">Blocked IPs</Text>
                            <Text strong>{firewallRules.filter(r => r.action === 'deny').length}</Text>
                        </div>
                    </div>
                </Card>

                <Card className="status-card">
                    <div className="status-header">
                        <span className="status-icon">🔐</span>
                        <Text strong>SSL Certificates</Text>
                        <Tag color={expiredCerts > 0 ? 'red' : expiringCerts > 0 ? 'orange' : 'green'}>
                            {expiredCerts > 0 ? '🔴' : expiringCerts > 0 ? '🟡' : '🟢'}
                        </Tag>
                    </div>
                    <div className="status-stats">
                        <div className="stat">
                            <Text type="secondary">Total Certs</Text>
                            <Text strong>{sslCerts.length}</Text>
                        </div>
                        <div className="stat">
                            <Text type="secondary">Valid</Text>
                            <Text strong>{validCerts}</Text>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Firewall Rules */}
            <Card
                className="security-section-card"
                title="Firewall Rules"
                headerExtraContent={
                    <div className="card-actions">
                        <Button icon={<IconPlus />} size="small" onClick={() => setAddRuleModalVisible(true)}>
                            Open Port
                        </Button>
                        <Button size="small" onClick={() => setBlockIPModalVisible(true)}>
                            🚫 Block IP
                        </Button>
                    </div>
                }
            >
                <Table
                    columns={firewallColumns}
                    dataSource={firewallRules}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    className="security-table"
                />
            </Card>

            {/* SSL Certificates */}
            <Card className="security-section-card" title="SSL Certificates">
                <Table
                    columns={sslColumns}
                    dataSource={sslCerts}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    className="security-table"
                />
            </Card>

            {/* Add Rule Modal */}
            <Modal
                title="Open Port"
                visible={addRuleModalVisible}
                onCancel={() => setAddRuleModalVisible(false)}
                footer={null}
            >
                <Form onSubmit={handleAddRule} labelPosition="left" labelWidth={100}>
                    <Form.InputNumber field="port" label="Port" placeholder="80" rules={[{ required: true }]} />
                    <Form.Select field="protocol" label="Protocol" initValue="tcp" optionList={[
                        { value: 'tcp', label: 'TCP' },
                        { value: 'udp', label: 'UDP' },
                        { value: 'both', label: 'TCP + UDP' },
                    ]} />
                    <Form.Input field="source" label="Source" placeholder="0.0.0.0/0 (Any)" initValue="0.0.0.0/0" />
                    <Form.Input field="description" label="Description" placeholder="HTTP Server" />
                    <div style={{ textAlign: 'right', marginTop: 16 }}>
                        <Button onClick={() => setAddRuleModalVisible(false)} style={{ marginRight: 8 }}>Cancel</Button>
                        <Button htmlType="submit" theme="solid" type="primary" loading={createRuleMutation.isPending}>Add Rule</Button>
                    </div>
                </Form>
            </Modal>

            {/* Block IP Modal */}
            <Modal
                title="Block IP"
                visible={blockIPModalVisible}
                onCancel={() => setBlockIPModalVisible(false)}
                footer={null}
            >
                <Form onSubmit={handleBlockIP} labelPosition="left" labelWidth={100}>
                    <Form.Input field="ip" label="IP Address" placeholder="192.168.1.100 or 10.0.0.0/8" rules={[{ required: true }]} />
                    <Form.Input field="reason" label="Reason" placeholder="Suspicious activity" />
                    <div style={{ textAlign: 'right', marginTop: 16 }}>
                        <Button onClick={() => setBlockIPModalVisible(false)} style={{ marginRight: 8 }}>Cancel</Button>
                        <Button htmlType="submit" theme="solid" type="danger" loading={createRuleMutation.isPending}>Block IP</Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default Security;
