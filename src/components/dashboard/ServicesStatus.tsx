/**
 * Services Status Component
 */
import React from 'react';
import { Card, Typography, Tag, Spin } from '@douyinfe/semi-ui';
import { useQuery } from '@tanstack/react-query';
import { getServices } from '../../services/mockApi';
import './ServicesStatus.css';

const { Text } = Typography;

const ServicesStatus: React.FC = () => {
    const { data: services, isLoading } = useQuery({
        queryKey: ['services'],
        queryFn: getServices,
        refetchInterval: 10000,
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'running': return 'green';
            case 'stopped': return 'red';
            case 'updating': return 'orange';
            default: return 'grey';
        }
    };

    return (
        <Card className="services-card" title="Services Status">
            {isLoading ? (
                <div className="services-loading">
                    <Spin />
                </div>
            ) : (
                <div className="services-list">
                    {services?.map((service, index) => (
                        <div key={index} className="service-item">
                            <div className="service-info">
                                <span className={`status-dot ${service.status}`} />
                                <Text className="service-name">{service.name}</Text>
                            </div>
                            <Tag color={getStatusColor(service.status)} className="service-tag">
                                {service.status === 'running' ? 'Running' : 'Stopped'}
                            </Tag>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
};

export default ServicesStatus;
