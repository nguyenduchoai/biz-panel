/**
 * Terminal Page
 * Web-based SSH terminal with xterm.js simulation
 */
import React, { useState, useEffect, useRef } from 'react';
import {
    Typography,
    Card,
    Button,
    Tabs,
    TabPane,
    Space,
    Select,
    Toast,
} from '@douyinfe/semi-ui';
import {
    IconPlus,
    IconClose,
    IconSetting,
    IconTerminal,
} from '@douyinfe/semi-icons';
import './Terminal.css';

const { Title, Text } = Typography;

interface TerminalTab {
    id: string;
    name: string;
    type: 'server' | 'container';
    containerId?: string;
    history: string[];
    currentLine: string;
}

// Mock containers for shell access
const CONTAINERS = [
    { value: 'server', label: '🖥️ Server Shell', type: 'server' as const },
    { value: 'nginx-proxy', label: '🐳 nginx-proxy', type: 'container' as const },
    { value: 'postgres-main', label: '🐳 postgres-main', type: 'container' as const },
    { value: 'redis-cache', label: '🐳 redis-cache', type: 'container' as const },
    { value: 'api-service', label: '🐳 api-service', type: 'container' as const },
];

// Simulated command responses
const getCommandResponse = (cmd: string, type: 'server' | 'container'): string[] => {
    const command = cmd.trim().toLowerCase();

    if (command === 'help' || command === '?') {
        return [
            'Available commands:',
            '  help       - Show this help message',
            '  ls         - List directory contents',
            '  pwd        - Print working directory',
            '  whoami     - Print current user',
            '  date       - Show current date/time',
            '  uptime     - Show system uptime',
            '  df -h      - Show disk usage',
            '  free -h    - Show memory usage',
            '  docker ps  - List containers',
            '  clear      - Clear terminal',
            '',
        ];
    }

    if (command === 'ls' || command === 'ls -la') {
        if (type === 'container') {
            return [
                'total 32',
                'drwxr-xr-x  1 root root 4096 Jan 18 10:00 .',
                'drwxr-xr-x  1 root root 4096 Jan 18 10:00 ..',
                '-rw-r--r--  1 root root  156 Jan 18 10:00 Dockerfile',
                'drwxr-xr-x  2 root root 4096 Jan 18 10:00 config',
                'drwxr-xr-x  5 root root 4096 Jan 18 10:00 data',
                '-rw-r--r--  1 root root 1234 Jan 18 10:00 entrypoint.sh',
                '',
            ];
        }
        return [
            'total 48',
            'drwxr-xr-x  5 admin admin 4096 Jan 18 10:00 .',
            'drwxr-xr-x  3 root  root  4096 Jan 18 10:00 ..',
            '-rw-r--r--  1 admin admin  220 Jan 18 10:00 .bash_logout',
            '-rw-r--r--  1 admin admin 3771 Jan 18 10:00 .bashrc',
            'drwxr-xr-x  2 admin admin 4096 Jan 18 10:00 .ssh',
            'drwxr-xr-x  8 admin admin 4096 Jan 18 10:00 compose',
            'drwxr-xr-x 12 admin admin 4096 Jan 18 10:00 web',
            '',
        ];
    }

    if (command === 'pwd') {
        return [type === 'container' ? '/app' : '/home/admin', ''];
    }

    if (command === 'whoami') {
        return [type === 'container' ? 'root' : 'admin', ''];
    }

    if (command === 'date') {
        return [new Date().toString(), ''];
    }

    if (command === 'uptime') {
        return [
            ' 12:30:45 up 15 days,  3:42,  1 user,  load average: 0.45, 0.52, 0.48',
            '',
        ];
    }

    if (command === 'df -h') {
        return [
            'Filesystem      Size  Used Avail Use% Mounted on',
            '/dev/sda1       500G  120G  380G  24% /',
            'tmpfs           4.0G     0  4.0G   0% /dev/shm',
            '/dev/sda2        50G   12G   38G  24% /boot',
            '',
        ];
    }

    if (command === 'free -h') {
        return [
            '              total        used        free      shared  buff/cache   available',
            'Mem:           8.0G        5.2G        1.2G        256M        1.6G        2.3G',
            'Swap:          2.0G          0B        2.0G',
            '',
        ];
    }

    if (command === 'docker ps') {
        return [
            'CONTAINER ID   IMAGE            STATUS         PORTS',
            'a1b2c3d4e5f6   nginx:alpine     Up 2 days      80/tcp, 443/tcp',
            'b2c3d4e5f6g7   postgres:16      Up 5 days      5432/tcp',
            'c3d4e5f6g7h8   redis:7-alpine   Up 5 days      6379/tcp',
            'd4e5f6g7h8i9   node:20-alpine   Up 6 hours     3000/tcp',
            '',
        ];
    }

    if (command === 'exit') {
        return ['logout', ''];
    }

    if (command === '' || command === 'clear') {
        return [];
    }

    return [`bash: ${cmd.split(' ')[0]}: command not found`, ''];
};

const Terminal: React.FC = () => {
    const [tabs, setTabs] = useState<TerminalTab[]>([
        {
            id: 'server-1',
            name: 'Server Shell',
            type: 'server',
            history: [
                'Welcome to Biz-Panel Terminal',
                'Type "help" for available commands',
                '',
            ],
            currentLine: '',
        },
    ]);
    const [activeTab, setActiveTab] = useState('server-1');
    const [newTabType, setNewTabType] = useState('server');
    const inputRef = useRef<HTMLInputElement>(null);
    const terminalRef = useRef<HTMLDivElement>(null);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, [activeTab]);

    // Auto scroll to bottom
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [tabs]);

    // Get current tab
    const currentTab = tabs.find((t) => t.id === activeTab);

    // Handle command input
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && currentTab) {
            const cmd = currentTab.currentLine;
            const prompt = currentTab.type === 'container' ? 'root@container:~$' : 'admin@server:~$';

            if (cmd === 'clear') {
                setTabs((prev) =>
                    prev.map((t) =>
                        t.id === activeTab
                            ? { ...t, history: [], currentLine: '' }
                            : t
                    )
                );
                return;
            }

            const response = getCommandResponse(cmd, currentTab.type);
            setTabs((prev) =>
                prev.map((t) =>
                    t.id === activeTab
                        ? {
                            ...t,
                            history: [...t.history, `${prompt} ${cmd}`, ...response],
                            currentLine: '',
                        }
                        : t
                )
            );
        }
    };

    // Handle input change
    const handleInputChange = (value: string) => {
        setTabs((prev) =>
            prev.map((t) =>
                t.id === activeTab ? { ...t, currentLine: value } : t
            )
        );
    };

    // Add new tab
    const addTab = () => {
        const container = CONTAINERS.find((c) => c.value === newTabType);
        if (!container) return;

        const newTab: TerminalTab = {
            id: `${newTabType}-${Date.now()}`,
            name: container.label,
            type: container.type,
            containerId: container.type === 'container' ? newTabType : undefined,
            history: [
                container.type === 'container'
                    ? `Connecting to container ${newTabType}...`
                    : 'Welcome to Biz-Panel Terminal',
                'Type "help" for available commands',
                '',
            ],
            currentLine: '',
        };

        setTabs((prev) => [...prev, newTab]);
        setActiveTab(newTab.id);
        Toast.success(`Connected to ${container.label}`);
    };

    // Close tab
    const closeTab = (tabId: string) => {
        if (tabs.length <= 1) {
            Toast.warning('Cannot close the last tab');
            return;
        }

        const index = tabs.findIndex((t) => t.id === tabId);
        setTabs((prev) => prev.filter((t) => t.id !== tabId));

        if (activeTab === tabId) {
            const newIndex = Math.max(0, index - 1);
            setActiveTab(tabs[newIndex]?.id || tabs[0]?.id);
        }
    };

    // Focus terminal
    const focusTerminal = () => {
        inputRef.current?.focus();
    };

    return (
        <div className="terminal-page page-enter">
            {/* Header */}
            <div className="page-header">
                <div>
                    <Title heading={3} style={{ color: 'var(--color-text-primary)', margin: 0 }}>
                        Terminal
                    </Title>
                    <Text type="secondary">Web-based SSH terminal</Text>
                </div>
                <Space>
                    <Select
                        value={newTabType}
                        onChange={(v) => setNewTabType(v as string)}
                        style={{ width: 180 }}
                        optionList={CONTAINERS}
                    />
                    <Button icon={<IconPlus />} theme="solid" type="primary" onClick={addTab}>
                        New Tab
                    </Button>
                    <Button icon={<IconSetting />}>Settings</Button>
                </Space>
            </div>

            {/* Terminal Card */}
            <Card className="terminal-card">
                {/* Tabs */}
                <Tabs
                    type="card"
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    tabBarExtraContent={
                        <Button
                            icon={<IconPlus />}
                            theme="borderless"
                            size="small"
                            onClick={addTab}
                        />
                    }
                >
                    {tabs.map((tab) => (
                        <TabPane
                            key={tab.id}
                            tab={
                                <div className="terminal-tab">
                                    <IconTerminal style={{ marginRight: 6 }} />
                                    {tab.name}
                                    {tabs.length > 1 && (
                                        <IconClose
                                            className="tab-close"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                closeTab(tab.id);
                                            }}
                                        />
                                    )}
                                </div>
                            }
                            itemKey={tab.id}
                        />
                    ))}
                </Tabs>

                {/* Terminal Content */}
                <div className="terminal-content" onClick={focusTerminal}>
                    <div className="terminal-output" ref={terminalRef}>
                        {currentTab?.history.map((line, i) => (
                            <div key={i} className="terminal-line">
                                {line}
                            </div>
                        ))}
                        <div className="terminal-input-line">
                            <span className="terminal-prompt">
                                {currentTab?.type === 'container' ? 'root@container:~$' : 'admin@server:~$'}
                            </span>
                            <input
                                ref={inputRef}
                                type="text"
                                className="terminal-input"
                                value={currentTab?.currentLine || ''}
                                onChange={(e) => handleInputChange(e.target.value)}
                                onKeyDown={handleKeyDown}
                                spellCheck={false}
                                autoComplete="off"
                            />
                            <span className="terminal-cursor" />
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default Terminal;
