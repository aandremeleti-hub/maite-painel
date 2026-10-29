import { useContext } from 'react';
import { DateFilterContext } from '../contexts/DateFilterContext';
import type { IDateFilterContext } from '../contexts/DateFilterContext';

export function useDateFilter(): IDateFilterContext {
  const context = useContext(DateFilterContext);

  if (context === undefined) {
    throw new Error('useDateFilter must be used within a DateFilterProvider');
  }

  return context;
}
