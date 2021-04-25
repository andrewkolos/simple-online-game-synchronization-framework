import { cloneDumbObject } from '../../util';
import { ResimulationContext } from './lag-compensator';
import { Timestamped } from './timestamped-buffer';

export const simpleResimulator = <T>(context: ResimulationContext<T>): T => {

  const _context = context as AllPropsAny<ResimulationContext<T>>; // Note: type checking turned off!

  if (typeof _context.oldCurrentState.value === 'number'
    && typeof _context.newPreviousState.value === 'number'
    && typeof _context.oldPreviousState.value === 'number') {
    const value = _context.oldCurrentState.value + _context.newPreviousState.value - _context.oldPreviousState.value;
    return value as unknown as T;
  }

  const newCurrentState: Timestamped<T> = { timestamp: _context.oldCurrentState.timestamp, value: cloneDumbObject(_context.oldCurrentState.value) };
  if (typeof _context.oldCurrentState.value === 'object'
    && typeof _context.newPreviousState.value === 'object'
    && typeof _context.oldCurrentState.value === 'object') {
    Object.keys(_context.oldCurrentState.value).forEach((key: string) => {
      (newCurrentState.value as Record<string, unknown>)[key] = simpleResimulator<T>({
        oldPreviousState: { timestamp: 0, value: _context.oldPreviousState.value[key] },
        newPreviousState: { timestamp: 0, value: _context.newPreviousState.value[key] },
        oldCurrentState: { timestamp: 0, value: _context.oldCurrentState.value[key] },
      });
    });
  }

  return newCurrentState.value as T;
};

type AllPropsAny<T extends object> = {
  [K in keyof T]: any;
};
