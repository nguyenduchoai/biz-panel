/**
 * Websites Page
 */
import React, { useState } from 'react';
import { Typography, Card, Button, Tag, Input, Select, Spin, Modal, Form, Toast } from '@douyinfe/semi-ui';
import { IconPlus, IconSearch, IconSetting, IconFile, IconDelete } from '@douyinfe/semi-icons';
import { useQuery } from '@tanstack/react-query';
import { getWebsites } from '../services/mockApi';
import type { Website } from '../types';
import './Websites.css';

const { Title, Text } = Typography;

const Websites: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [engineFilter, setEngineFilter] = useState<string>('all');
    const [createModalVisible, setCreateModalVisible] = useState(false);

    const { data: websites, isLoading } = useQuery({
        queryKey: ['websites'],
        queryFn: getWebsites,
    });

    const filteredWebsites = websites?.filter((site) => {
        const matchesSearch = site.domain.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesEngine = engineFilter === 'all' || site.engine === engineFilter;
        return matchesSearch && matchesEngine;
    });

    const getStatusColor = (status: Website['status']) => {
        switch (status) {
            case 'running': return 'green';
            case 'stopped': return 'red';
            case 'updating': return 'orange';
            default: return 'grey';
        }
    };

    const getSSLDaysRemaining = (expiresAt?: string) => {
        if (!expiresAt) return null;
        const now = new Date();
        const expires = new Date(expiresAt);
        const diff = expires.getTime() - now.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    };

    const handleCreateWebsite = () => {
        Toast.success('Website created successfully!');
        setCreateModalVisible(false);
    };

    return (
        <div className="websites-page page-enter">
            <div className="page-header">
                <div>
                    <Title heading={3} className="page-title">Websites</Title>
                    <Text type="secondary" className="page-subtitle">
                        Manage your web applications ({websites?.length || 0} sites)
                    </Text>
                </div>
                <Button
                    icon={<IconPlus />}
                    theme="solid"
                    type="primary"
                    onClick={() => setCreateModalVisible(true)}
                >
                    Create Website
                </Button>
            </div>

            {/* Filters */}
            <div className="websites-filters">
                <Input
                    prefix={<IconSearch />}
                    placeholder="Search domains..."
                    value={searchTerm}
                    onChange={setSearchTerm}
                    showClear
                    className="search-input"
                />
                <Select
                    value={engineFilter}
                    onChange={(v) => setEngineFilter(String(v))}
                    style={{ width: 150 }}
                    optionList={[
                        { value: 'all', label: 'All Engines' },
                        { value: 'nginx', label: 'NGINX' },
                        { value: 'apache', label: 'Apache' },
                        { value: 'openlitespeed', label: 'OpenLiteSpeed' },
                    ]}
                />
            </div>

            {/* Website List */}
            {isLoading ? (
                <div className="loading-container">
                    <Spin size="large" />
                </div>
            ) : (
                <div className="websites-list">
                    {filteredWebsites?.map((website) => {
                        const sslDays = getSSLDaysRemaining(website.ssl.expiresAt);

                        return (
                            <Card key={website.id} className="website-card">
                                <div className="website-header">
                                    <div className="website-domain">
                                        <span className="domain-icon">🌐</span>
                                        <Text strong className="domain-name">{website.domain}</Text>
                                    </div>
                                    <Tag color={getStatusColor(website.status)} className="status-tag">
                                        {website.status === 'running' ? '● Active' :
                                            website.status === 'updating' ? '◐ Updating' : '○ Stopped'}
                                    </Tag>
                                </div>

                                <div className="website-info">
                                    <div className="info-row">
                                        <span className="info-label">Engine:</span>
                                        <span className="info-value">{website.engine.toUpperCase()}</span>
                                    </div>
                                    {website.phpVersion && (
                                        <div className="info-row">
                                            <span className="info-label">PHP:</span>
                                            <span className="info-value">{website.phpVersion}</span>
                                        </div>
                                    )}
                                    {website.projectType === 'static' && (
                                        <div className="info-row">
                                            <span className="info-label">Type:</span>
                                            <span className="info-value">Static</span>
                                        </div>
                                    )}
                                    {website.projectType === 'node' && (
                                        <div className="info-row">
                                            <span className="info-label">Type:</span>
                                            <span className="info-value">Node.js</span>
                                        </div>
                                    )}
                                    <div className="info-row">
                                        <span className="info-label">SSL:</span>
                                        <span className="info-value">
                                            {website.ssl.enabled ? (
                                                <>
                                                    🔒 {website.ssl.provider === 'letsencrypt' ? "Let's Encrypt" : 'Custom'}
                                                    {sslDays !== null && (
                                                        <Tag
                                                            color={sslDays > 30 ? 'green' : sslDays > 7 ? 'orange' : 'red'}
                                                            size="small"
                                                            style={{ marginLeft: 8 }}
                                                        >
                                                            {sslDays}d
                                                        </Tag>
                                                    )}
                                                </>
                                            ) : (
                                                '🔓 Disabled'
                                            )}
                                        </span>
                                    </div>
                                </div>

                                <div className="website-root">
                                    <Text type="secondary" size="small">
                                        Root: {website.documentRoot}
                                    </Text>
                                </div>

                                <div className="website-actions">
                                    <Button icon={<IconSetting />} theme="borderless" size="small">Settings</Button>
                                    <Button icon="📊" theme="borderless" size="small">Stats</Button>
                                    <Button icon={<IconFile />} theme="borderless" size="small">Files</Button>
                                    <Button icon="📜" theme="borderless" size="small">Logs</Button>
                                    <Button icon={<IconDelete />} theme="borderless" type="danger" size="small" />
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Create Modal */}
            <Modal
                title="Create Website"
                visible={createModalVisible}
                onCancel={() => setCreateModalVisible(false)}
                footer={
                    <>
                        <Button onClick={() => setCreateModalVisible(false)}>Cancel</Button>
                        <Button theme="solid" type="primary" onClick={handleCreateWebsite}>Create</Button>
                    </>
                }
                width={600}
            >
                <Form layout="vertical">
                    <Form.Input field="domain" label="Domain" placeholder="example.com" rules={[{ required: true }]} />
                    <Form.TextArea field="aliases" label="Aliases (one per line)" placeholder="www.example.com" rows={2} />

                    <Form.RadioGroup field="engine" label="Web Engine" initValue="nginx">
                        <Form.Radio value="nginx">NGINX (Recommended)</Form.Radio>
                        <Form.Radio value="apache">Apache</Form.Radio>
                        <Form.Radio value="openlitespeed">OpenLiteSpeed</Form.Radio>
                    </Form.RadioGroup>

                    <Form.RadioGroup field="projectType" label="Project Type" initValue="php">
                        <Form.Radio value="php">🐘 PHP</Form.Radio>
                        <Form.Radio value="node">⬢ Node.js</Form.Radio>
                        <Form.Radio value="static">📄 Static</Form.Radio>
                        <Form.Radio value="proxy">🔀 Proxy</Form.Radio>
                    </Form.RadioGroup>

                    <Form.Switch field="ssl" label="Enable SSL (Let's Encrypt)" initValue={true} />
                </Form>
            </Modal>
        </div>
    );
};

export default Websites;
