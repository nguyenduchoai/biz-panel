/**
 * File Manager Page
 * Browse and manage server files with Monaco editor
 */
import React, { useState, useEffect } from 'react';
import {
    Typography,
    Card,
    Button,
    Table,
    Breadcrumb,
    Input,
    Modal,
    Space,
    Checkbox,
    Toast,
    Spin,
    Empty,
    Dropdown,
} from '@douyinfe/semi-ui';
import {
    IconPlus,
    IconUpload,
    IconRefresh,
    IconFolder,
    IconFile,
    IconArrowUp,
    IconDownload,
    IconDelete,
    IconMore,
    IconCopy,
    IconEdit,
    IconSearch,
} from '@douyinfe/semi-icons';
import { getFiles } from '../services/mockApi';
import type { FileItem } from '../types';
import './Files.css';

const { Title, Text } = Typography;

// Format file size
const formatSize = (bytes: number): string => {
    if (bytes === 0) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Format date
const formatDate = (date: string): string => {
    return new Date(date).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

// Get file icon based on extension
const getFileIcon = (item: FileItem): React.ReactNode => {
    if (item.type === 'directory') {
        return <IconFolder style={{ color: '#ffab00', fontSize: 18 }} />;
    }

    const ext = item.extension?.toLowerCase();
    const iconColors: Record<string, string> = {
        js: '#f7df1e',
        ts: '#3178c6',
        tsx: '#3178c6',
        jsx: '#61dafb',
        json: '#cbcb41',
        html: '#e34c26',
        css: '#563d7c',
        php: '#777bb4',
        py: '#3572a5',
        env: '#4caf50',
        conf: '#6e7681',
        md: '#083fa1',
        sh: '#89e051',
    };

    return <IconFile style={{ color: iconColors[ext || ''] || '#8b949e', fontSize: 18 }} />;
};

const Files: React.FC = () => {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPath, setCurrentPath] = useState('/home/admin/web/example.com');
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [editorVisible, setEditorVisible] = useState(false);
    const [editingFile, setEditingFile] = useState<FileItem | null>(null);
    const [fileContent, setFileContent] = useState('');
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [createType, setCreateType] = useState<'file' | 'folder'>('file');
    const [newItemName, setNewItemName] = useState('');

    // Fetch files
    const fetchFiles = async () => {
        setLoading(true);
        try {
            const data = await getFiles(currentPath);
            setFiles(data);
        } catch {
            Toast.error('Failed to load files');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, [currentPath]);

    // Parse path for breadcrumb
    const pathParts = currentPath.split('/').filter(Boolean);

    // Navigate to path
    const navigateTo = (path: string) => {
        setCurrentPath(path);
        setSelectedKeys([]);
    };

    // Go up one directory
    const goUp = () => {
        const parts = currentPath.split('/').filter(Boolean);
        if (parts.length > 1) {
            parts.pop();
            navigateTo('/' + parts.join('/'));
        }
    };

    // Handle file/folder click
    const handleItemClick = (item: FileItem) => {
        if (item.type === 'directory') {
            navigateTo(item.path);
        } else {
            // Open file editor
            setEditingFile(item);
            setFileContent(`// File: ${item.name}\n// Generated preview\n\nconst example = {\n  name: "${item.name}",\n  size: ${item.size},\n  modified: "${item.modifiedAt}"\n};\n\nexport default example;`);
            setEditorVisible(true);
        }
    };

    // Handle create
    const handleCreate = () => {
        if (!newItemName.trim()) {
            Toast.error('Please enter a name');
            return;
        }
        Toast.success(`${createType === 'file' ? 'File' : 'Folder'} "${newItemName}" created`);
        setCreateModalVisible(false);
        setNewItemName('');
        fetchFiles();
    };

    // Handle delete
    const handleDelete = () => {
        if (selectedKeys.length === 0) return;
        Modal.confirm({
            title: 'Delete Items',
            content: `Are you sure you want to delete ${selectedKeys.length} item(s)?`,
            onOk: () => {
                Toast.success(`${selectedKeys.length} item(s) deleted`);
                setSelectedKeys([]);
                fetchFiles();
            },
        });
    };

    // Filter files by search
    const filteredFiles = files.filter((file) =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Table columns
    const columns = [
        {
            title: '',
            dataIndex: 'select',
            width: 50,
            render: (_: unknown, record: FileItem) => (
                <Checkbox
                    checked={selectedKeys.includes(record.path)}
                    onChange={(e) => {
                        const checked = e.target.checked;
                        if (checked) {
                            setSelectedKeys([...selectedKeys, record.path]);
                        } else {
                            setSelectedKeys(selectedKeys.filter((k) => k !== record.path));
                        }
                    }}
                />
            ),
        },
        {
            title: 'Name',
            dataIndex: 'name',
            render: (_: unknown, record: FileItem) => (
                <div
                    className="file-name-cell"
                    onClick={() => handleItemClick(record)}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                    {getFileIcon(record)}
                    <Text style={{ color: 'var(--color-text-primary)' }}>{record.name}</Text>
                </div>
            ),
        },
        {
            title: 'Size',
            dataIndex: 'size',
            width: 100,
            render: (size: number) => (
                <Text type="secondary">{formatSize(size)}</Text>
            ),
        },
        {
            title: 'Modified',
            dataIndex: 'modifiedAt',
            width: 150,
            render: (date: string) => (
                <Text type="secondary">{formatDate(date)}</Text>
            ),
        },
        {
            title: 'Permissions',
            dataIndex: 'permissions',
            width: 120,
            render: (perm: string) => (
                <code style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{perm}</code>
            ),
        },
        {
            title: '',
            dataIndex: 'actions',
            width: 50,
            render: (_: unknown, record: FileItem) => (
                <Dropdown
                    trigger="click"
                    position="bottomRight"
                    render={
                        <Dropdown.Menu>
                            <Dropdown.Item icon={<IconDownload />}>Download</Dropdown.Item>
                            {record.type === 'file' && (
                                <Dropdown.Item icon={<IconEdit />} onClick={() => handleItemClick(record)}>
                                    Edit
                                </Dropdown.Item>
                            )}
                            <Dropdown.Item icon={<IconCopy />}>Copy</Dropdown.Item>
                            <Dropdown.Divider />
                            <Dropdown.Item icon={<IconDelete />} type="danger">
                                Delete
                            </Dropdown.Item>
                        </Dropdown.Menu>
                    }
                >
                    <Button icon={<IconMore />} theme="borderless" type="tertiary" />
                </Dropdown>
            ),
        },
    ];

    return (
        <div className="files-page page-enter">
            {/* Header */}
            <div className="page-header">
                <div>
                    <Title heading={3} style={{ color: 'var(--color-text-primary)', margin: 0 }}>
                        File Manager
                    </Title>
                    <Text type="secondary">Browse and manage server files</Text>
                </div>
                <Space>
                    <Button
                        icon={<IconFolder />}
                        onClick={() => {
                            setCreateType('folder');
                            setCreateModalVisible(true);
                        }}
                    >
                        New Folder
                    </Button>
                    <Button
                        icon={<IconPlus />}
                        onClick={() => {
                            setCreateType('file');
                            setCreateModalVisible(true);
                        }}
                    >
                        New File
                    </Button>
                    <Button icon={<IconUpload />} theme="solid" type="primary">
                        Upload
                    </Button>
                </Space>
            </div>

            {/* Main Content */}
            <Card className="files-card">
                {/* Toolbar */}
                <div className="files-toolbar">
                    <Space>
                        <Button icon={<IconArrowUp />} onClick={goUp} disabled={pathParts.length <= 1}>
                            Parent
                        </Button>
                        <Button icon={<IconRefresh />} onClick={fetchFiles}>
                            Refresh
                        </Button>
                    </Space>

                    <Input
                        prefix={<IconSearch />}
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={setSearchQuery}
                        style={{ width: 240 }}
                    />
                </div>

                {/* Breadcrumb */}
                <div className="files-breadcrumb">
                    <Breadcrumb>
                        <Breadcrumb.Item onClick={() => navigateTo('/')}>
                            <IconFolder style={{ marginRight: 4 }} />
                            Root
                        </Breadcrumb.Item>
                        {pathParts.map((part, index) => (
                            <Breadcrumb.Item
                                key={index}
                                onClick={() => navigateTo('/' + pathParts.slice(0, index + 1).join('/'))}
                            >
                                {part}
                            </Breadcrumb.Item>
                        ))}
                    </Breadcrumb>
                </div>

                {/* File Table */}
                {loading ? (
                    <div className="files-loading">
                        <Spin size="large" />
                    </div>
                ) : filteredFiles.length === 0 ? (
                    <Empty
                        title="No files found"
                        description={searchQuery ? 'Try a different search term' : 'This directory is empty'}
                    />
                ) : (
                    <Table
                        columns={columns}
                        dataSource={filteredFiles}
                        pagination={false}
                        rowKey="path"
                        size="small"
                        className="files-table"
                    />
                )}

                {/* Selected Actions */}
                {selectedKeys.length > 0 && (
                    <div className="files-selection-bar">
                        <Text style={{ color: 'var(--color-text-primary)' }}>
                            {selectedKeys.length} item(s) selected
                        </Text>
                        <Space>
                            <Button icon={<IconDownload />}>Download</Button>
                            <Button icon={<IconDelete />} type="danger" onClick={handleDelete}>
                                Delete
                            </Button>
                        </Space>
                    </div>
                )}
            </Card>

            {/* File Editor Modal */}
            <Modal
                title={`Edit: ${editingFile?.name || ''}`}
                visible={editorVisible}
                onCancel={() => setEditorVisible(false)}
                footer={
                    <Space>
                        <Button onClick={() => setEditorVisible(false)}>Cancel</Button>
                        <Button
                            theme="solid"
                            type="primary"
                            onClick={() => {
                                Toast.success('File saved successfully');
                                setEditorVisible(false);
                            }}
                        >
                            Save
                        </Button>
                    </Space>
                }
                width={800}
                className="file-editor-modal"
            >
                <div className="file-editor">
                    <div className="editor-toolbar">
                        <Text type="secondary">
                            {editingFile?.path} • {formatSize(editingFile?.size || 0)}
                        </Text>
                    </div>
                    <textarea
                        className="code-editor"
                        value={fileContent}
                        onChange={(e) => setFileContent(e.target.value)}
                        spellCheck={false}
                    />
                </div>
            </Modal>

            {/* Create Modal */}
            <Modal
                title={createType === 'file' ? 'Create New File' : 'Create New Folder'}
                visible={createModalVisible}
                onCancel={() => setCreateModalVisible(false)}
                onOk={handleCreate}
                okText="Create"
            >
                <Input
                    placeholder={createType === 'file' ? 'filename.txt' : 'folder-name'}
                    value={newItemName}
                    onChange={setNewItemName}
                    prefix={createType === 'file' ? <IconFile /> : <IconFolder />}
                />
            </Modal>
        </div>
    );
};

export default Files;
