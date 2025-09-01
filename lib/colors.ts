import { Operator } from '@/lib/types';

export const colors: Record<Operator, string> = {
  mul: 'bg-rose-400',
  div: 'bg-sky-400',
  add: 'bg-amber-400',
  sub: 'bg-violet-400'
};

export const opToChar: Record<Operator, string> = {
  mul: '×',
  div: '÷',
  add: '+',
  sub: '−'
};