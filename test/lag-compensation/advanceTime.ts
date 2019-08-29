import MockDate from 'mockdate';
export function advanceTime(ms: number) {
  MockDate.set(new Date().getTime() + ms);
}
