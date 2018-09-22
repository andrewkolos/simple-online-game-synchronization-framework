import { Vector3 } from '../src/main';

test('vector (1,2,3) + scalar 1 = vector (2,3,4)', () => {
  const vector1 = new Vector3(1,2,3)
  const target = new Vector3(2,3,4)
  const sum = vector1.add(1)
  expect(sum.equals(target)).toBeTruthy()
})