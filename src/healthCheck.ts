import axios, { AxiosInstance } from 'axios';

export interface HealthStatus {
  isHealthy: boolean;
  message: string;
  lastCheck: number;
  responseTime: number;
  error?: string;
}

export class HealthCheckManager {
  private api: AxiosInstance;
  private backendUrl: string;
  private healthStatus: HealthStatus = {
    isHealthy: false,
    message: 'Nunca verificado',
    lastCheck: 0,
    responseTime: 0,
  };
  private checkInterval: NodeJS.Timeout | null = null;
  private listeners: ((status: HealthStatus) => void)[] = [];

  constructor(backendUrl: string, axiosInstance: AxiosInstance) {
    this.api = axiosInstance;
    this.backendUrl = backendUrl;
  }

  private async performHealthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      const response = await Promise.race([
        this.api.get('/health', { timeout: 5000 }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 6000)),
      ]);

      const responseTime = Date.now() - startTime;

      const status: HealthStatus = {
        isHealthy: true,
        message: 'Servidor conectado e funcionando normalmente',
        lastCheck: Date.now(),
        responseTime,
      };

      this.healthStatus = status;
      return status;
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      let errorMessage = 'Falha ao conectar com o servidor';

      if (error?.response?.status === 404) {
        errorMessage =
          'Endpoint de saúde não encontrado. Servidor pode estar configurado incorretamente.';
      } else if (error?.response?.status >= 500) {
        errorMessage = `Erro do servidor (${error.response.status}). Tente novamente em alguns momentos.`;
      } else if (error?.code === 'ECONNREFUSED') {
        errorMessage =
          'Conexão recusada. Certifique-se de que o servidor está rodando e acessível.';
      } else if (error?.message === 'Timeout') {
        errorMessage = 'Servidor demorando para responder. Verifique a conexão de rede.';
      } else if (error?.message?.includes('Network')) {
        errorMessage = 'Erro de rede. Verifique sua conexão com a internet.';
      }

      const status: HealthStatus = {
        isHealthy: false,
        message: errorMessage,
        lastCheck: Date.now(),
        responseTime,
        error: error?.message || 'Erro desconhecido',
      };

      this.healthStatus = status;
      return status;
    }
  }

  async checkHealth(): Promise<HealthStatus> {
    const status = await this.performHealthCheck();
    this.notifyListeners(status);
    return status;
  }

  startMonitoring(intervalMs: number = 30000) {
    // Verificação imediata
    this.checkHealth();

    // Verificações periódicas (a cada 30 segundos por padrão)
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.checkHealth();
    }, intervalMs);
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  subscribe(listener: (status: HealthStatus) => void) {
    this.listeners.push(listener);
    // Notificar imediatamente com status atual
    listener(this.healthStatus);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(status: HealthStatus) {
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Erro ao notificar listener de health check:', error);
      }
    });
  }

  getStatus(): HealthStatus {
    return { ...this.healthStatus };
  }

  isHealthy(): boolean {
    return this.healthStatus.isHealthy;
  }
}
