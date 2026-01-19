/**
 * Login Page - Authentication Entry Point
 */
import React, { useState } from 'react';
import { Button, Input, Card, Typography, Toast } from '@douyinfe/semi-ui';
import { IconLock, IconUser } from '@douyinfe/semi-icons';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';
import './Login.css';

const { Title, Text } = Typography;

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!username || !password) {
            Toast.error('Please enter username and password');
            return;
        }

        setLoading(true);

        try {
            const response = await login(username, password);

            // Store token and user info
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
            localStorage.setItem('tokenExpiry', String(response.expiresAt));

            Toast.success(`Welcome, ${response.user.username}!`);
            navigate('/');
        } catch (error) {
            Toast.error(error instanceof Error ? error.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-background">
                <div className="bg-gradient"></div>
                <div className="bg-pattern"></div>
            </div>

            <div className="login-container">
                <Card className="login-card">
                    <div className="login-header">
                        <div className="login-logo">
                            <span className="logo-icon">⚡</span>
                        </div>
                        <Title heading={2} className="login-title">Biz-Panel</Title>
                        <Text type="secondary" className="login-subtitle">
                            Server Management Made Simple
                        </Text>
                    </div>

                    <form onSubmit={handleLogin} className="login-form">
                        <div className="form-group">
                            <Input
                                prefix={<IconUser />}
                                placeholder="Username"
                                value={username}
                                onChange={setUsername}
                                size="large"
                                disabled={loading}
                                autoComplete="username"
                            />
                        </div>

                        <div className="form-group">
                            <Input
                                prefix={<IconLock />}
                                placeholder="Password"
                                value={password}
                                onChange={setPassword}
                                type="password"
                                mode="password"
                                size="large"
                                disabled={loading}
                                autoComplete="current-password"
                            />
                        </div>

                        <Button
                            htmlType="submit"
                            theme="solid"
                            type="primary"
                            size="large"
                            block
                            loading={loading}
                            className="login-button"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </form>

                    <div className="login-footer">
                        <Text type="tertiary" size="small">
                            Secure server management panel
                        </Text>
                    </div>
                </Card>

                <div className="login-info">
                    <Text type="tertiary" size="small">
                        Biz-Panel v1.1.0 • © 2026 Bizino
                    </Text>
                </div>
            </div>
        </div>
    );
};

export default Login;
