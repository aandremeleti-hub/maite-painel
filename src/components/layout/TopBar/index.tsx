import type { ChangeEvent, HTMLAttributes } from 'react';
import { ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useDateFilter } from '../../../hooks/useDateFilter';
import { MONTH_OPTIONS } from '../../../lib/dateUtils';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Select } from '../../ui/Select';
import type { ISelectOption } from '../../ui/Select';
import styles from './styles.module.css';

export interface ITopBarProps extends HTMLAttributes<HTMLElement> {
  onToggleSidebar?: () => void;
}

const YEAR_OPTIONS: ISelectOption[] = [
  { value: '2024', label: '2024' },
  { value: '2025', label: '2025' },
  { value: '2026', label: '2026' },
  { value: '2027', label: '2027' },
  { value: '2028', label: '2028' },
];

export function TopBar({
  onToggleSidebar,
  className,
  ...restProps
}: ITopBarProps) {
  const { profile } = useAuth();
  const {
    selectedYear,
    selectedMonth,
    formattedPeriod,
    setDate,
    goToPreviousMonth,
    goToNextMonth,
  } = useDateFilter();

  const greetingName = profile?.full_name || 'Maite';

  const handleMonthChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value, 10);
    setDate(selectedYear, newMonth);
  };

  const handleYearChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value, 10);
    setDate(newYear, selectedMonth);
  };

  const currentMonthValue = String(selectedMonth).padStart(2, '0');
  const currentYearValue = String(selectedYear);

  const topBarClasses = [styles.topBar, className || '']
    .filter(Boolean)
    .join(' ');

  return (
    <header className={topBarClasses} {...restProps}>
      <div className={styles.leftSection}>
        {onToggleSidebar && (
          <button
            type="button"
            className={styles.menuButton}
            onClick={onToggleSidebar}
            aria-label="Abrir menu lateral"
          >
            <Menu className={styles.menuIcon} aria-hidden="true" />
          </button>
        )}

        <h2 className={styles.greeting}>Olá, {greetingName}!</h2>
      </div>

      <div className={styles.filterControls}>
        <Button
          variant="outline"
          size="sm"
          onClick={goToPreviousMonth}
          aria-label="Mês anterior"
          className={styles.navButton}
        >
          <ChevronLeft className={styles.chevronIcon} aria-hidden="true" />
        </Button>

        <div className={styles.dateSelectors}>
          <div className={styles.selectMonthWrapper}>
            <Select
              aria-label="Selecionar mês"
              value={currentMonthValue}
              onChange={handleMonthChange}
              options={MONTH_OPTIONS}
            />
          </div>

          <div className={styles.selectYearWrapper}>
            <Select
              aria-label="Selecionar ano"
              value={currentYearValue}
              onChange={handleYearChange}
              options={YEAR_OPTIONS}
            />
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={goToNextMonth}
          aria-label="Próximo mês"
          className={styles.navButton}
        >
          <ChevronRight className={styles.chevronIcon} aria-hidden="true" />
        </Button>

        <div className={styles.badgeWrapper}>
          <Badge variant="standard" size="sm" withDot>
            {formattedPeriod}
          </Badge>
        </div>
      </div>
    </header>
  );
}
