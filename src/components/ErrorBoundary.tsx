/**
 * Error Boundary Component
 * Catches JavaScript errors in child component tree
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Typography } from '@douyinfe/semi-ui';
import { IconRefresh } from '@douyinfe/semi-icons';

const { Title, Text } = Typography;

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        this.setState({ errorInfo });

        // Log error to console (in production, send to error tracking service)
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // TODO: Send to error tracking service like Sentry
        // Sentry.captureException(error, { extra: errorInfo });
    }

    handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    handleReload = (): void => {
        window.location.reload();
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    padding: 40,
                    background: 'var(--color-bg-0)',
                    color: 'var(--color-text-primary)',
                }}>
                    <div style={{
                        textAlign: 'center',
                        maxWidth: 500,
                    }}>
                        <div style={{
                            fontSize: 64,
                            marginBottom: 24,
                        }}>
                            😵
                        </div>
                        <Title heading={2} style={{ marginBottom: 16 }}>
                            Oops! Something went wrong
                        </Title>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                            An unexpected error occurred. Please try refreshing the page.
                        </Text>

                        {import.meta.env.DEV && this.state.error && (
                            <details style={{
                                textAlign: 'left',
                                marginBottom: 24,
                                padding: 16,
                                background: 'var(--color-bg-1)',
                                borderRadius: 8,
                                fontSize: 12,
                                fontFamily: 'monospace',
                                overflow: 'auto',
                                maxHeight: 200,
                            }}>
                                <summary style={{ cursor: 'pointer', marginBottom: 8 }}>
                                    Error Details
                                </summary>
                                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                                    {this.state.error.toString()}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}

                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <Button
                                icon={<IconRefresh />}
                                theme="solid"
                                type="primary"
                                onClick={this.handleReload}
                            >
                                Refresh Page
                            </Button>
                            <Button
                                onClick={this.handleReset}
                            >
                                Try Again
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
