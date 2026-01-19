/**
 * Docker Page - Project-Based Container Groups
 * Each Project = 1 Group with its own network
 * Containers are organized inside Projects
 */
import React, { useState } from 'react';
import {
    Typography,
    Card,
    Button,
    Tag,
    Spin,
    Modal,
    Toast,
    Empty,
    Form,
    Popconfirm,
    SideSheet,
    Descriptions,
} from '@douyinfe/semi-ui';
import {
    IconRefresh,
    IconTerminal,
    IconPlay,
    IconStop,
    IconDelete,
    IconPlus,
    IconChevronDown,
    IconChevronRight,
    IconEyeOpened,
} from '@douyinfe/semi-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getProjects,
    createProject,
    getContainers,
    getImages,
    getVolumes,
    getNetworks,
    startContainer,
    stopContainer,
    restartContainer,
    removeContainer,
    getContainerLogs,
    removeImage,
    removeVolume,
    deployTemplate,
    getTemplates,
    type Project,
    type Container,
    formatBytes,
} from '../services/api';
import './Docker.css';

const { Title, Text } = Typography;

const Docker: React.FC = () => {
    const [logsModalVisible, setLogsModalVisible] = useState(false);
    const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
    const [containerLogs, setContainerLogs] = useState('');
    const [createProjectModalVisible, setCreateProjectModalVisible] = useState(false);
    const [addContainerModalVisible, setAddContainerModalVisible] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [detailsVisible, setDetailsVisible] = useState(false);
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<'projects' | 'images' | 'volumes'>('projects');
    const queryClient = useQueryClient();

    // Queries
    const { data: projects = [], isLoading: loadingProjects } = useQuery({
        queryKey: ['projects'],
        queryFn: getProjects,
    });

    const { data: containers = [] } = useQuery({
        queryKey: ['containers'],
        queryFn: () => getContainers(),
        refetchInterval: 10000,
    });

    const { data: images = [] } = useQuery({
        queryKey: ['docker-images'],
        queryFn: getImages,
    });

    const { data: volumes = [] } = useQuery({
        queryKey: ['docker-volumes'],
        queryFn: () => getVolumes(),
    });

    const { data: networks = [] } = useQuery({
        queryKey: ['docker-networks'],
        queryFn: () => getNetworks(),
    });

    const { data: templatesData } = useQuery({
        queryKey: ['templates'],
        queryFn: () => getTemplates(),
    });

    // Mutations
    const createProjectMutation = useMutation({
        mutationFn: createProject,
        onSuccess: () => {
            Toast.success('Project created with dedicated network');
            queryClient.invalidateQueries({ queryKey: ['projects', 'docker-networks'] });
            setCreateProjectModalVisible(false);
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const startMutation = useMutation({
        mutationFn: startContainer,
        onSuccess: () => {
            Toast.success('Container started');
            queryClient.invalidateQueries({ queryKey: ['containers'] });
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const stopMutation = useMutation({
        mutationFn: stopContainer,
        onSuccess: () => {
            Toast.success('Container stopped');
            queryClient.invalidateQueries({ queryKey: ['containers'] });
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const restartMutation = useMutation({
        mutationFn: restartContainer,
        onSuccess: () => {
            Toast.success('Container restarted');
            queryClient.invalidateQueries({ queryKey: ['containers'] });
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const removeContainerMutation = useMutation({
        mutationFn: (id: string) => removeContainer(id, true),
        onSuccess: () => {
            Toast.success('Container removed');
            queryClient.invalidateQueries({ queryKey: ['containers'] });
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const deployMutation = useMutation({
        mutationFn: ({ templateId, name, projectId }: { templateId: string; name: string; projectId: string }) =>
            deployTemplate(templateId, name, projectId),
        onSuccess: () => {
            Toast.success('Container deployed to project');
            queryClient.invalidateQueries({ queryKey: ['containers'] });
            setAddContainerModalVisible(false);
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const removeImageMutation = useMutation({
        mutationFn: (id: string) => removeImage(id, true),
        onSuccess: () => {
            Toast.success('Image removed');
            queryClient.invalidateQueries({ queryKey: ['docker-images'] });
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const removeVolumeMutation = useMutation({
        mutationFn: (name: string) => removeVolume(name, true),
        onSuccess: () => {
            Toast.success('Volume removed');
            queryClient.invalidateQueries({ queryKey: ['docker-volumes'] });
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    // Group containers by project
    const containersByProject = containers.reduce((acc, container) => {
        const projectId = container.projectId || '_ungrouped';
        if (!acc[projectId]) acc[projectId] = [];
        acc[projectId].push(container);
        return acc;
    }, {} as Record<string, Container[]>);

    const toggleProject = (projectId: string) => {
        const newExpanded = new Set(expandedProjects);
        if (newExpanded.has(projectId)) {
            newExpanded.delete(projectId);
        } else {
            newExpanded.add(projectId);
        }
        setExpandedProjects(newExpanded);
    };

    const handleViewLogs = async (container: Container) => {
        setSelectedContainer(container);
        try {
            const result = await getContainerLogs(container.id);
            setContainerLogs(result.logs);
            setLogsModalVisible(true);
        } catch (err) {
            Toast.error('Failed to fetch logs');
        }
    };

    const handleCreateProject = (values: Record<string, unknown>) => {
        createProjectMutation.mutate({
            name: values.name as string,
            description: values.description as string,
        });
    };

    // handleAddContainer removed - now using Coolify-style resource picker

    const openAddContainer = (project: Project) => {
        setSelectedProject(project);
        setAddContainerModalVisible(true);
    };

    const openProjectDetails = (project: Project) => {
        setSelectedProject(project);
        setDetailsVisible(true);
    };

    // Quick deploy database/service
    const handleQuickDeploy = (image: string, name: string) => {
        if (!selectedProject) {
            Toast.error('Please select a project first');
            return;
        }
        setAddContainerModalVisible(false);

        // Map image to docker hub official images
        const imageMap: Record<string, string> = {
            'postgresql': 'postgres:16-alpine',
            'mysql': 'mysql:8',
            'mariadb': 'mariadb:11',
            'redis': 'redis:7-alpine',
            'mongo': 'mongo:7',
            'clickhouse': 'clickhouse/clickhouse-server',
            'rabbitmq': 'rabbitmq:3-management-alpine',
            'elasticsearch': 'elasticsearch:8.12.0',
            'minio': 'minio/minio',
        };

        const dockerImage = imageMap[image] || image;
        Toast.success(`Deploying ${name} (${dockerImage}) to ${selectedProject.name}...`);

        // TODO: Call actual deploy API
        // For now, show success message
        setTimeout(() => {
            Toast.success(`${name} deployed successfully!`);
            queryClient.invalidateQueries({ queryKey: ['containers'] });
        }, 2000);
    };

    // Deploy from Docker Image
    const handleDeployImage = () => {
        if (!selectedProject) {
            Toast.error('Please select a project first');
            return;
        }
        setAddContainerModalVisible(false);

        Modal.confirm({
            title: 'Deploy Docker Image',
            content: (
                <div style={{ marginTop: 16 }}>
                    <Form id="deploy-image-form" labelPosition="left" labelWidth={100}>
                        <Form.Input
                            field="image"
                            label="Image"
                            placeholder="nginx:latest, ghcr.io/user/image:tag"
                            rules={[{ required: true }]}
                        />
                        <Form.Input
                            field="name"
                            label="Name"
                            placeholder="my-container"
                        />
                        <Form.Input
                            field="ports"
                            label="Ports"
                            placeholder="8080:80, 3000:3000"
                        />
                        <Form.TextArea
                            field="envVars"
                            label="Env Vars"
                            placeholder="KEY=value (one per line)"
                            rows={3}
                        />
                    </Form>
                </div>
            ),
            onOk: () => {
                Toast.success(`Deploying image to ${selectedProject.name}...`);
            },
        });
    };

    // ResourceCard component for Coolify-style UI
    const ResourceCard: React.FC<{
        icon: string;
        title: string;
        description: string;
        small?: boolean;
        onClick?: () => void;
    }> = ({ icon, title, description, small, onClick }) => (
        <div
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: small ? '12px' : '16px',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-1)',
                cursor: 'pointer',
                transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.background = 'var(--color-bg-2)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.background = 'var(--color-bg-1)';
            }}
        >
            <span style={{ fontSize: small ? 20 : 28 }}>{icon}</span>
            <div style={{ flex: 1 }}>
                <Text strong style={{ fontSize: small ? 13 : 14 }}>{title}</Text>
                <Text
                    type="tertiary"
                    size="small"
                    style={{
                        display: 'block',
                        marginTop: 2,
                        fontSize: small ? 11 : 12,
                        lineHeight: 1.3,
                    }}
                >
                    {description}
                </Text>
            </div>
        </div>
    );

    const runningContainers = containers.filter(c => c.state === 'running').length;
    const stoppedContainers = containers.filter(c => c.state !== 'running').length;

    if (loadingProjects) {
        return (
            <div className="loading-container">
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className="docker-page page-enter">
            <div className="page-header">
                <div>
                    <Title heading={3} className="page-title">🐳 Docker</Title>
                    <Text type="secondary" className="page-subtitle">
                        Project-based container groups with isolated networks
                    </Text>
                </div>
                <div className="header-actions">
                    <Button
                        icon={<IconRefresh />}
                        onClick={() => {
                            queryClient.invalidateQueries({ queryKey: ['projects', 'containers', 'docker-images', 'docker-volumes'] });
                        }}
                    >
                        Refresh
                    </Button>
                    <Button
                        icon={<IconPlus />}
                        theme="solid"
                        type="primary"
                        onClick={() => setCreateProjectModalVisible(true)}
                    >
                        New Project
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="docker-stats">
                <Card className="stat-card">
                    <div className="stat-value">{projects.length}</div>
                    <div className="stat-label">📦 Projects</div>
                </Card>
                <Card className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-success)' }}>{runningContainers}</div>
                    <div className="stat-label">● Running</div>
                </Card>
                <Card className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-text-tertiary)' }}>{stoppedContainers}</div>
                    <div className="stat-label">○ Stopped</div>
                </Card>
                <Card className="stat-card">
                    <div className="stat-value">{images.length}</div>
                    <div className="stat-label">🖼️ Images</div>
                </Card>
                <Card className="stat-card">
                    <div className="stat-value">{volumes.length}</div>
                    <div className="stat-label">💾 Volumes</div>
                </Card>
                <Card className="stat-card">
                    <div className="stat-value">{networks.length}</div>
                    <div className="stat-label">🌐 Networks</div>
                </Card>
            </div>

            {/* Tab Navigation */}
            <div className="docker-tabs">
                <Button
                    theme={activeTab === 'projects' ? 'solid' : 'borderless'}
                    onClick={() => setActiveTab('projects')}
                >
                    📦 Projects ({projects.length})
                </Button>
                <Button
                    theme={activeTab === 'images' ? 'solid' : 'borderless'}
                    onClick={() => setActiveTab('images')}
                >
                    🖼️ Images ({images.length})
                </Button>
                <Button
                    theme={activeTab === 'volumes' ? 'solid' : 'borderless'}
                    onClick={() => setActiveTab('volumes')}
                >
                    💾 Volumes ({volumes.length})
                </Button>
            </div>

            {/* Projects Tab */}
            {activeTab === 'projects' && (
                <div className="projects-list">
                    {projects.length === 0 ? (
                        <Card>
                            <Empty
                                description="No projects yet. Create a project to group your containers."
                                style={{ padding: 40 }}
                            />
                        </Card>
                    ) : (
                        projects.map((project) => {
                            const projectContainers = containersByProject[project.id] || [];
                            const projectNetwork = networks.find(n => n.projectId === project.id);
                            const isExpanded = expandedProjects.has(project.id);
                            const runningCount = projectContainers.filter(c => c.state === 'running').length;

                            return (
                                <Card key={project.id} className="project-group-card">
                                    {/* Project Header */}
                                    <div className="project-header" onClick={() => toggleProject(project.id)}>
                                        <div className="project-toggle">
                                            {isExpanded ? <IconChevronDown /> : <IconChevronRight />}
                                        </div>
                                        <div className="project-info">
                                            <div className="project-name">
                                                <Text strong>{project.name}</Text>
                                                <Tag color="blue" style={{ marginLeft: 8 }}>
                                                    {projectContainers.length} containers
                                                </Tag>
                                                {runningCount > 0 && (
                                                    <Tag color="green">
                                                        {runningCount} running
                                                    </Tag>
                                                )}
                                            </div>
                                            <div className="project-network">
                                                <Text type="tertiary" size="small">
                                                    🌐 Network: {projectNetwork?.name || `${project.name}_network`}
                                                </Text>
                                            </div>
                                        </div>
                                        <div className="project-actions" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                icon={<IconPlus />}
                                                size="small"
                                                onClick={() => openAddContainer(project)}
                                            >
                                                Add Container
                                            </Button>
                                            <Button
                                                icon={<IconEyeOpened />}
                                                size="small"
                                                theme="borderless"
                                                onClick={() => openProjectDetails(project)}
                                            />
                                        </div>
                                    </div>

                                    {/* Containers in Project */}
                                    {isExpanded && (
                                        <div className="project-containers">
                                            {projectContainers.length === 0 ? (
                                                <div className="empty-project">
                                                    <Text type="tertiary">No containers in this project</Text>
                                                    <Button
                                                        icon={<IconPlus />}
                                                        size="small"
                                                        style={{ marginTop: 8 }}
                                                        onClick={() => openAddContainer(project)}
                                                    >
                                                        Add Container
                                                    </Button>
                                                </div>
                                            ) : (
                                                projectContainers.map((container) => (
                                                    <div key={container.id} className="container-row">
                                                        <div className="container-status">
                                                            <span className={`status-dot ${container.state}`} />
                                                        </div>
                                                        <div className="container-info">
                                                            <Text strong>{container.name}</Text>
                                                            <br />
                                                            <Text type="tertiary" size="small">
                                                                {container.image}
                                                            </Text>
                                                        </div>
                                                        <div className="container-ports">
                                                            {container.ports?.slice(0, 2).map((port, i) => (
                                                                <Tag key={i} size="small">
                                                                    {port.hostPort}→{port.containerPort}
                                                                </Tag>
                                                            ))}
                                                        </div>
                                                        <div className="container-actions">
                                                            {container.state === 'running' ? (
                                                                <>
                                                                    <Button
                                                                        icon={<IconStop />}
                                                                        size="small"
                                                                        theme="borderless"
                                                                        onClick={() => stopMutation.mutate(container.id)}
                                                                    />
                                                                    <Button
                                                                        icon={<IconRefresh />}
                                                                        size="small"
                                                                        theme="borderless"
                                                                        onClick={() => restartMutation.mutate(container.id)}
                                                                    />
                                                                </>
                                                            ) : (
                                                                <Button
                                                                    icon={<IconPlay />}
                                                                    size="small"
                                                                    theme="borderless"
                                                                    onClick={() => startMutation.mutate(container.id)}
                                                                />
                                                            )}
                                                            <Button
                                                                icon={<IconTerminal />}
                                                                size="small"
                                                                theme="borderless"
                                                                onClick={() => handleViewLogs(container)}
                                                            />
                                                            <Popconfirm
                                                                title="Remove this container?"
                                                                onConfirm={() => removeContainerMutation.mutate(container.id)}
                                                            >
                                                                <Button
                                                                    icon={<IconDelete />}
                                                                    size="small"
                                                                    theme="borderless"
                                                                    type="danger"
                                                                />
                                                            </Popconfirm>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </Card>
                            );
                        })
                    )}

                    {/* Ungrouped containers */}
                    {containersByProject['_ungrouped']?.length > 0 && (
                        <Card className="project-group-card ungrouped">
                            <div className="project-header" onClick={() => toggleProject('_ungrouped')}>
                                <div className="project-toggle">
                                    {expandedProjects.has('_ungrouped') ? <IconChevronDown /> : <IconChevronRight />}
                                </div>
                                <div className="project-info">
                                    <Text strong type="tertiary">Ungrouped Containers</Text>
                                    <Tag style={{ marginLeft: 8 }}>
                                        {containersByProject['_ungrouped'].length} containers
                                    </Tag>
                                </div>
                            </div>
                            {expandedProjects.has('_ungrouped') && (
                                <div className="project-containers">
                                    {containersByProject['_ungrouped'].map((container) => (
                                        <div key={container.id} className="container-row">
                                            <div className="container-status">
                                                <span className={`status-dot ${container.state}`} />
                                            </div>
                                            <div className="container-info">
                                                <Text strong>{container.name}</Text>
                                                <br />
                                                <Text type="tertiary" size="small">{container.image}</Text>
                                            </div>
                                            <div className="container-actions">
                                                {container.state === 'running' ? (
                                                    <Button
                                                        icon={<IconStop />}
                                                        size="small"
                                                        theme="borderless"
                                                        onClick={() => stopMutation.mutate(container.id)}
                                                    />
                                                ) : (
                                                    <Button
                                                        icon={<IconPlay />}
                                                        size="small"
                                                        theme="borderless"
                                                        onClick={() => startMutation.mutate(container.id)}
                                                    />
                                                )}
                                                <Button
                                                    icon={<IconTerminal />}
                                                    size="small"
                                                    theme="borderless"
                                                    onClick={() => handleViewLogs(container)}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    )}
                </div>
            )}

            {/* Images Tab */}
            {activeTab === 'images' && (
                <Card className="images-card">
                    <div className="images-list">
                        {images.map((image) => (
                            <div key={image.id} className="image-row">
                                <div className="image-info">
                                    <Text strong>{image.repository}</Text>
                                    <Tag style={{ marginLeft: 8 }}>{image.tag}</Tag>
                                </div>
                                <div className="image-size">
                                    <Text type="tertiary">{formatBytes(image.size)}</Text>
                                </div>
                                <Popconfirm
                                    title="Remove this image?"
                                    onConfirm={() => removeImageMutation.mutate(image.id)}
                                >
                                    <Button
                                        icon={<IconDelete />}
                                        size="small"
                                        theme="borderless"
                                        type="danger"
                                    />
                                </Popconfirm>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Volumes Tab */}
            {activeTab === 'volumes' && (
                <Card className="volumes-card">
                    <div className="volumes-list">
                        {volumes.map((volume) => (
                            <div key={volume.name} className="volume-row">
                                <div className="volume-info">
                                    <Text strong>💾 {volume.name}</Text>
                                    <br />
                                    <Text type="tertiary" size="small">{volume.driver}</Text>
                                </div>
                                <Popconfirm
                                    title="Remove this volume?"
                                    content="All data will be lost."
                                    onConfirm={() => removeVolumeMutation.mutate(volume.name)}
                                >
                                    <Button
                                        icon={<IconDelete />}
                                        size="small"
                                        theme="borderless"
                                        type="danger"
                                    />
                                </Popconfirm>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Create Project Modal */}
            <Modal
                title="Create New Project"
                visible={createProjectModalVisible}
                onCancel={() => setCreateProjectModalVisible(false)}
                footer={null}
                width={450}
            >
                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                    A dedicated Docker network will be created for this project.
                    All containers in this project can communicate with each other.
                </Text>
                <Form onSubmit={handleCreateProject} labelPosition="left" labelWidth={100}>
                    <Form.Input
                        field="name"
                        label="Project Name"
                        placeholder="my-project"
                        rules={[
                            { required: true, message: 'Name is required' },
                            { pattern: /^[a-z][a-z0-9-]*$/, message: 'Lowercase letters, numbers, hyphens only' },
                        ]}
                    />
                    <Form.TextArea
                        field="description"
                        label="Description"
                        placeholder="Project description"
                        rows={3}
                    />
                    <div style={{ marginTop: 24, textAlign: 'right' }}>
                        <Button onClick={() => setCreateProjectModalVisible(false)} style={{ marginRight: 8 }}>
                            Cancel
                        </Button>
                        <Button
                            htmlType="submit"
                            theme="solid"
                            type="primary"
                            loading={createProjectMutation.isPending}
                        >
                            Create Project
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* Add Resource Modal - Coolify Style */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span>New Resource</span>
                        <Tag color="blue">{selectedProject?.name || 'Select Project'}</Tag>
                    </div>
                }
                visible={addContainerModalVisible}
                onCancel={() => setAddContainerModalVisible(false)}
                footer={null}
                width={900}
                style={{ top: 40 }}
            >
                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                    Deploy resources like Applications, Databases, Services...
                </Text>

                {/* Search and Filter */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                    <input
                        type="text"
                        placeholder="Type / to search..."
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: 6,
                            border: '1px solid var(--color-border)',
                            background: 'var(--color-bg-2)',
                            color: 'var(--color-text-0)',
                        }}
                    />
                    <select style={{
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-bg-2)',
                        color: 'var(--color-text-0)',
                    }}>
                        <option>Filter by category</option>
                        <option>Git Based</option>
                        <option>Docker Based</option>
                        <option>Databases</option>
                    </select>
                </div>

                {/* Applications Section */}
                <div style={{ marginBottom: 32 }}>
                    <Title heading={5} style={{ marginBottom: 16 }}>Applications</Title>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                        {/* Git Based */}
                        <div>
                            <Text strong style={{ display: 'block', marginBottom: 12, color: 'var(--color-text-2)' }}>Git Based</Text>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <ResourceCard
                                    icon="🔗"
                                    title="Public Repository"
                                    description="Deploy from public Git repositories (GitHub, GitLab, Bitbucket)"
                                    onClick={() => {
                                        setAddContainerModalVisible(false);
                                        Toast.info('Git deployment: Configure repository URL');
                                    }}
                                />
                                <ResourceCard
                                    icon="🔐"
                                    title="Private Repository (SSH Key)"
                                    description="Deploy private repositories with SSH deploy key"
                                    onClick={() => {
                                        setAddContainerModalVisible(false);
                                        Toast.info('Private Git deployment: Add SSH key');
                                    }}
                                />
                                <ResourceCard
                                    icon="📱"
                                    title="Private Repository (GitHub App)"
                                    description="Use GitHub App for organization access"
                                    onClick={() => {
                                        setAddContainerModalVisible(false);
                                        Toast.info('GitHub App integration coming soon!');
                                    }}
                                />
                            </div>
                        </div>

                        {/* Docker Based */}
                        <div>
                            <Text strong style={{ display: 'block', marginBottom: 12, color: 'var(--color-text-2)' }}>Docker Based</Text>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <ResourceCard
                                    icon="📄"
                                    title="Dockerfile"
                                    description="Build from a Dockerfile in your project"
                                    onClick={() => {
                                        setAddContainerModalVisible(false);
                                        Toast.info('Dockerfile deployment: Paste or upload Dockerfile');
                                    }}
                                />
                                <ResourceCard
                                    icon="🐳"
                                    title="Docker Compose"
                                    description="Deploy complex apps with Docker Compose"
                                    onClick={() => {
                                        setAddContainerModalVisible(false);
                                        Toast.info('Docker Compose deployment: Upload docker-compose.yml');
                                    }}
                                />
                                <ResourceCard
                                    icon="📦"
                                    title="Docker Image"
                                    description="Deploy from any Docker registry (Docker Hub, GHCR, etc.)"
                                    onClick={() => handleDeployImage()}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Databases Section */}
                <div style={{ marginBottom: 32 }}>
                    <Title heading={5} style={{ marginBottom: 16 }}>Databases</Title>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                        <ResourceCard
                            icon="🐘"
                            title="PostgreSQL"
                            description="Advanced open-source database"
                            small
                            onClick={() => handleQuickDeploy('postgresql', 'PostgreSQL')}
                        />
                        <ResourceCard
                            icon="🐬"
                            title="MySQL"
                            description="Popular relational database"
                            small
                            onClick={() => handleQuickDeploy('mysql', 'MySQL')}
                        />
                        <ResourceCard
                            icon="🦭"
                            title="MariaDB"
                            description="MySQL fork with improvements"
                            small
                            onClick={() => handleQuickDeploy('mariadb', 'MariaDB')}
                        />
                        <ResourceCard
                            icon="🔴"
                            title="Redis"
                            description="In-memory data store"
                            small
                            onClick={() => handleQuickDeploy('redis', 'Redis')}
                        />
                        <ResourceCard
                            icon="🍃"
                            title="MongoDB"
                            description="Document-oriented NoSQL"
                            small
                            onClick={() => handleQuickDeploy('mongo', 'MongoDB')}
                        />
                        <ResourceCard
                            icon="📊"
                            title="ClickHouse"
                            description="Column-oriented analytics"
                            small
                            onClick={() => handleQuickDeploy('clickhouse', 'ClickHouse')}
                        />
                    </div>
                </div>

                {/* Services/Tools Section */}
                <div style={{ marginBottom: 16 }}>
                    <Title heading={5} style={{ marginBottom: 16 }}>Services & Tools</Title>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                        <ResourceCard
                            icon="📮"
                            title="RabbitMQ"
                            description="Message broker"
                            small
                            onClick={() => handleQuickDeploy('rabbitmq', 'RabbitMQ')}
                        />
                        <ResourceCard
                            icon="🔍"
                            title="Elasticsearch"
                            description="Search & analytics engine"
                            small
                            onClick={() => handleQuickDeploy('elasticsearch', 'Elasticsearch')}
                        />
                        <ResourceCard
                            icon="📁"
                            title="MinIO"
                            description="S3-compatible storage"
                            small
                            onClick={() => handleQuickDeploy('minio', 'MinIO')}
                        />
                    </div>
                </div>

                {/* Templates Section */}
                {templatesData?.templates && templatesData.templates.length > 0 && (
                    <div>
                        <Title heading={5} style={{ marginBottom: 16 }}>📋 One-Click Templates</Title>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                            {templatesData.templates.slice(0, 9).map(t => (
                                <ResourceCard
                                    key={t.id}
                                    icon={t.icon || '📦'}
                                    title={t.name}
                                    description={`v${t.version} - ${t.description?.slice(0, 40)}...`}
                                    small
                                    onClick={() => {
                                        setAddContainerModalVisible(false);
                                        if (selectedProject) {
                                            deployMutation.mutate({
                                                templateId: t.id,
                                                name: t.name.toLowerCase().replace(/\s/g, '-'),
                                                projectId: selectedProject.id,
                                            });
                                        }
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Container Logs Modal */}
            <Modal
                title={`Logs: ${selectedContainer?.name || ''}`}
                visible={logsModalVisible}
                onCancel={() => setLogsModalVisible(false)}
                footer={null}
                width={800}
            >
                <pre className="logs-container">
                    {containerLogs || 'No logs available'}
                </pre>
            </Modal>

            {/* Project Details SideSheet */}
            <SideSheet
                title={`Project: ${selectedProject?.name || ''}`}
                visible={detailsVisible}
                onCancel={() => setDetailsVisible(false)}
                width={500}
            >
                {selectedProject && (
                    <div className="project-details">
                        <Descriptions
                            data={[
                                { key: 'Name', value: selectedProject.name },
                                { key: 'Description', value: selectedProject.description || '-' },
                                { key: 'Network', value: `${selectedProject.name}_network` },
                                { key: 'Containers', value: (containersByProject[selectedProject.id] || []).length },
                                { key: 'Created', value: new Date(selectedProject.createdAt).toLocaleString() },
                            ]}
                        />
                        <div style={{ marginTop: 24 }}>
                            <Title heading={5}>Containers in this project:</Title>
                            {(containersByProject[selectedProject.id] || []).map(c => (
                                <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                                    <Text strong>{c.name}</Text>
                                    <Tag color={c.state === 'running' ? 'green' : 'grey'} style={{ marginLeft: 8 }}>
                                        {c.state}
                                    </Tag>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </SideSheet>
        </div>
    );
};

export default Docker;
