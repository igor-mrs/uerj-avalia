export interface AuthState {
  isAuthenticated: boolean;
  email: string | null;
  verified: boolean;
}

export const getAuthState = (): AuthState => {
  if (typeof window === 'undefined') {
    return { isAuthenticated: false, email: null, verified: false };
  }

  const storedAuth = localStorage.getItem('uerj-auth');
  if (!storedAuth) {
    return { isAuthenticated: false, email: null, verified: false };
  }

  try {
    const authData = JSON.parse(storedAuth);
    const isValid = authData.email && authData.verified && authData.email.endsWith('@graduacao.uerj.br');
    
    // Verificar se a autenticação não expirou (24 horas)
    const timestamp = authData.timestamp || 0;
    const isNotExpired = Date.now() - timestamp < 24 * 60 * 60 * 1000;

    if (isValid && isNotExpired) {
      return {
        isAuthenticated: true,
        email: authData.email,
        verified: true
      };
    }
  } catch (error) {
    console.error('Erro ao verificar autenticação:', error);
  }

  // Limpar dados inválidos
  localStorage.removeItem('uerj-auth');
  return { isAuthenticated: false, email: null, verified: false };
};

export const setAuthState = (email: string): void => {
  if (!email.endsWith('@graduacao.uerj.br')) {
    throw new Error('Email deve ser institucional @graduacao.uerj.br');
  }

  localStorage.setItem('uerj-auth', JSON.stringify({
    email,
    verified: true,
    timestamp: Date.now()
  }));
};

export const clearAuthState = (): void => {
  localStorage.removeItem('uerj-auth');
};

export const isEmailValid = (email: string): boolean => {
  return email.endsWith('@graduacao.uerj.br');
};
