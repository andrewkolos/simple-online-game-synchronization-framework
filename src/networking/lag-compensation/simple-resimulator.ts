import { ResimArgs } from './lag-compensator';

export const simpleResimulator = <T>(context: ResimArgs<T>): T => {

  const _context = context as AllPropsAny<ResimArgs<any>>;
  if (typeof _context.oldCurrentState === 'number') {
    const value = _context.oldCurrentState + _context.newPreviousState - _context.oldPreviousState;
    return value as unknown as T;
  }

  const newCurrentState: any = {};
  if (typeof _context.oldCurrentState === 'object') {
    Object.keys(_context.oldCurrentState).forEach((key: string) => {
      newCurrentState[key] = simpleResimulator({
        oldPreviousState: _context.oldPreviousState[key],
        newPreviousState: _context.newPreviousState[key],
        oldCurrentState: _context.oldCurrentState[key],
      });
    });
  }

  return newCurrentState;
};

type AllPropsAny<T extends object> = {
  [K in keyof T]: any;
};
