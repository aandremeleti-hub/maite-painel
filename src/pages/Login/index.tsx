import { useState, useEffect } from 'react';
import type { FormEvent, HTMLAttributes } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ShieldCheck } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import styles from './styles.module.css';

export interface ILoginPageProps extends HTMLAttributes<HTMLDivElement> {}

interface ILocationState {
  from?: {
    pathname: string;
  };
}

export function LoginPage({ className, ...restProps }: ILoginPageProps) {
  const { user, isLoading, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const from = (location.state as ILocationState)?.from?.pathname || '/alunos';

  useEffect(() => {
    if (user && !isLoading) {
      navigate(from, { replace: true });
    }
  }, [user, isLoading, navigate, from]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      const emptyMsg = 'Por favor, informe seu e-mail e sua senha.';
      setErrorMessage(emptyMsg);
      toast.error(emptyMsg);
      return;
    }

    setIsPending(true);

    try {
      await signIn(trimmedEmail, password);
      toast.success('Autenticação realizada com sucesso!');
      navigate(from, { replace: true });
    } catch (error: unknown) {
      let friendlyError = 'E-mail ou senha incorretos. Por favor, verifique suas credenciais.';

      if (error instanceof Error) {
        const lowerMsg = error.message.toLowerCase();
        if (
          lowerMsg.includes('invalid login credentials') ||
          lowerMsg.includes('invalid_grant') ||
          lowerMsg.includes('invalid credentials')
        ) {
          friendlyError = 'E-mail ou senha incorretos. Por favor, verifique suas credenciais.';
        } else if (lowerMsg.includes('rate limit') || lowerMsg.includes('too many requests')) {
          friendlyError = 'Muitas tentativas sem sucesso. Aguarde alguns instantes antes de tentar novamente.';
        } else if (lowerMsg.includes('network') || lowerMsg.includes('failed to fetch')) {
          friendlyError = 'Erro de comunicação com o servidor. Verifique sua conexão à internet.';
        }
      }

      setErrorMessage(friendlyError);
      toast.error(friendlyError);
    } finally {
      setIsPending(false);
    }
  };

  const containerClasses = [styles.loginContainer, className || '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses} {...restProps}>
      <Toaster richColors position="top-right" />

      <main className={styles.loginCard} aria-labelledby="login-title">
        <header className={styles.brandHeader}>
          <div className={styles.brandEmblem} aria-hidden="true">
            M
          </div>
          <div className={styles.brandTitleGroup}>
            <h1 id="login-title" className={styles.brandTitle}>
              Maite — Atendimento
            </h1>
            <p className={styles.brandSubtitle}>Painel de Gestão & Fechamento</p>
          </div>
        </header>

        <p className={styles.welcomeText}>
          Entre com suas credenciais para acessar o painel de controle e faturamento.
        </p>

        {errorMessage && (
          <div className={styles.alertError} role="alert" aria-live="assertive">
            <AlertCircle className={styles.alertIcon} aria-hidden="true" />
            <p className={styles.alertText}>{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.loginForm} noValidate>
          <Input
            id="login-email"
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="professora@exemplo.com"
            autoComplete="email"
            spellCheck={false}
            required
            disabled={isPending}
            leftIcon={<Mail className={styles.fieldIcon} aria-hidden="true" />}
          />

          <Input
            id="login-password"
            label="Senha"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            spellCheck={false}
            required
            disabled={isPending}
            leftIcon={<Lock className={styles.fieldIcon} aria-hidden="true" />}
            rightIcon={
              <button
                type="button"
                className={styles.togglePasswordButton}
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showPassword ? (
                  <EyeOff className={styles.fieldIcon} aria-hidden="true" />
                ) : (
                  <Eye className={styles.fieldIcon} aria-hidden="true" />
                )}
              </button>
            }
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isPending={isPending}
            disabled={isPending}
            className={styles.submitButton}
          >
            Acessar Painel
          </Button>
        </form>

        <footer className={styles.footerNote}>
          <ShieldCheck className={styles.footerIcon} aria-hidden="true" />
          <span>Ambiente Seguro • STARTMEDIA</span>
        </footer>
      </main>
    </div>
  );
}

export default LoginPage;
