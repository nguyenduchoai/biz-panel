/**
 * File Manager Page - Real API Integration
 * Browse and manage server files
 */
import React, { useState } from 'react';
import {
    Typography,
    Card,
    Button,
    Table,
    Breadcrumb,
    Input,
    Modal,
    Toast,
    Spin,
    Empty,
    Popconfirm,
} from '@douyinfe/semi-ui';
import {
    IconPlus,
    IconRefresh,
    IconFolder,
    IconFile,
    IconArrowUp,
    IconDelete,
    IconEdit,
    IconSearch,
} from '@douyinfe/semi-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    listDirectory,
    readFile,
    writeFile,
    createDirectory,
    deletePath,
    renamePath,
    searchFiles,
    type FileInfo,
    formatBytes,
} from '../services/api';
import './Files.css';

const { Title, Text } = Typography;

const Files: React.FC = () => {
    const [currentPath, setCurrentPath] = useState('/var/www');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
    const [fileContent, setFileContent] = useState('');
    const [editorVisible, setEditorVisible] = useState(false);
    const [newFolderVisible, setNewFolderVisible] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [renameVisible, setRenameVisible] = useState(false);
    const [newName, setNewName] = useState('');
    const queryClient = useQueryClient();

    const { data: dirData, isLoading, refetch } = useQuery({
        queryKey: ['files', currentPath],
        queryFn: () => listDirectory(currentPath),
    });

    const { data: searchResults } = useQuery({
        queryKey: ['fileSearch', currentPath, searchTerm],
        queryFn: () => searchFiles(currentPath, searchTerm),
        enabled: searchTerm.length > 2,
    });

    const readFileMutation = useMutation({
        mutationFn: readFile,
        onSuccess: (data) => {
            setFileContent(data.content);
            setEditorVisible(true);
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const writeFileMutation = useMutation({
        mutationFn: ({ path, content }: { path: string; content: string }) => writeFile(path, content),
        onSuccess: () => {
            Toast.success('File saved');
            setEditorVisible(false);
            queryClient.invalidateQueries({ queryKey: ['files', currentPath] });
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const createDirMutation = useMutation({
        mutationFn: createDirectory,
        onSuccess: () => {
            Toast.success('Folder created');
            setNewFolderVisible(false);
            setNewFolderName('');
            queryClient.invalidateQueries({ queryKey: ['files', currentPath] });
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const deleteMutation = useMutation({
        mutationFn: deletePath,
        onSuccess: () => {
            Toast.success('Deleted');
            queryClient.invalidateQueries({ queryKey: ['files', currentPath] });
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const renameMutation = useMutation({
        mutationFn: ({ oldPath, newPath }: { oldPath: string; newPath: string }) => renamePath(oldPath, newPath),
        onSuccess: () => {
            Toast.success('Renamed');
            setRenameVisible(false);
            setSelectedFile(null);
            queryClient.invalidateQueries({ queryKey: ['files', currentPath] });
        },
        onError: (err: Error) => Toast.error(err.message),
    });

    const files = searchTerm.length > 2 ? (searchResults?.results || []) : (dirData?.files || []);

    const handleFileClick = (file: FileInfo) => {
        if (file.isDirectory) {
            setCurrentPath(file.path);
            setSearchTerm('');
        } else {
            // Open file editor for text files
            const textExtensions = ['txt', 'json', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'md', 'php', 'py', 'sh', 'yml', 'yaml', 'conf', 'log', 'env'];
            if (textExtensions.includes(file.extension.toLowerCase())) {
                setSelectedFile(file);
                readFileMutation.mutate(file.path);
            } else {
                Toast.info('Binary files cannot be edited');
            }
        }
    };

    const handleGoUp = () => {
        if (dirData?.parent) {
            setCurrentPath(dirData.parent);
        }
    };

    const handleCreateFolder = () => {
        if (!newFolderName.trim()) {
            Toast.error('Please enter a folder name');
            return;
        }
        createDirMutation.mutate(`${currentPath}/${newFolderName}`);
    };

    const handleRename = () => {
        if (!selectedFile || !newName.trim()) return;
        const newPath = currentPath + '/' + newName;
        renameMutation.mutate({ oldPath: selectedFile.path, newPath });
    };

    const handleSaveFile = () => {
        if (!selectedFile) return;
        writeFileMutation.mutate({ path: selectedFile.path, content: fileContent });
    };

    const openRename = (file: FileInfo) => {
        setSelectedFile(file);
        setNewName(file.name);
        setRenameVisible(true);
    };

    const pathParts = currentPath.split('/').filter(Boolean);

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (name: string, record: FileInfo) => (
                <div className="file-name" onClick={() => handleFileClick(record)}>
                    {record.isDirectory ? <IconFolder size="large" /> : <IconFile size="large" />}
                    <span className="file-name-text">{name}</span>
                </div>
            ),
        },
        {
            title: 'Size',
            dataIndex: 'size',
            key: 'size',
            render: (size: number, record: FileInfo) => record.isDirectory ? '-' : formatBytes(size),
            width: 100,
        },
        {
            title: 'Permissions',
            dataIndex: 'permissions',
            key: 'permissions',
            render: (perms: string) => <code>{perms}</code>,
            width: 120,
        },
        {
            title: 'Modified',
            dataIndex: 'modTime',
            key: 'modTime',
            render: (time: number) => new Date(time * 1000).toLocaleString(),
            width: 180,
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 120,
            render: (_: unknown, record: FileInfo) => (
                <div className="table-actions">
                    <Button
                        icon={<IconEdit />}
                        theme="borderless"
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            openRename(record);
                        }}
                    />
                    <Popconfirm
                        title={`Delete ${record.isDirectory ? 'folder' : 'file'}?`}
                        onConfirm={() => deleteMutation.mutate(record.path)}
                    >
                        <Button
                            icon={<IconDelete />}
                            theme="borderless"
                            size="small"
                            type="danger"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </Popconfirm>
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
        <div className="files-page page-enter">
            <div className="page-header">
                <div>
                    <Title heading={3} className="page-title">📁 File Manager</Title>
                    <Text type="secondary" className="page-subtitle">
                        Browse and manage server files
                    </Text>
                </div>
                <div className="header-actions">
                    <Button icon={<IconRefresh />} onClick={() => refetch()}>Refresh</Button>
                    <Button icon={<IconPlus />} theme="solid" type="primary" onClick={() => setNewFolderVisible(true)}>
                        New Folder
                    </Button>
                </div>
            </div>

            {/* Toolbar */}
            <Card className="files-toolbar">
                <div className="toolbar-left">
                    <Button icon={<IconArrowUp />} onClick={handleGoUp} disabled={currentPath === '/'}>
                        Up
                    </Button>
                    <Breadcrumb>
                        <Breadcrumb.Item onClick={() => setCurrentPath('/')}>Root</Breadcrumb.Item>
                        {pathParts.map((part, idx) => (
                            <Breadcrumb.Item
                                key={idx}
                                onClick={() => setCurrentPath('/' + pathParts.slice(0, idx + 1).join('/'))}
                            >
                                {part}
                            </Breadcrumb.Item>
                        ))}
                    </Breadcrumb>
                </div>
                <div className="toolbar-right">
                    <Input
                        prefix={<IconSearch />}
                        placeholder="Search files..."
                        value={searchTerm}
                        onChange={setSearchTerm}
                        showClear
                        style={{ width: 250 }}
                    />
                </div>
            </Card>

            {/* Files Table */}
            <Card className="files-table-card">
                {files.length === 0 ? (
                    <Empty description="No files found" />
                ) : (
                    <Table
                        columns={columns}
                        dataSource={files}
                        rowKey="path"
                        pagination={{ pageSize: 20 }}
                        className="files-table"
                        onRow={(record: FileInfo | undefined) => ({
                            onDoubleClick: () => record && handleFileClick(record),
                        })}
                    />
                )}
            </Card>

            {/* File Editor Modal */}
            <Modal
                title={`Edit: ${selectedFile?.name || ''}`}
                visible={editorVisible}
                onCancel={() => setEditorVisible(false)}
                width={800}
                footer={
                    <>
                        <Button onClick={() => setEditorVisible(false)}>Cancel</Button>
                        <Button theme="solid" type="primary" onClick={handleSaveFile} loading={writeFileMutation.isPending}>
                            Save
                        </Button>
                    </>
                }
            >
                <textarea
                    className="file-editor"
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                    style={{
                        width: '100%',
                        height: 400,
                        fontFamily: 'monospace',
                        fontSize: 13,
                        padding: 12,
                        background: 'var(--color-bg-1)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 8,
                        resize: 'vertical',
                    }}
                />
            </Modal>

            {/* New Folder Modal */}
            <Modal
                title="Create New Folder"
                visible={newFolderVisible}
                onCancel={() => setNewFolderVisible(false)}
                footer={
                    <>
                        <Button onClick={() => setNewFolderVisible(false)}>Cancel</Button>
                        <Button theme="solid" type="primary" onClick={handleCreateFolder} loading={createDirMutation.isPending}>
                            Create
                        </Button>
                    </>
                }
            >
                <Input
                    value={newFolderName}
                    onChange={setNewFolderName}
                    placeholder="Folder name"
                    prefix={<IconFolder />}
                />
            </Modal>

            {/* Rename Modal */}
            <Modal
                title="Rename"
                visible={renameVisible}
                onCancel={() => setRenameVisible(false)}
                footer={
                    <>
                        <Button onClick={() => setRenameVisible(false)}>Cancel</Button>
                        <Button theme="solid" type="primary" onClick={handleRename} loading={renameMutation.isPending}>
                            Rename
                        </Button>
                    </>
                }
            >
                <Input
                    value={newName}
                    onChange={setNewName}
                    placeholder="New name"
                />
            </Modal>
        </div>
    );
};

export default Files;
