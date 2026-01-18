/**
 * Resource Card Component - CPU, Memory, Disk, Temperature
 */
import React from 'react';
import { Card, Progress, Typography } from '@douyinfe/semi-ui';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import './ResourceCard.css';

const { Text, Title } = Typography;

interface ResourceCardProps {
    icon: React.ReactNode;
    title: string;
    value: string;
    percentage: number;
    subtitle?: string;
    trend?: number[];
    color?: string;
}

const ResourceCard: React.FC<ResourceCardProps> = ({
    icon,
    title,
    value,
    percentage,
    subtitle,
    trend,
    color = '#0066ff',
}) => {
    const chartData = trend?.map((v, i) => ({ value: v, index: i })) || [];

    return (
        <Card className="resource-card">
            <div className="resource-card-header">
                <div className="resource-icon" style={{ backgroundColor: `${color}20`, color }}>
                    {icon}
                </div>
                <Text className="resource-title">{title}</Text>
            </div>

            <div className="resource-card-body">
                <div className="resource-value-container">
                    <Title heading={2} className="resource-value">{value}</Title>
                    {subtitle && <Text type="secondary" className="resource-subtitle">{subtitle}</Text>}
                </div>

                <Progress
                    percent={percentage}
                    type="circle"
                    size="default"
                    width={60}
                    strokeWidth={6}
                    stroke={color}
                    showInfo
                    format={() => `${percentage}%`}
                />
            </div>

            {trend && trend.length > 0 && (
                <div className="resource-chart">
                    <ResponsiveContainer width="100%" height={40}>
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke={color}
                                strokeWidth={2}
                                fill={`url(#gradient-${title})`}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </Card>
    );
};

export default ResourceCard;
