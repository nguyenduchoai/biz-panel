/**
 * Logs Page
 * Real-time log viewer with filtering and search
 */
import React, { useState, useEffect, useRef } from 'react';
import {
    Typography,
    Card,
    Button,
    Select,
    Input,
    Space,
    Tag,
    Switch,
    Toast,
} from '@douyinfe/semi-ui';
import {
    IconRefresh,
    IconDownload,
    IconDelete,
    IconSearch,
    IconPlay,
    IconPause,
} from '@douyinfe/semi-icons';
import './Logs.css';

const { Title, Text } = Typography;

interface LogEntry {
    id: string;
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    source: string;
    message: string;
}

// Mock log sources
const LOG_SOURCES = [
    { value: 'system', label: '🖥️ System Log' },
    { value: 'nginx-access', label: '🌐 NGINX Access' },
    { value: 'nginx-error', label: '🌐 NGINX Error' },
    { value: 'mysql', label: '🐬 MySQL' },
    { value: 'postgres', label: '🐘 PostgreSQL' },
    { value: 'docker', label: '🐳 Docker' },
    { value: 'php-fpm', label: '🐘 PHP-FPM' },
    { value: 'ssh', label: '🔐 SSH' },
];

// Generate mock logs
const generateMockLogs = (source: string, count: number): LogEntry[] => {
    const levels: LogEntry['level'][] = ['info', 'info', 'info', 'warn', 'error', 'debug'];
    const messages: Record<string, string[]> = {
        'nginx-access': [
            '192.168.1.1 "GET /api/users" 200 0.023s',
            '192.168.1.2 "POST /api/orders" 201 0.045s',
            '192.168.1.3 "GET /health" 200 0.001s',
            '10.0.0.5 "GET /static/app.js" 200 0.012s',
            '192.168.1.1 "DELETE /api/users/123" 404 0.005s',
        ],
        'nginx-error': [
            '[warn] upstream timed out (110: Connection timeout)',
            '[error] connect() failed (111: Connection refused)',
            '[crit] disk full - cannot write to /var/log',
            '[notice] reload signal received',
        ],
        'mysql': [
            'Query completed: SELECT * FROM users - 0.05s',
            'Slow query detected: 234ms - SELECT * FROM orders JOIN...',
            'Connection established from 10.0.0.5',
            'Index optimization completed for table products',
        ],
        'docker': [
            'Container nginx-proxy started',
            'Image pull completed: postgres:16',
            'Health check passed: redis-cache',
            'Container api-service restarting',
        ],
        'system': [
            'CPU usage: 45%',
            'Memory available: 3.2GB / 8GB',
            'Disk I/O: read 125MB/s, write 45MB/s',
            'Network: 1.2GB received, 890MB sent',
            'Cron job executed: backup.sh',
        ],
        'ssh': [
            'Accepted publickey for admin from 192.168.1.100',
            'Failed password for root from 45.33.32.156',
            'Connection closed by 192.168.1.100',
            'Session opened for user admin',
        ],
        'php-fpm': [
            '[pool www] child 12345 started',
            'WARNING: slow request 234ms',
            '[pool www] child 12346 exited with code 0',
        ],
        'postgres': [
            'LOG: checkpoint complete',
            'LOG: autovacuum: found 123 removable',
            'ERROR: relation "temp_table" does not exist',
            'LOG: connection received: host=10.0.0.5',
        ],
    };

    const logs: LogEntry[] = [];
    const now = Date.now();
    const sourceMessages = messages[source] || messages['system'];

    for (let i = 0; i < count; i++) {
        const timestamp = new Date(now - i * (Math.random() * 5000 + 1000)).toISOString();
        logs.push({
            id: `${source}-${i}`,
            timestamp,
            level: levels[Math.floor(Math.random() * levels.length)],
            source,
            message: sourceMessages[Math.floor(Math.random() * sourceMessages.length)],
        });
    }

    return logs.reverse();
};

const Logs: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [source, setSource] = useState('nginx-access');
    const [level, setLevel] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isStreaming, setIsStreaming] = useState(true);
    const [autoScroll, setAutoScroll] = useState(true);
    const logsContainerRef = useRef<HTMLDivElement>(null);
    const streamIntervalRef = useRef<number | null>(null);

    // Load initial logs
    useEffect(() => {
        setLogs(generateMockLogs(source, 50));
    }, [source]);

    // Stream new logs
    useEffect(() => {
        if (isStreaming) {
            streamIntervalRef.current = window.setInterval(() => {
                const newLog = generateMockLogs(source, 1)[0];
                newLog.id = `${source}-${Date.now()}`;
                newLog.timestamp = new Date().toISOString();
                setLogs((prev) => [...prev.slice(-199), newLog]);
            }, 2000);
        }

        return () => {
            if (streamIntervalRef.current) {
                clearInterval(streamIntervalRef.current);
            }
        };
    }, [isStreaming, source]);

    // Auto scroll
    useEffect(() => {
        if (autoScroll && logsContainerRef.current) {
            logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    // Filter logs
    const filteredLogs = logs.filter((log) => {
        const matchesLevel = level === 'all' || log.level === level;
        const matchesSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesLevel && matchesSearch;
    });

    // Get level tag color
    const getLevelColor = (lvl: LogEntry['level']): 'red' | 'orange' | 'blue' | 'grey' => {
        switch (lvl) {
            case 'error':
                return 'red';
            case 'warn':
                return 'orange';
            case 'info':
                return 'blue';
            case 'debug':
                return 'grey';
            default:
                return 'grey';
        }
    };

    // Format timestamp
    const formatTimestamp = (ts: string): string => {
        return new Date(ts).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        });
    };

    return (
        <div className="logs-page page-enter">
            {/* Header */}
            <div className="page-header">
                <div>
                    <Title heading={3} style={{ color: 'var(--color-text-primary)', margin: 0 }}>
                        Logs
                    </Title>
                    <Text type="secondary">Real-time log viewer</Text>
                </div>
                <Space>
                    <Button icon={<IconDownload />}>Download</Button>
                    <Button icon={<IconDelete />}>Clear</Button>
                </Space>
            </div>

            {/* Log Viewer Card */}
            <Card className="logs-card">
                {/* Toolbar */}
                <div className="logs-toolbar">
                    <Space>
                        <Select
                            value={source}
                            onChange={(v) => setSource(v as string)}
                            style={{ width: 200 }}
                            optionList={LOG_SOURCES}
                        />
                        <Select
                            value={level}
                            onChange={(v) => setLevel(v as string)}
                            style={{ width: 120 }}
                            optionList={[
                                { value: 'all', label: 'All Levels' },
                                { value: 'error', label: '❌ Error' },
                                { value: 'warn', label: '⚠️ Warning' },
                                { value: 'info', label: 'ℹ️ Info' },
                                { value: 'debug', label: '🔍 Debug' },
                            ]}
                        />
                        <Input
                            prefix={<IconSearch />}
                            placeholder="Search logs..."
                            value={searchQuery}
                            onChange={(v) => setSearchQuery(v as string || '')}
                            style={{ width: 200 }}
                        />
                    </Space>

                    <Space>
                        <div className="stream-toggle">
                            <Text type="secondary" style={{ marginRight: 8 }}>
                                Auto-scroll
                            </Text>
                            <Switch checked={autoScroll} onChange={setAutoScroll} size="small" />
                        </div>
                        <Button
                            icon={isStreaming ? <IconPause /> : <IconPlay />}
                            theme={isStreaming ? 'solid' : 'light'}
                            type={isStreaming ? 'warning' : 'primary'}
                            onClick={() => {
                                setIsStreaming(!isStreaming);
                                Toast.info(isStreaming ? 'Streaming paused' : 'Streaming resumed');
                            }}
                        >
                            {isStreaming ? 'Pause' : 'Resume'}
                        </Button>
                        <Button icon={<IconRefresh />} onClick={() => setLogs(generateMockLogs(source, 50))}>
                            Refresh
                        </Button>
                    </Space>
                </div>

                {/* Log Entries */}
                <div className="logs-container" ref={logsContainerRef}>
                    {filteredLogs.map((log) => (
                        <div key={log.id} className={`log-entry log-${log.level}`}>
                            <span className="log-timestamp">{formatTimestamp(log.timestamp)}</span>
                            <Tag color={getLevelColor(log.level)} size="small" className="log-level">
                                {log.level.toUpperCase()}
                            </Tag>
                            <span className="log-message">{log.message}</span>
                        </div>
                    ))}
                    {isStreaming && (
                        <div className="log-streaming-indicator">
                            <span className="streaming-dot" />
                            <Text type="secondary">Streaming...</Text>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="logs-footer">
                    <Text type="secondary">
                        Showing {filteredLogs.length} of {logs.length} entries
                    </Text>
                    <Text type="secondary">Source: {LOG_SOURCES.find((s) => s.value === source)?.label}</Text>
                </div>
            </Card>
        </div>
    );
};

export default Logs;
