/**
 * SSL Certificates Page
 * Manage SSL/TLS certificates with Let's Encrypt integration
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
    Empty,
    Spin,
} from '@douyinfe/semi-ui';
import {
    IconPlus,
    IconRefresh,
    IconDelete,
    IconTick,
    IconClose,
} from '@douyinfe/semi-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSSLCertificates, requestLetsEncrypt, generateSelfSignedCert, deleteSSLCertificate, renewSSLCertificate, type SSLCertificate } from '../services/api';
import './SSL.css';

const { Title, Text } = Typography;

const SSL: React.FC = () => {
    const queryClient = useQueryClient();
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'letsencrypt' | 'self-signed'>('letsencrypt');
    const [isRequesting, setIsRequesting] = useState(false);

    // Fetch certificates
    const { data: certificates = [], isLoading } = useQuery({
        queryKey: ['ssl-certificates'],
        queryFn: getSSLCertificates,
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: deleteSSLCertificate,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ssl-certificates'] });
            Toast.success('Certificate deleted');
        },
        onError: (err: Error) => {
            Toast.error(err.message);
        },
    });

    // Renew mutation
    const renewMutation = useMutation({
        mutationFn: renewSSLCertificate,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ssl-certificates'] });
            Toast.success('Certificate renewed');
        },
        onError: (err: Error) => {
            Toast.error(err.message);
        },
    });

    const handleRequestCert = async (values: { domain: string; email?: string }) => {
        setIsRequesting(true);
        try {
            if (modalType === 'letsencrypt') {
                await requestLetsEncrypt(values.domain, values.email || 'admin@' + values.domain);
                Toast.success(`Let's Encrypt certificate issued for ${values.domain}`);
            } else {
                await generateSelfSignedCert(values.domain);
                Toast.success(`Self-signed certificate generated for ${values.domain}`);
            }
            queryClient.invalidateQueries({ queryKey: ['ssl-certificates'] });
            setModalVisible(false);
        } catch (err: any) {
            Toast.error(err.message || 'Failed to issue certificate');
        } finally {
            setIsRequesting(false);
        }
    };

    const handleDelete = (cert: SSLCertificate) => {
        Modal.confirm({
            title: 'Delete Certificate',
            content: `Are you sure you want to delete the certificate for ${cert.domain}?`,
            onOk: () => {
                deleteMutation.mutate(cert.id);
            },
        });
    };

    const handleRenew = (cert: SSLCertificate) => {
        renewMutation.mutate(cert.id);
    };

    const getStatusColor = (status: string): 'green' | 'orange' | 'red' | 'grey' => {
        switch (status) {
            case 'valid': return 'green';
            case 'expiring': return 'orange';
            case 'expired': return 'red';
            default: return 'grey';
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getDaysUntilExpiry = (expiresAt: string) => {
        const now = new Date();
        const expiry = new Date(expiresAt);
        const diff = expiry.getTime() - now.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    const columns = [
        {
            title: 'Domain',
            dataIndex: 'domain',
            render: (text: string) => (
                <div className="domain-cell">
                    <span className="lock-icon">🔒</span>
                    <Text strong>{text}</Text>
                </div>
            ),
        },
        {
            title: 'Issuer',
            dataIndex: 'issuer',
            render: (text: string, record: SSLCertificate) => (
                <Tag color={record.provider === 'letsencrypt' ? 'blue' : 'grey'}>
                    {text}
                </Tag>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            render: (status: string) => (
                <Tag color={getStatusColor(status)}>
                    {status === 'valid' && <IconTick size="small" />}
                    {status === 'expired' && <IconClose size="small" />}
                    {' '}{status.charAt(0).toUpperCase() + status.slice(1)}
                </Tag>
            ),
        },
        {
            title: 'Expires',
            dataIndex: 'expiresAt',
            render: (date: string) => {
                const days = getDaysUntilExpiry(date);
                return (
                    <div className="expiry-cell">
                        <Text>{formatDate(date)}</Text>
                        <Text type={days < 30 ? 'danger' : 'secondary'} size="small">
                            {days > 0 ? `${days} days left` : 'Expired'}
                        </Text>
                    </div>
                );
            },
        },
        {
            title: 'Auto-Renew',
            dataIndex: 'autoRenew',
            render: (autoRenew: boolean) => (
                <Tag color={autoRenew ? 'green' : 'grey'}>
                    {autoRenew ? 'Enabled' : 'Disabled'}
                </Tag>
            ),
        },
        {
            title: 'Actions',
            render: (_: unknown, record: SSLCertificate) => (
                <div className="action-buttons">
                    {record.provider === 'letsencrypt' && (
                        <Button
                            size="small"
                            theme="borderless"
                            loading={renewMutation.isPending}
                            onClick={() => handleRenew(record)}
                        >
                            Renew
                        </Button>
                    )}
                    <Button
                        size="small"
                        theme="borderless"
                        type="danger"
                        icon={<IconDelete />}
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
        <div className="ssl-page page-enter">
            <div className="page-header">
                <div>
                    <Title heading={3} className="page-title">SSL Certificates</Title>
                    <Text type="secondary" className="page-subtitle">
                        Manage SSL/TLS certificates with automatic Let's Encrypt renewal
                    </Text>
                </div>
                <div className="page-actions">
                    <Button
                        icon={<IconRefresh />}
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['ssl-certificates'] })}
                    >
                        Refresh
                    </Button>
                    <Button
                        icon={<IconPlus />}
                        onClick={() => {
                            setModalType('self-signed');
                            setModalVisible(true);
                        }}
                    >
                        Self-Signed
                    </Button>
                    <Button
                        icon={<IconPlus />}
                        type="primary"
                        theme="solid"
                        onClick={() => {
                            setModalType('letsencrypt');
                            setModalVisible(true);
                        }}
                    >
                        Let's Encrypt
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="ssl-summary">
                <Card className="summary-card">
                    <div className="summary-icon valid">🔒</div>
                    <div className="summary-content">
                        <Text type="secondary">Valid</Text>
                        <Title heading={2}>
                            {certificates.filter(c => c.status === 'valid').length}
                        </Title>
                    </div>
                </Card>
                <Card className="summary-card">
                    <div className="summary-icon expiring">⚠️</div>
                    <div className="summary-content">
                        <Text type="secondary">Expiring Soon</Text>
                        <Title heading={2}>
                            {certificates.filter(c => c.status === 'expiring').length}
                        </Title>
                    </div>
                </Card>
                <Card className="summary-card">
                    <div className="summary-icon expired">❌</div>
                    <div className="summary-content">
                        <Text type="secondary">Expired</Text>
                        <Title heading={2}>
                            {certificates.filter(c => c.status === 'expired').length}
                        </Title>
                    </div>
                </Card>
                <Card className="summary-card">
                    <div className="summary-icon total">📜</div>
                    <div className="summary-content">
                        <Text type="secondary">Total</Text>
                        <Title heading={2}>{certificates.length}</Title>
                    </div>
                </Card>
            </div>

            {/* Certificates Table */}
            <Card className="certificates-card">
                {certificates.length > 0 ? (
                    <Table
                        columns={columns}
                        dataSource={certificates}
                        rowKey="id"
                        pagination={false}
                    />
                ) : (
                    <Empty
                        image={<span style={{ fontSize: 48 }}>🔐</span>}
                        description="No SSL certificates yet"
                    >
                        <Button type="primary" onClick={() => setModalVisible(true)}>
                            Issue First Certificate
                        </Button>
                    </Empty>
                )}
            </Card>

            {/* Request Certificate Modal */}
            <Modal
                title={modalType === 'letsencrypt' ? "Issue Let's Encrypt Certificate" : 'Generate Self-Signed Certificate'}
                visible={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
            >
                <Form onSubmit={handleRequestCert}>
                    <Form.Input
                        field="domain"
                        label="Domain"
                        placeholder="example.com"
                        rules={[{ required: true, message: 'Domain is required' }]}
                    />

                    {modalType === 'letsencrypt' && (
                        <Form.Input
                            field="email"
                            label="Email"
                            placeholder="admin@example.com"
                            rules={[{ type: 'email', message: 'Invalid email' }]}
                        />
                    )}

                    <div className="modal-info">
                        {modalType === 'letsencrypt' ? (
                            <Text type="secondary">
                                ℹ️ Domain must be publicly accessible and point to this server.
                                Let's Encrypt certificates are valid for 90 days and auto-renew.
                            </Text>
                        ) : (
                            <Text type="secondary">
                                ⚠️ Self-signed certificates will show browser warnings.
                                Use only for development/testing.
                            </Text>
                        )}
                    </div>

                    <div className="modal-actions">
                        <Button onClick={() => setModalVisible(false)}>Cancel</Button>
                        <Button type="primary" htmlType="submit" loading={isRequesting}>
                            {modalType === 'letsencrypt' ? 'Issue Certificate' : 'Generate Certificate'}
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default SSL;
export { SSL };
