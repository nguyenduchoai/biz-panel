/**
 * Header Component
 */
import React from 'react';
import { Input, Avatar, Badge, Dropdown, Button, Typography } from '@douyinfe/semi-ui';
import {
    IconSearch,
    IconBell,
    IconMenu,
    IconSun,
    IconMoon,
    IconUser,
    IconSetting,
    IconExit,
} from '@douyinfe/semi-icons';
import { useAppStore } from '../../stores/appStore';
import './Header.css';

const { Text } = Typography;

const Header: React.FC = () => {
    const { toggleSidebar, theme, setTheme, unreadNotifications } = useAppStore();

    const handleThemeToggle = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    return (
        <header className="header">
            <div className="header-left">
                <Button
                    icon={<IconMenu />}
                    theme="borderless"
                    onClick={toggleSidebar}
                    className="menu-button"
                />

                <Input
                    prefix={<IconSearch />}
                    placeholder="Search..."
                    className="search-input"
                    showClear
                />
            </div>

            <div className="header-right">
                <Button
                    icon={theme === 'dark' ? <IconSun /> : <IconMoon />}
                    theme="borderless"
                    onClick={handleThemeToggle}
                    className="icon-button"
                />

                <Dropdown
                    trigger="click"
                    position="bottomRight"
                    render={
                        <Dropdown.Menu>
                            <Dropdown.Item>🚀 api-v2.3.1 deployed - 2m ago</Dropdown.Item>
                            <Dropdown.Item>💾 Backup completed - 15m ago</Dropdown.Item>
                            <Dropdown.Item>🔒 SSL renewed - 1h ago</Dropdown.Item>
                            <Dropdown.Divider />
                            <Dropdown.Item>View all notifications</Dropdown.Item>
                        </Dropdown.Menu>
                    }
                >
                    <Badge count={unreadNotifications} overflowCount={9} type="danger">
                        <Button icon={<IconBell />} theme="borderless" className="icon-button" />
                    </Badge>
                </Dropdown>

                <Dropdown
                    trigger="click"
                    position="bottomRight"
                    render={
                        <Dropdown.Menu>
                            <div className="user-dropdown-header">
                                <Text strong>Admin</Text>
                                <Text type="secondary" size="small">admin@example.com</Text>
                            </div>
                            <Dropdown.Divider />
                            <Dropdown.Item icon={<IconUser />}>Profile</Dropdown.Item>
                            <Dropdown.Item icon={<IconSetting />}>Settings</Dropdown.Item>
                            <Dropdown.Divider />
                            <Dropdown.Item icon={<IconExit />} type="danger">Logout</Dropdown.Item>
                        </Dropdown.Menu>
                    }
                >
                    <div className="user-menu">
                        <Avatar size="small" color="blue">A</Avatar>
                        <Text className="username">Admin</Text>
                    </div>
                </Dropdown>
            </div>
        </header>
    );
};

export default Header;
