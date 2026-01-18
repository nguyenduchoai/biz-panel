/**
 * App Store Page
 */
import React, { useState } from 'react';
import { Typography, Card, Button, Tag, Input, Spin, Modal, Form, Toast } from '@douyinfe/semi-ui';
import { IconSearch, IconStar } from '@douyinfe/semi-icons';
import { useQuery } from '@tanstack/react-query';
import { getAppTemplates } from '../services/mockApi';
import type { AppTemplate } from '../types';
import './AppStore.css';

const { Title, Text } = Typography;

const AppStore: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedApp, setSelectedApp] = useState<AppTemplate | null>(null);
    const [installModalVisible, setInstallModalVisible] = useState(false);

    const { data: apps, isLoading } = useQuery({
        queryKey: ['appTemplates'],
        queryFn: getAppTemplates,
    });

    const categories = [
        { key: 'all', label: 'All' },
        { key: 'featured', label: 'Featured' },
        { key: 'cms', label: 'CMS' },
        { key: 'database', label: 'Database' },
        { key: 'devops', label: 'DevOps' },
        { key: 'analytics', label: 'Analytics' },
        { key: 'monitoring', label: 'Monitoring' },
        { key: 'communication', label: 'Communication' },
    ];

    const filteredApps = apps?.filter((app) => {
        const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleInstall = (app: AppTemplate) => {
        setSelectedApp(app);
        setInstallModalVisible(true);
    };

    const handleConfirmInstall = () => {
        Toast.success(`${selectedApp?.name} installing...`);
        setInstallModalVisible(false);
    };

    if (isLoading) {
        return (
            <div className="loading-container">
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className="appstore-page page-enter">
            <div className="page-header">
                <div>
                    <Title heading={3} className="page-title">App Store</Title>
                    <Text type="secondary" className="page-subtitle">
                        One-click install popular applications
                    </Text>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="appstore-filters">
                <Input
                    prefix={<IconSearch />}
                    placeholder="Search applications..."
                    value={searchTerm}
                    onChange={setSearchTerm}
                    showClear
                    className="search-input"
                />
            </div>

            {/* Category Tabs */}
            <div className="category-tabs">
                {categories.map((cat) => (
                    <Button
                        key={cat.key}
                        theme={selectedCategory === cat.key ? 'solid' : 'borderless'}
                        type={selectedCategory === cat.key ? 'primary' : 'tertiary'}
                        onClick={() => setSelectedCategory(cat.key)}
                        className="category-btn"
                    >
                        {cat.label}
                    </Button>
                ))}
            </div>

            {/* Apps Grid */}
            <div className="apps-grid">
                {filteredApps?.map((app) => (
                    <Card key={app.id} className="app-card">
                        <div className="app-icon">{app.icon}</div>
                        <div className="app-info">
                            <Text strong className="app-name">{app.name}</Text>
                            <Text type="secondary" size="small" className="app-description">
                                {app.description}
                            </Text>
                            <div className="app-meta">
                                <span className="app-version">v{app.version}</span>
                                <span className="app-rating">
                                    <IconStar style={{ color: '#ffab00' }} size="small" />
                                    {app.stars}
                                </span>
                            </div>
                            <div className="app-tags">
                                {app.tags.slice(0, 2).map((tag) => (
                                    <Tag key={tag} size="small">{tag}</Tag>
                                ))}
                            </div>
                        </div>
                        <div className="app-actions">
                            {app.installed ? (
                                <Button disabled size="small" className="installed-btn">
                                    ✓ Installed
                                </Button>
                            ) : (
                                <Button
                                    theme="solid"
                                    type="primary"
                                    size="small"
                                    onClick={() => handleInstall(app)}
                                >
                                    Install
                                </Button>
                            )}
                        </div>
                    </Card>
                ))}
            </div>

            {filteredApps?.length === 0 && (
                <div className="empty-state">
                    <Text type="secondary">No applications found</Text>
                </div>
            )}

            {/* Install Modal */}
            <Modal
                title={`Install ${selectedApp?.name || ''}`}
                visible={installModalVisible}
                onCancel={() => setInstallModalVisible(false)}
                footer={
                    <>
                        <Button onClick={() => setInstallModalVisible(false)}>Cancel</Button>
                        <Button theme="solid" type="primary" onClick={handleConfirmInstall}>Install Now</Button>
                    </>
                }
                width={500}
            >
                {selectedApp && (
                    <div className="install-modal-content">
                        <div className="install-app-header">
                            <span className="install-app-icon">{selectedApp.icon}</span>
                            <div>
                                <Title heading={5}>{selectedApp.name}</Title>
                                <Text type="secondary">{selectedApp.description}</Text>
                                <div className="install-app-meta">
                                    <Tag>v{selectedApp.version}</Tag>
                                    <span className="install-rating">
                                        <IconStar style={{ color: '#ffab00' }} size="small" />
                                        {selectedApp.stars} ({selectedApp.installs.toLocaleString()}+ installs)
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="install-requirements">
                            <Text strong>Requirements:</Text>
                            <div className="requirements-list">
                                <Tag>Memory: {selectedApp.requirements.memory}</Tag>
                                <Tag>Disk: {selectedApp.requirements.disk}</Tag>
                            </div>
                        </div>

                        <Form layout="vertical">
                            <Form.Select
                                field="domain"
                                label="Domain"
                                placeholder="Select a domain"
                                optionList={[
                                    { value: 'app.example.com', label: 'app.example.com' },
                                    { value: 'blog.example.com', label: 'blog.example.com' },
                                ]}
                            />
                            <Form.RadioGroup field="database" label="Database" initValue="new">
                                <Form.Radio value="new">Create new database</Form.Radio>
                                <Form.Radio value="existing">Use existing database</Form.Radio>
                            </Form.RadioGroup>
                        </Form>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AppStore;
