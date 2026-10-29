import { useRef, type FC, type KeyboardEvent } from 'react';
import styles from './styles.module.css';

export type StudentStatusFilterType = 'all' | 'active' | 'inactive';

export interface IStudentStatusFilterProps {
  currentStatus: StudentStatusFilterType;
  counts: {
    all: number;
    active: number;
    inactive: number;
  };
  onSelectStatus: (status: StudentStatusFilterType) => void;
}

interface ITabOption {
  id: StudentStatusFilterType;
  label: string;
}

const TABS: ITabOption[] = [
  { id: 'active', label: 'Ativos' },
  { id: 'inactive', label: 'Inativos' },
  { id: 'all', label: 'Todos' },
];

export const StudentStatusFilter: FC<IStudentStatusFilterProps> = ({
  currentStatus,
  counts,
  onSelectStatus,
}) => {
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      nextIndex = (index + 1) % TABS.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      nextIndex = (index - 1 + TABS.length) % TABS.length;
    } else if (event.key === 'Home') {
      event.preventDefault();
      nextIndex = 0;
    } else if (event.key === 'End') {
      event.preventDefault();
      nextIndex = TABS.length - 1;
    }

    if (nextIndex !== null) {
      const nextTab = TABS[nextIndex];
      if (nextTab) {
        onSelectStatus(nextTab.id);
        tabsRef.current[nextIndex]?.focus();
      }
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Filtro por status de alunos"
      className={styles.container}
    >
      {TABS.map((tab, idx) => {
        const isSelected = currentStatus === tab.id;
        const count = counts[tab.id] ?? 0;

        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabsRef.current[idx] = el;
            }}
            role="tab"
            type="button"
            id={`tab-${tab.id}`}
            aria-selected={isSelected}
            aria-controls="students-list"
            tabIndex={isSelected ? 0 : -1}
            className={`${styles.tab} ${isSelected ? styles.active : ''}`}
            onClick={() => onSelectStatus(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
          >
            <span>{tab.label}</span>
            <span className={styles.count} aria-label={`${count} alunos`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
