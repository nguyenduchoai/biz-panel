/**
 * Security Page
 */
import React, { useState } from 'react';
import { Typography, Card, Button, Tag, Progress, Table, Spin, Modal, Form, Toast } from '@douyinfe/semi-ui';
import { IconPlus, IconDelete } from '@douyinfe/semi-icons';
import { useQuery } from '@tanstack/react-query';
import { getFirewallRules, getBlockedIPs, getFail2banJails, getSSLCertificates } from '../services/mockApi';
import './Security.css';

const { Title, Text } = Typography;

const Security: React.FC = () => {
    const [addRuleModalVisible, setAddRuleModalVisible] = useState(false);
    const [blockIPModalVisible, setBlockIPModalVisible] = useState(false);

    const { data: firewallRules, isLoading: loadingRules } = useQuery({
        queryKey: ['firewallRules'],
        queryFn: getFirewallRules,
    });

    const { data: blockedIPs } = useQuery({
        queryKey: ['blockedIPs'],
        queryFn: getBlockedIPs,
    });

    const { data: jails } = useQuery({
        queryKey: ['fail2banJails'],
        queryFn: getFail2banJails,
    });

    const { data: certificates } = useQuery({
        queryKey: ['sslCertificates'],
        queryFn: getSSLCertificates,
    });

    const securityScore = 82;
    const checksPassedCount = 45;
    const warningCount = 3;
    const criticalCount = 2;

    const firewallColumns = [
        { title: 'Port', dataIndex: 'port', key: 'port' },
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
            title: 'Actions',
            key: 'actions',
            render: () => (
                <div className="table-actions">
                    <Button icon="⚙️" theme="borderless" size="small" />
                    <Button icon={<IconDelete />} theme="borderless" size="small" type="danger" />
                </div>
            )
        }
    ];

    const blockedIPColumns = [
        { title: 'IP/CIDR', dataIndex: 'ip', key: 'ip' },
        { title: 'Reason', dataIndex: 'reason', key: 'reason' },
        {
            title: 'Source',
            dataIndex: 'source',
            key: 'source',
            render: (source: string) => (
                <Tag>{source}</Tag>
            )
        },
        {
            title: 'Blocked At',
            dataIndex: 'blockedAt',
            key: 'blockedAt',
            render: (date: string) => new Date(date).toLocaleString()
        },
        {
            title: '',
            key: 'actions',
            render: () => (
                <Button icon={<IconDelete />} theme="borderless" size="small" type="danger" />
            )
        }
    ];

    const sslColumns = [
        { title: 'Domain', dataIndex: 'domain', key: 'domain' },
        {
            title: 'Provider',
            dataIndex: 'provider',
            key: 'provider',
            render: (provider: string) => provider === 'letsencrypt' ? "Let's Encrypt" : 'Custom'
        },
        {
            title: 'Expires',
            dataIndex: 'expiresAt',
            key: 'expiresAt',
            render: (date: string) => new Date(date).toLocaleDateString()
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const colors: Record<string, 'green' | 'orange' | 'red'> = {
                    valid: 'green',
                    expiring: 'orange',
                    expired: 'red'
                };
                return <Tag color={colors[status] || 'grey'}>{status}</Tag>;
            }
        },
        {
            title: '',
            key: 'actions',
            render: () => (
                <Button icon="🔄" theme="borderless" size="small">Renew</Button>
            )
        }
    ];

    const handleAddRule = () => {
        Toast.success('Firewall rule added!');
        setAddRuleModalVisible(false);
    };

    const handleBlockIP = () => {
        Toast.success('IP blocked successfully!');
        setBlockIPModalVisible(false);
    };

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
                    <Title heading={3} className="page-title">Security</Title>
                    <Text type="secondary" className="page-subtitle">
                        Firewall, SSL, and security management
                    </Text>
                </div>
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
                            <Tag color="green">✅ {checksPassedCount} Checks Passed</Tag>
                            <Tag color="orange">⚠️ {warningCount} Warnings</Tag>
                            <Tag color="red">❌ {criticalCount} Critical</Tag>
                        </div>
                        <Button theme="borderless" className="view-report-btn">View Detailed Report</Button>
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
                            <Text strong>{firewallRules?.length || 0}</Text>
                        </div>
                        <div className="stat">
                            <Text type="secondary">Blocked IPs</Text>
                            <Text strong>{blockedIPs?.length || 0}</Text>
                        </div>
                    </div>
                </Card>

                <Card className="status-card">
                    <div className="status-header">
                        <span className="status-icon">🛡️</span>
                        <Text strong>Fail2ban</Text>
                        <Tag color="green">🟢</Tag>
                    </div>
                    <div className="status-stats">
                        <div className="stat">
                            <Text type="secondary">Active Jails</Text>
                            <Text strong>{jails?.length || 0}</Text>
                        </div>
                        <div className="stat">
                            <Text type="secondary">Banned IPs</Text>
                            <Text strong>{jails?.reduce((acc, j) => acc + j.currentlyBanned, 0) || 0}</Text>
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
                        <Button icon="🚫" size="small" onClick={() => setBlockIPModalVisible(true)}>
                            Block IP
                        </Button>
                    </div>
                }
            >
                <Table
                    columns={firewallColumns}
                    dataSource={firewallRules}
                    pagination={false}
                    size="small"
                    className="security-table"
                />
            </Card>

            {/* Blocked IPs */}
            <Card className="security-section-card" title="IP Blocklist">
                <Table
                    columns={blockedIPColumns}
                    dataSource={blockedIPs}
                    pagination={false}
                    size="small"
                    className="security-table"
                />
            </Card>

            {/* SSL Certificates */}
            <Card className="security-section-card" title="SSL Certificates">
                <Table
                    columns={sslColumns}
                    dataSource={certificates}
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
                footer={
                    <>
                        <Button onClick={() => setAddRuleModalVisible(false)}>Cancel</Button>
                        <Button theme="solid" type="primary" onClick={handleAddRule}>Add Rule</Button>
                    </>
                }
            >
                <Form layout="vertical">
                    <Form.InputNumber field="port" label="Port" placeholder="80" rules={[{ required: true }]} />
                    <Form.Select field="protocol" label="Protocol" initValue="tcp" optionList={[
                        { value: 'tcp', label: 'TCP' },
                        { value: 'udp', label: 'UDP' },
                        { value: 'both', label: 'TCP + UDP' },
                    ]} />
                    <Form.Input field="source" label="Source" placeholder="0.0.0.0/0 (Any)" initValue="0.0.0.0/0" />
                    <Form.Input field="description" label="Description" placeholder="HTTP Server" />
                </Form>
            </Modal>

            {/* Block IP Modal */}
            <Modal
                title="Block IP"
                visible={blockIPModalVisible}
                onCancel={() => setBlockIPModalVisible(false)}
                footer={
                    <>
                        <Button onClick={() => setBlockIPModalVisible(false)}>Cancel</Button>
                        <Button theme="solid" type="danger" onClick={handleBlockIP}>Block IP</Button>
                    </>
                }
            >
                <Form layout="vertical">
                    <Form.Input field="ip" label="IP Address or CIDR" placeholder="192.168.1.100 or 10.0.0.0/8" rules={[{ required: true }]} />
                    <Form.Input field="reason" label="Reason" placeholder="Suspicious activity" />
                </Form>
            </Modal>
        </div>
    );
};

export default Security;
