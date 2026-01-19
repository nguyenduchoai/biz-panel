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
    IconApps,
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
import './Sidebar.css';

const { Text } = Typography;

const Sidebar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { sidebarCollapsed } = useAppStore();

    const navItems = [
        { itemKey: '/', text: 'Dashboard', icon: <IconHome /> },
        {
            itemKey: 'infrastructure',
            text: 'INFRASTRUCTURE',
            items: [
                { itemKey: '/websites', text: 'Websites', icon: <IconGlobe /> },
                { itemKey: '/projects', text: 'Projects', icon: <IconApps /> },
                { itemKey: '/databases', text: 'Databases', icon: <IconServer /> },
                { itemKey: '/docker', text: 'Docker', icon: <span className="sidebar-emoji">🐳</span> },
            ]
        },
        {
            itemKey: 'software',
            text: 'SOFTWARE',
            items: [
                { itemKey: '/services', text: 'Services', icon: <span className="sidebar-emoji">🛠️</span> },
                { itemKey: '/software', text: 'Software', icon: <IconCode /> },
                { itemKey: '/php', text: 'PHP', icon: <span className="sidebar-emoji">🐘</span> },
                { itemKey: '/ssl', text: 'SSL Certs', icon: <IconKey /> },
            ]
        },
        {
            itemKey: 'operations',
            text: 'OPERATIONS',
            items: [
                { itemKey: '/security', text: 'Security', icon: <IconSafe /> },
                { itemKey: '/files', text: 'Files', icon: <IconFolder /> },
                { itemKey: '/logs', text: 'Logs', icon: <IconFile /> },
                { itemKey: '/terminal', text: 'Terminal', icon: <IconTerminal /> },
                { itemKey: '/cron', text: 'Cronjobs', icon: <IconClock /> },
            ]
        },
        {
            itemKey: 'extras',
            text: 'EXTRAS',
            items: [
                { itemKey: '/appstore', text: 'App Store', icon: <IconGridView /> },
                { itemKey: '/settings', text: 'Settings', icon: <IconSetting /> },
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
