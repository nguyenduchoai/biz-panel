/**
 * App Store Page - Real API Integration
 * One-click deploy applications from templates
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
    Empty,
} from '@douyinfe/semi-ui';
import { IconSearch, IconServer } from '@douyinfe/semi-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getTemplates,
    getTemplateCategories,
    deployTemplate,
    type AppTemplate,
} from '../services/api';
import './AppStore.css';

const { Title, Text } = Typography;

const AppStore: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedApp, setSelectedApp] = useState<AppTemplate | null>(null);
    const [installModalVisible, setInstallModalVisible] = useState(false);
    const queryClient = useQueryClient();

    const { data: templatesData, isLoading } = useQuery({
        queryKey: ['templates', selectedCategory, searchTerm],
        queryFn: () => getTemplates(selectedCategory || undefined, searchTerm || undefined),
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['templateCategories'],
        queryFn: getTemplateCategories,
    });

    const deployMutation = useMutation({
        mutationFn: ({ id, name, env }: { id: string; name: string; env?: Record<string, string> }) =>
            deployTemplate(id, name, undefined, env),
        onSuccess: () => {
            Toast.success(`${selectedApp?.name} deployed successfully!`);
            setInstallModalVisible(false);
            queryClient.invalidateQueries({ queryKey: ['containers'] });
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const templates = templatesData?.templates || [];

    const handleInstall = (app: AppTemplate) => {
        setSelectedApp(app);
        setInstallModalVisible(true);
    };

    const handleConfirmInstall = (values: Record<string, unknown>) => {
        if (!selectedApp) return;

        const env: Record<string, string> = {};
        // Collect environment variables from form
        Object.entries(selectedApp.environment).forEach(([key]) => {
            if (values[key]) {
                env[key] = String(values[key]);
            }
        });

        deployMutation.mutate({
            id: selectedApp.id,
            name: (values.containerName as string) || selectedApp.id,
            env,
        });
    };

    const allCategories = [
        { name: 'all', label: 'All', count: templatesData?.count || 0 },
        ...categories.map(c => ({ name: c.name, label: c.name, count: c.count }))
    ];

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
                    <Title heading={3} className="page-title">🏪 App Store</Title>
                    <Text type="secondary" className="page-subtitle">
                        One-click deploy popular applications
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
                {allCategories.map((cat) => (
                    <Button
                        key={cat.name}
                        theme={selectedCategory === cat.name || (cat.name === 'all' && !selectedCategory) ? 'solid' : 'borderless'}
                        type={selectedCategory === cat.name || (cat.name === 'all' && !selectedCategory) ? 'primary' : 'tertiary'}
                        onClick={() => setSelectedCategory(cat.name === 'all' ? '' : cat.name)}
                        className="category-btn"
                    >
                        {cat.label} {cat.count > 0 && `(${cat.count})`}
                    </Button>
                ))}
            </div>

            {/* Apps Grid */}
            {templates.length === 0 ? (
                <Empty
                    description="No applications found"
                    style={{ marginTop: 60 }}
                />
            ) : (
                <div className="apps-grid">
                    {templates.map((app) => (
                        <Card key={app.id} className="app-card">
                            <div className="app-icon">{app.icon || '📦'}</div>
                            <div className="app-info">
                                <Text strong className="app-name">{app.name}</Text>
                                <Text type="secondary" size="small" className="app-description">
                                    {app.description}
                                </Text>
                                <div className="app-meta">
                                    <span className="app-version">v{app.version}</span>
                                    <span className="app-memory">
                                        <IconServer size="small" /> {app.minMemory}MB
                                    </span>
                                </div>
                                <div className="app-tags">
                                    {app.tags?.slice(0, 2).map((tag) => (
                                        <Tag key={tag} size="small">{tag}</Tag>
                                    ))}
                                </div>
                            </div>
                            <div className="app-actions">
                                <Button
                                    theme="solid"
                                    type="primary"
                                    size="small"
                                    onClick={() => handleInstall(app)}
                                >
                                    Deploy
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Install Modal */}
            <Modal
                title={`Deploy ${selectedApp?.name || ''}`}
                visible={installModalVisible}
                onCancel={() => setInstallModalVisible(false)}
                footer={null}
                width={550}
            >
                {selectedApp && (
                    <div className="install-modal-content">
                        <div className="install-app-header">
                            <span className="install-app-icon">{selectedApp.icon || '📦'}</span>
                            <div>
                                <Title heading={5}>{selectedApp.name}</Title>
                                <Text type="secondary">{selectedApp.description}</Text>
                                <div className="install-app-meta">
                                    <Tag>v{selectedApp.version}</Tag>
                                    <Tag color="blue">{selectedApp.image}</Tag>
                                </div>
                            </div>
                        </div>

                        <div className="install-requirements">
                            <Text strong>Requirements:</Text>
                            <div className="requirements-list">
                                <Tag>Memory: {selectedApp.minMemory}MB+</Tag>
                                {selectedApp.ports?.length > 0 && (
                                    <Tag>Ports: {selectedApp.ports.join(', ')}</Tag>
                                )}
                            </div>
                        </div>

                        <Form onSubmit={handleConfirmInstall} labelPosition="left" labelWidth={120}>
                            <Form.Input
                                field="containerName"
                                label="Container Name"
                                placeholder={selectedApp.id}
                                initValue={selectedApp.id}
                                rules={[{ required: true }]}
                            />

                            {/* Dynamic environment variables */}
                            {Object.entries(selectedApp.environment || {}).map(([key, defaultValue]) => (
                                <Form.Input
                                    key={key}
                                    field={key}
                                    label={key.replace(/_/g, ' ')}
                                    placeholder={defaultValue}
                                    initValue={defaultValue}
                                />
                            ))}

                            <div style={{ marginTop: 24, textAlign: 'right' }}>
                                <Button onClick={() => setInstallModalVisible(false)} style={{ marginRight: 8 }}>
                                    Cancel
                                </Button>
                                <Button
                                    htmlType="submit"
                                    theme="solid"
                                    type="primary"
                                    loading={deployMutation.isPending}
                                >
                                    Deploy Now
                                </Button>
                            </div>
                        </Form>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AppStore;
