import axios, { AxiosError } from 'axios';

export interface FriendlyError {
  title: string;
  message: string;
  details?: string;
  code?: string;
  actionable: boolean;
  suggestions?: string[];
}

/**
 * Converte erros técnicos em mensagens amigáveis ao usuário
 */
export const handleApiError = (error: any): FriendlyError => {
  // Não é uma requisição
  if (!axios.isAxiosError(error)) {
    return {
      title: 'Erro Inesperado',
      message: 'Ocorreu um erro desconhecido. Tente novamente.',
      code: 'UNKNOWN_ERROR',
      actionable: false,
    };
  }

  const axiosError = error as AxiosError<any>;

  // Erro de conexão (sem resposta do servidor)
  if (!axiosError.response) {
    if (axiosError.code === 'ECONNREFUSED') {
      return {
        title: 'Servidor Indisponível',
        message: 'Não foi possível conectar ao servidor.',
        details: 'A conexão foi recusada. O servidor pode estar offline.',
        code: 'CONNECTION_REFUSED',
        actionable: true,
        suggestions: [
          'Certifique-se de que o servidor está rodando',
          'Verifique a URL do servidor nas configurações',
          'Verifique sua conexão de internet',
          'Tente novamente em alguns momentos',
        ],
      };
    }

    if (axiosError.code === 'ENOTFOUND') {
      return {
        title: 'Servidor Não Encontrado',
        message: 'Não foi possível encontrar o servidor especificado.',
        details: 'O endereço do servidor pode estar incorreto.',
        code: 'SERVER_NOT_FOUND',
        actionable: true,
        suggestions: [
          'Verifique o endereço do servidor',
          'Confirm que o domínio/IP está correto',
          'Verifique sua conexão DNS',
        ],
      };
    }

    if (axiosError.message === 'timeout of') {
      return {
        title: 'Tempo Limite Excedido',
        message: 'O servidor demorou muito para responder.',
        details: 'A requisição expirou após 20 segundos.',
        code: 'REQUEST_TIMEOUT',
        actionable: true,
        suggestions: [
          'Verifique sua conexão de internet',
          'O servidor pode estar sobrecarregado',
          'Tente novamente em alguns momentos',
        ],
      };
    }

    return {
      title: 'Erro de Conexão',
      message: 'Não foi possível conectar ao servidor.',
      details: axiosError.message,
      code: 'CONNECTION_ERROR',
      actionable: true,
      suggestions: [
        'Verifique sua conexão de internet',
        'Certifique-se que o servidor está rodando',
        'Tente novamente',
      ],
    };
  }

  const status = axiosError.response.status;
  const data = axiosError.response.data;

  // 4xx - Erro do Cliente
  if (status === 400) {
    return {
      title: 'Requisição Inválida',
      message: data?.detail || 'Você enviou uma requisição inválida.',
      details: data?.detail,
      code: 'BAD_REQUEST',
      actionable: true,
      suggestions: ['Verifique os dados enviados', 'Tente preencher o formulário novamente'],
    };
  }

  if (status === 401) {
    return {
      title: 'Não Autenticado',
      message: 'Você precisa fazer login novamente.',
      details: 'Sua sessão expirou ou as credenciais são inválidas.',
      code: 'UNAUTHORIZED',
      actionable: true,
      suggestions: ['Faça login novamente', 'Verifique suas credenciais'],
    };
  }

  if (status === 403) {
    return {
      title: 'Acesso Negado',
      message: 'Você não tem permissão para acessar este recurso.',
      details: 'Sua conta pode não ter os direitos necessários.',
      code: 'FORBIDDEN',
      actionable: false,
      suggestions: ['Entre em contato com o administrador', 'Verifique suas permissões'],
    };
  }

  if (status === 404) {
    return {
      title: 'Recurso Não Encontrado',
      message: 'O servidor está respondendo, mas o recurso não foi encontrado.',
      details:
        'Isso pode indicar um problema de configuração do servidor ou versão desatualizada do app.',
      code: 'NOT_FOUND',
      actionable: true,
      suggestions: [
        'Atualize o app para a versão mais recente',
        'Verifique a configuração do servidor',
        'Contate o suporte técnico',
      ],
    };
  }

  if (status === 409) {
    return {
      title: 'Conflito de Dados',
      message: 'Os dados enviados estão em conflito com dados existentes.',
      details: data?.detail,
      code: 'CONFLICT',
      actionable: true,
      suggestions: ['Recarregue a página', 'Verifique se o item já existe', 'Tente novamente'],
    };
  }

  if (status === 422) {
    return {
      title: 'Validação Falhou',
      message: 'Os dados enviados não estão no formato correto.',
      details: data?.detail || 'Verifique os dados e tente novamente.',
      code: 'VALIDATION_ERROR',
      actionable: true,
      suggestions: ['Preencha todos os campos corretamente', 'Tente novamente'],
    };
  }

  // 5xx - Erro do Servidor
  if (status >= 500) {
    return {
      title: 'Erro do Servidor',
      message: `O servidor retornou um erro (${status}).`,
      details: 'A equipe técnica foi notificada. Tente novamente em alguns momentos.',
      code: `SERVER_ERROR_${status}`,
      actionable: true,
      suggestions: [
        'Recarregue a página',
        'Tente novamente em alguns momentos',
        'Se o problema persistir, contate o suporte',
      ],
    };
  }

  if (status === 503) {
    return {
      title: 'Servidor Indisponível',
      message: 'O servidor está temporariamente indisponível.',
      details: 'Ele pode estar em manutenção. Tente novamente em alguns momentos.',
      code: 'SERVICE_UNAVAILABLE',
      actionable: true,
      suggestions: [
        'Aguarde alguns momentos',
        'Tente novamente mais tarde',
        'Verifique o status do servidor',
      ],
    };
  }

  // Erro genérico
  return {
    title: 'Erro na Requisição',
    message: data?.detail || 'Ocorreu um erro ao processar sua requisição.',
    details: `Status: ${status}`,
    code: `HTTP_${status}`,
    actionable: true,
    suggestions: ['Tente novamente', 'Contate o suporte se o problema persistir'],
  };
};

/**
 * Alias para compatibilidade
 */
export const getErrorMessage = (error: any): string => {
  const friendlyError = handleApiError(error);
  return friendlyError.message;
};

/**
 * Obter título do erro
 */
export const getErrorTitle = (error: any): string => {
  const friendlyError = handleApiError(error);
  return friendlyError.title;
};
