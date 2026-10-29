import type { HTMLAttributes } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import styles from './styles.module.css';

export interface INotFoundPageProps extends HTMLAttributes<HTMLDivElement> {}

export function NotFoundPage({ className, ...restProps }: INotFoundPageProps) {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/alunos');
  };

  const containerClasses = [styles.notFoundContainer, className || '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses} {...restProps}>
      <main className={styles.card} aria-labelledby="notfound-title">
        <div className={styles.iconWrapper} aria-hidden="true">
          <Compass className={styles.icon} />
        </div>

        <h1 className={styles.statusNumber}>404</h1>

        <h2 id="notfound-title" className={styles.title}>
          Página não encontrada
        </h2>

        <p className={styles.description}>
          O endereço acessado não existe, foi movido ou está temporariamente indisponível.
        </p>

        <Button
          variant="primary"
          size="md"
          onClick={handleGoHome}
          leftIcon={<ArrowLeft aria-hidden="true" />}
          className={styles.homeButton}
        >
          Voltar ao painel
        </Button>
      </main>
    </div>
  );
}

export default NotFoundPage;
