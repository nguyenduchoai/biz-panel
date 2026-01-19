/**
 * Projects Page
 * Git-based deployments and application management
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
    Space,
    Toast,
    Empty,
    Progress,
    Avatar,
    Dropdown,
} from '@douyinfe/semi-ui';
import {
    IconPlus,
    IconRefresh,
    IconGithubLogo,
    IconMore,
    IconPlay,
    IconStop,
    IconDelete,
    IconSetting,
    IconLink,
    IconHistory,
} from '@douyinfe/semi-icons';
import './Projects.css';

const { Title, Text } = Typography;

interface Project {
    id: string;
    name: string;
    repository: string;
    branch: string;
    framework: 'node' | 'python' | 'static' | 'docker';
    status: 'running' | 'stopped' | 'deploying' | 'failed';
    domain?: string;
    lastDeploy: string;
    commits: number;
    memory: number;
    cpu: number;
}

// Mock projects
const MOCK_PROJECTS: Project[] = [
    {
        id: '1',
        name: 'api-service',
        repository: 'github.com/company/api-service',
        branch: 'main',
        framework: 'node',
        status: 'running',
        domain: 'api.example.com',
        lastDeploy: '2026-01-18T10:30:00Z',
        commits: 234,
        memory: 180,
        cpu: 8,
    },
    {
        id: '2',
        name: 'frontend-app',
        repository: 'github.com/company/frontend-app',
        branch: 'production',
        framework: 'static',
        status: 'running',
        domain: 'app.example.com',
        lastDeploy: '2026-01-17T15:00:00Z',
        commits: 567,
        memory: 0,
        cpu: 0,
    },
    {
        id: '3',
        name: 'ml-worker',
        repository: 'github.com/company/ml-worker',
        branch: 'main',
        framework: 'python',
        status: 'stopped',
        lastDeploy: '2026-01-15T09:00:00Z',
        commits: 89,
        memory: 0,
        cpu: 0,
    },
    {
        id: '4',
        name: 'data-pipeline',
        repository: 'github.com/company/data-pipeline',
        branch: 'develop',
        framework: 'docker',
        status: 'deploying',
        lastDeploy: '2026-01-18T12:00:00Z',
        commits: 156,
        memory: 0,
        cpu: 0,
    },
];

const Projects: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
    const [modalVisible, setModalVisible] = useState(false);
    const [deployProgress, setDeployProgress] = useState<Record<string, number>>({});

    // Get framework icon
    const getFrameworkIcon = (framework: Project['framework']) => {
        const icons: Record<string, { icon: string; color: string; label: string }> = {
            node: { icon: '⬢', color: '#68a063', label: 'Node.js' },
            python: { icon: '🐍', color: '#3572a5', label: 'Python' },
            static: { icon: '📄', color: '#e34c26', label: 'Static' },
            docker: { icon: '🐳', color: '#2496ed', label: 'Docker' },
        };
        return icons[framework];
    };

    // Get status color
    const getStatusColor = (status: Project['status']): 'green' | 'grey' | 'blue' | 'red' => {
        const colors: Record<string, 'green' | 'grey' | 'blue' | 'red'> = {
            running: 'green',
            stopped: 'grey',
            deploying: 'blue',
            failed: 'red',
        };
        return colors[status];
    };

    // Format date
    const formatDate = (date: string): string => {
        const d = new Date(date);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));

        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    // Deploy project
    const deploy = (project: Project) => {
        Toast.info(`Deploying ${project.name}...`);
        setProjects((prev) =>
            prev.map((p) => (p.id === project.id ? { ...p, status: 'deploying' as const } : p))
        );

        // Simulate deploy progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 20;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                setProjects((prev) =>
                    prev.map((p) =>
                        p.id === project.id
                            ? { ...p, status: 'running' as const, lastDeploy: new Date().toISOString() }
                            : p
                    )
                );
                setDeployProgress((prev) => {
                    const newState = { ...prev };
                    delete newState[project.id];
                    return newState;
                });
                Toast.success(`${project.name} deployed successfully!`);
            } else {
                setDeployProgress((prev) => ({ ...prev, [project.id]: progress }));
            }
        }, 500);
    };

    // Stop project
    const stop = (project: Project) => {
        Toast.warning(`Stopping ${project.name}...`);
        setTimeout(() => {
            setProjects((prev) =>
                prev.map((p) => (p.id === project.id ? { ...p, status: 'stopped' as const } : p))
            );
            Toast.success(`${project.name} stopped`);
        }, 1000);
    };

    // Table columns
    const columns = [
        {
            title: 'Project',
            dataIndex: 'name',
            render: (name: string, record: Project) => {
                const framework = getFrameworkIcon(record.framework);
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar
                            size="small"
                            style={{ background: framework.color }}
                        >
                            {framework.icon}
                        </Avatar>
                        <div>
                            <Text style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
                                {name}
                            </Text>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <IconGithubLogo style={{ fontSize: 12, color: 'var(--color-text-secondary)' }} />
                                <Text type="secondary" size="small">{record.branch}</Text>
                            </div>
                        </div>
                    </div>
                );
            },
        },
        {
            title: 'Repository',
            dataIndex: 'repository',
            render: (repo: string) => (
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {repo}
                </Text>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            width: 130,
            render: (status: Project['status'], record: Project) => (
                <div>
                    <Tag color={getStatusColor(status)}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Tag>
                    {status === 'deploying' && deployProgress[record.id] !== undefined && (
                        <Progress
                            percent={deployProgress[record.id]}
                            size="small"
                            style={{ marginTop: 8, width: 100 }}
                            showInfo={false}
                        />
                    )}
                </div>
            ),
        },
        {
            title: 'Domain',
            dataIndex: 'domain',
            render: (domain: string | undefined) =>
                domain ? (
                    <a
                        href={`https://${domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                        <IconLink size="small" />
                        {domain}
                    </a>
                ) : (
                    <Text type="tertiary">Not configured</Text>
                ),
        },
        {
            title: 'Last Deploy',
            dataIndex: 'lastDeploy',
            width: 120,
            render: (date: string) => <Text type="secondary">{formatDate(date)}</Text>,
        },
        {
            title: 'Resources',
            dataIndex: 'resources',
            width: 150,
            render: (_: unknown, record: Project) =>
                record.status === 'running' ? (
                    <div>
                        <Text type="secondary" size="small">
                            CPU: {record.cpu}% • RAM: {record.memory}MB
                        </Text>
                    </div>
                ) : (
                    <Text type="tertiary">-</Text>
                ),
        },
        {
            title: 'Actions',
            dataIndex: 'actions',
            width: 120,
            render: (_: unknown, record: Project) => (
                <Space>
                    {record.status === 'running' ? (
                        <Button
                            icon={<IconStop />}
                            theme="borderless"
                            size="small"
                            onClick={() => stop(record)}
                        />
                    ) : record.status !== 'deploying' ? (
                        <Button
                            icon={<IconPlay />}
                            theme="borderless"
                            size="small"
                            type="primary"
                            onClick={() => deploy(record)}
                        />
                    ) : null}
                    <Dropdown
                        trigger="click"
                        position="bottomRight"
                        render={
                            <Dropdown.Menu>
                                <Dropdown.Item icon={<IconRefresh />} onClick={() => deploy(record)}>
                                    Redeploy
                                </Dropdown.Item>
                                <Dropdown.Item icon={<IconHistory />}>View Logs</Dropdown.Item>
                                <Dropdown.Item icon={<IconSetting />}>Settings</Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item icon={<IconDelete />} type="danger">
                                    Delete
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        }
                    >
                        <Button icon={<IconMore />} theme="borderless" size="small" />
                    </Dropdown>
                </Space>
            ),
        },
    ];

    return (
        <div className="projects-page page-enter">
            {/* Header */}
            <div className="page-header">
                <div>
                    <Title heading={3} style={{ color: 'var(--color-text-primary)', margin: 0 }}>
                        Projects
                    </Title>
                    <Text type="secondary">Deploy applications from Git repositories</Text>
                </div>
                <Space>
                    <Button icon={<IconRefresh />}>Refresh</Button>
                    <Button
                        icon={<IconPlus />}
                        theme="solid"
                        type="primary"
                        onClick={() => setModalVisible(true)}
                    >
                        New Project
                    </Button>
                </Space>
            </div>

            {/* Stats */}
            <div className="projects-stats">
                <Card className="stat-card">
                    <div className="stat-value">{projects.length}</div>
                    <div className="stat-label">Total Projects</div>
                </Card>
                <Card className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-success)' }}>
                        {projects.filter((p) => p.status === 'running').length}
                    </div>
                    <div className="stat-label">Running</div>
                </Card>
                <Card className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-primary)' }}>
                        {projects.filter((p) => p.status === 'deploying').length}
                    </div>
                    <div className="stat-label">Deploying</div>
                </Card>
                <Card className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-text-secondary)' }}>
                        {projects.filter((p) => p.status === 'stopped').length}
                    </div>
                    <div className="stat-label">Stopped</div>
                </Card>
            </div>

            {/* Projects Table */}
            <Card className="projects-table-card">
                {projects.length === 0 ? (
                    <Empty
                        title="No projects yet"
                        description="Deploy your first application from Git"
                    >
                        <Button
                            icon={<IconPlus />}
                            theme="solid"
                            type="primary"
                            onClick={() => setModalVisible(true)}
                        >
                            New Project
                        </Button>
                    </Empty>
                ) : (
                    <Table
                        columns={columns}
                        dataSource={projects}
                        pagination={false}
                        rowKey="id"
                        className="projects-table"
                    />
                )}
            </Card>

            {/* Create Modal */}
            <Modal
                title="New Project"
                visible={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
                width={600}
            >
                <Form
                    labelPosition="top"
                    onSubmit={(values) => {
                        const newProject: Project = {
                            id: Date.now().toString(),
                            name: values.name as string,
                            repository: values.repository as string,
                            branch: values.branch as string || 'main',
                            framework: values.framework as Project['framework'],
                            status: 'stopped',
                            domain: values.domain as string,
                            lastDeploy: '',
                            commits: 0,
                            memory: 0,
                            cpu: 0,
                        };
                        setProjects((prev) => [...prev, newProject]);
                        setModalVisible(false);
                        Toast.success('Project created! Click Deploy to start.');
                    }}
                >
                    <Form.Input
                        field="name"
                        label="Project Name"
                        placeholder="my-awesome-app"
                        rules={[{ required: true }]}
                    />
                    <Form.Input
                        field="repository"
                        label="Git Repository"
                        placeholder="github.com/username/repo"
                        prefix={<IconGithubLogo />}
                        rules={[{ required: true }]}
                    />
                    <Form.Input
                        field="branch"
                        label="Branch"
                        placeholder="main"
                        initValue="main"
                    />
                    <Form.Select
                        field="framework"
                        label="Framework"
                        placeholder="Auto-detect or select"
                        optionList={[
                            { value: 'node', label: '⬢ Node.js' },
                            { value: 'python', label: '🐍 Python' },
                            { value: 'static', label: '📄 Static Site' },
                            { value: 'docker', label: '🐳 Dockerfile' },
                        ]}
                        rules={[{ required: true }]}
                    />
                    <Form.Input
                        field="domain"
                        label="Domain (optional)"
                        placeholder="app.example.com"
                    />
                    <div style={{ marginTop: 24, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setModalVisible(false)}>Cancel</Button>
                            <Button theme="solid" type="primary" htmlType="submit">
                                Create Project
                            </Button>
                        </Space>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default Projects;
