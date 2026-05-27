import { useEffect, useState } from 'react';
import { HealthCheckManager, HealthStatus } from './healthCheck';
import { api } from './auth';

let globalHealthCheckManager: HealthCheckManager | null = null;

const getOrCreateHealthCheckManager = (): HealthCheckManager => {
  if (!globalHealthCheckManager) {
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://192.168.1.65:8000';
    globalHealthCheckManager = new HealthCheckManager(backendUrl, api);
    globalHealthCheckManager.startMonitoring(30000);
  }
  return globalHealthCheckManager;
};

export const useHealthCheck = () => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    isHealthy: false,
    message: 'Verificando...',
    lastCheck: 0,
    responseTime: 0,
  });

  useEffect(() => {
    const manager = getOrCreateHealthCheckManager();

    const unsubscribe = manager.subscribe(status => {
      setHealthStatus(status);
    });

    return unsubscribe;
  }, []);

  return healthStatus;
};

export const stopHealthCheck = () => {
  if (globalHealthCheckManager) {
    globalHealthCheckManager.stopMonitoring();
  }
};

export const startHealthCheck = () => {
  const manager = getOrCreateHealthCheckManager();
  manager.startMonitoring(30000);
};
