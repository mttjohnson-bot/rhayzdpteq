import { describe, it, expect } from 'vitest';
import { TileType, ObstacleType } from '../../src/dungeon/types';

describe('TileType', () => {
  it('has expected members', () => {
    expect(TileType.Empty).toBeDefined();
    expect(TileType.Floor).toBeDefined();
    expect(TileType.Wall).toBeDefined();
    expect(TileType.Door).toBeDefined();
    expect(TileType.Exit).toBeDefined();
    expect(TileType.Entrance).toBeDefined();
  });

  it('has exactly 6 members', () => {
    const numericValues = Object.values(TileType).filter((v) => typeof v === 'number');
    expect(numericValues.length).toBe(6);
  });

  it('has no duplicate numeric values', () => {
    const numericValues = Object.values(TileType).filter((v) => typeof v === 'number');
    expect(new Set(numericValues).size).toBe(numericValues.length);
  });

  it('Empty is 0', () => {
    expect(TileType.Empty).toBe(0);
  });

  it('all values are non-negative integers', () => {
    const numericValues = Object.values(TileType).filter((v) => typeof v === 'number') as number[];
    for (const v of numericValues) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});

describe('ObstacleType', () => {
  it('has expected members', () => {
    expect(ObstacleType.None).toBeDefined();
    expect(ObstacleType.Furniture).toBeDefined();
    expect(ObstacleType.Water).toBeDefined();
    expect(ObstacleType.Mud).toBeDefined();
    expect(ObstacleType.Fire).toBeDefined();
    expect(ObstacleType.Trap).toBeDefined();
  });

  it('has exactly 6 members', () => {
    const numericValues = Object.values(ObstacleType).filter((v) => typeof v === 'number');
    expect(numericValues.length).toBe(6);
  });

  it('has no duplicate numeric values', () => {
    const numericValues = Object.values(ObstacleType).filter((v) => typeof v === 'number');
    expect(new Set(numericValues).size).toBe(numericValues.length);
  });

  it('None is 0', () => {
    expect(ObstacleType.None).toBe(0);
  });

  it('all values are non-negative integers', () => {
    const numericValues = Object.values(ObstacleType).filter(
      (v) => typeof v === 'number',
    ) as number[];
    for (const v of numericValues) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});
