import { MovingAverage } from '../../src/util/moving-average';

describe(nameof(MovingAverage), () => {
  it('Correctly adds values when below capacity.', () => {
    const avg = new MovingAverage(Number.MAX_SAFE_INTEGER);

    avg.add(1, 2, 3);

    expect(avg.value).toEqual(2);
  });

  describe('Correctly adds values when at capacity.', () => {
    it('Correclty adds values with a capacity of 1.', () => {
      const avg = new MovingAverage(1);
      expect(avg.add(1).value).toEqual(1);
      expect(avg.add(5).value).toEqual(5);
    });

    it ('Correctly adds values with a capcity > 1.', () => {
      const avg = new MovingAverage(3);
      expect(avg.add(1, 2, 3).value).toEqual(2);

      expect(avg.add(4, 5, 6).value).toEqual(5);
    });
  });
});
