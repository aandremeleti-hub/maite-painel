import type { HTMLAttributes } from 'react';
import { Search, X, Plus, Lock, Unlock } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import styles from './styles.module.css';

export interface IClosingToolbarProps extends HTMLAttributes<HTMLDivElement> {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  monthStatus?: 'open' | 'closed';
  onAddLesson: () => void;
  onCloseMonth: () => void;
  onReopenMonth: () => void;
  disabled?: boolean;
}

export function ClosingToolbar({
  searchTerm,
  onSearchChange,
  monthStatus = 'open',
  onAddLesson,
  onCloseMonth,
  onReopenMonth,
  disabled = false,
  className,
  ...restProps
}: IClosingToolbarProps) {
  const isClosed = monthStatus === 'closed';
  const containerClasses = [styles.toolbarContainer, className || ''].filter(Boolean).join(' ');

  return (
    <div className={containerClasses} role="toolbar" aria-label="Ações de fechamento" {...restProps}>
      <div className={styles.searchArea}>
        <Input
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por nome do aluno..."
          aria-label="Buscar aluno na competência"
          leftIcon={<Search size={16} aria-hidden="true" />}
          disabled={disabled}
        />
        {searchTerm && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={() => onSearchChange('')}
            aria-label="Limpar busca de alunos"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className={styles.actionsGroup}>
        {isClosed ? (
          <>
            <span
              title="Competência contábil fechada para lançamentos. Para adicionar ou modificar aulas, utilize a opção de reabertura."
              style={{ display: 'inline-flex', cursor: 'not-allowed' }}
            >
              <Button
                variant="secondary"
                disabled
                aria-disabled="true"
                leftIcon={<Plus size={16} aria-hidden="true" />}
              >
                + Nova Aula
              </Button>
            </span>
            <Button
              variant="outline"
              onClick={onReopenMonth}
              disabled={disabled}
              leftIcon={<Unlock size={16} aria-hidden="true" />}
            >
              Reabrir Mês
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="primary"
              onClick={onAddLesson}
              disabled={disabled}
              leftIcon={<Plus size={16} aria-hidden="true" />}
            >
              + Nova Aula
            </Button>
            <Button
              variant="secondary"
              onClick={onCloseMonth}
              disabled={disabled}
              leftIcon={<Lock size={16} aria-hidden="true" />}
            >
              Fechar Mês
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default ClosingToolbar;
