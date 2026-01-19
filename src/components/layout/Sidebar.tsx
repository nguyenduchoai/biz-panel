/**
 * Main Sidebar Navigation Component - Premium Design
 */
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Nav, Dropdown, Typography } from '@douyinfe/semi-ui';
import type { OnSelectedData } from '@douyinfe/semi-ui/lib/es/navigation';
import {
    IconHome,
    IconGlobe,
    IconServer,
    IconSafe,
    IconFolder,
    IconFile,
    IconTerminal,
    IconClock,
    IconGridView,
    IconSetting,
    IconChevronDown,
    IconCode,
    IconKey,
} from '@douyinfe/semi-icons';
import { useAppStore } from '../../stores/appStore';
import { useTranslation } from '../../locales';
import './Sidebar.css';

const { Text } = Typography;

const Sidebar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { sidebarCollapsed } = useAppStore();
    const { t } = useTranslation();

    const navItems = [
        { itemKey: '/', text: t.sidebar.dashboard, icon: <IconHome /> },
        {
            itemKey: 'infrastructure',
            text: t.sidebar.infrastructure,
            items: [
                { itemKey: '/websites', text: t.sidebar.websites, icon: <IconGlobe /> },
                { itemKey: '/databases', text: t.sidebar.databases, icon: <IconServer /> },
                { itemKey: '/docker', text: t.sidebar.docker, icon: <span className="sidebar-emoji">🐳</span> },
            ]
        },
        {
            itemKey: 'software',
            text: t.sidebar.software,
            items: [
                { itemKey: '/services', text: t.sidebar.services, icon: <span className="sidebar-emoji">🛠️</span> },
                { itemKey: '/software', text: t.sidebar.softwareMenu, icon: <IconCode /> },
                { itemKey: '/php', text: t.sidebar.php, icon: <span className="sidebar-emoji">🐘</span> },
                { itemKey: '/ssl', text: t.sidebar.sslCerts, icon: <IconKey /> },
            ]
        },
        {
            itemKey: 'operations',
            text: t.sidebar.operations,
            items: [
                { itemKey: '/security', text: t.sidebar.security, icon: <IconSafe /> },
                { itemKey: '/files', text: t.sidebar.files, icon: <IconFolder /> },
                { itemKey: '/logs', text: t.sidebar.logs, icon: <IconFile /> },
                { itemKey: '/terminal', text: t.sidebar.terminal, icon: <IconTerminal /> },
                { itemKey: '/cron', text: t.sidebar.cronjobs, icon: <IconClock /> },
            ]
        },
        {
            itemKey: 'extras',
            text: t.sidebar.extras,
            items: [
                { itemKey: '/appstore', text: t.sidebar.appStore, icon: <IconGridView /> },
                { itemKey: '/settings', text: t.sidebar.settings, icon: <IconSetting /> },
            ]
        },
    ];

    const handleSelect = (data: OnSelectedData) => {
        if (typeof data.itemKey === 'string') {
            navigate(data.itemKey);
        }
    };

    return (
        <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <div className="logo">
                    <span className="logo-icon">⚡</span>
                    {!sidebarCollapsed && <span className="logo-text">Biz-Panel</span>}
                </div>
            </div>

            <div className="sidebar-content">
                <Nav
                    mode="vertical"
                    selectedKeys={[location.pathname]}
                    defaultOpenKeys={['infrastructure', 'software', 'operations', 'extras']}
                    items={navItems}
                    onSelect={handleSelect}
                    isCollapsed={sidebarCollapsed}
                    footer={{
                        collapseButton: false,
                    }}
                />
            </div>

            <div className="sidebar-footer">
                <Dropdown
                    trigger="click"
                    position="topLeft"
                    render={
                        <Dropdown.Menu>
                            <Dropdown.Item>Production Server</Dropdown.Item>
                            <Dropdown.Item>Staging Server</Dropdown.Item>
                            <Dropdown.Divider />
                            <Dropdown.Item>Add Server</Dropdown.Item>
                        </Dropdown.Menu>
                    }
                >
                    <div className="server-selector">
                        <div className="server-status">
                            <span className="status-dot running" />
                            {!sidebarCollapsed && (
                                <>
                                    <Text className="server-name">Server 1</Text>
                                    <IconChevronDown size="small" />
                                </>
                            )}
                        </div>
                    </div>
                </Dropdown>
            </div>
        </div>
    );
};

export default Sidebar;
