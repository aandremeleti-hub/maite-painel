import { createContext, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getMonthYearLabel } from '../lib/dateUtils';

export interface IDateFilterContext {
  selectedYear: number;
  selectedMonth: number;
  formattedPeriod: string;
  setDate: (year: number, month: number) => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
}

export const DateFilterContext = createContext<IDateFilterContext | undefined>(undefined);

export interface IDateFilterProviderProps {
  children: ReactNode;
}

const NOW = new Date();
const FALLBACK_YEAR = NOW.getFullYear() || 2026;
const FALLBACK_MONTH = NOW.getMonth() + 1 || 10;

export function DateFilterProvider({ children }: IDateFilterProviderProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawYear = searchParams.get('ano');
  const rawMonth = searchParams.get('mes');

  const parsedYear = rawYear ? parseInt(rawYear, 10) : NaN;
  const parsedMonth = rawMonth ? parseInt(rawMonth, 10) : NaN;

  const selectedYear =
    !isNaN(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100
      ? parsedYear
      : FALLBACK_YEAR;

  const selectedMonth =
    !isNaN(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
      ? parsedMonth
      : FALLBACK_MONTH;

  const setDate = useCallback(
    (year: number, month: number) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('ano', String(year));
          next.set('mes', String(month).padStart(2, '0'));
          return next;
        },
        { replace: false }
      );
    },
    [setSearchParams]
  );

  const goToPreviousMonth = useCallback(() => {
    if (selectedMonth === 1) {
      setDate(selectedYear - 1, 12);
    } else {
      setDate(selectedYear, selectedMonth - 1);
    }
  }, [selectedYear, selectedMonth, setDate]);

  const goToNextMonth = useCallback(() => {
    if (selectedMonth === 12) {
      setDate(selectedYear + 1, 1);
    } else {
      setDate(selectedYear, selectedMonth + 1);
    }
  }, [selectedYear, selectedMonth, setDate]);

  const formattedPeriod = useMemo(() => {
    return getMonthYearLabel(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  const contextValue = useMemo<IDateFilterContext>(
    () => ({
      selectedYear,
      selectedMonth,
      formattedPeriod,
      setDate,
      goToPreviousMonth,
      goToNextMonth,
    }),
    [
      selectedYear,
      selectedMonth,
      formattedPeriod,
      setDate,
      goToPreviousMonth,
      goToNextMonth,
    ]
  );

  return (
    <DateFilterContext.Provider value={contextValue}>
      {children}
    </DateFilterContext.Provider>
  );
}
