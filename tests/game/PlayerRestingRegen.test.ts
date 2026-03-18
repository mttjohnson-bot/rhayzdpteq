// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Three.js before importing Player
vi.mock('three', () => {
  function makeGeometry() {
    return { dispose: vi.fn(), clone: vi.fn().mockReturnThis() };
  }
  function makeMaterial() {
    return { color: { setHex: vi.fn() }, clone: vi.fn().mockReturnThis(), visible: true };
  }

  // Each Mesh gets its own position/rotation so Player instances don't share state
  class MockMesh {
    position = { x: 0, y: 0, z: 0 };
    rotation = { x: 0, y: 0 };
    visible = true;
    castShadow = false;
    geometry: ReturnType<typeof makeGeometry>;
    material: ReturnType<typeof makeMaterial>;
    add = vi.fn();
    remove = vi.fn();
    constructor(geo?: unknown, mat?: unknown) {
      this.geometry = (geo as ReturnType<typeof makeGeometry>) ?? makeGeometry();
      this.material = (mat as ReturnType<typeof makeMaterial>) ?? makeMaterial();
    }
  }

  return {
    Vector3: class {
      x = 0;
      y = 0;
      z = 0;
      set = vi.fn();
    },
    BoxGeometry: class {
      dispose = vi.fn();
      clone = vi.fn().mockReturnThis();
    },
    BufferGeometry: class {
      dispose = vi.fn();
      clone = vi.fn().mockReturnThis();
    },
    CylinderGeometry: class {
      dispose = vi.fn();
      clone = vi.fn().mockReturnThis();
    },
    TorusGeometry: class {
      dispose = vi.fn();
      clone = vi.fn().mockReturnThis();
    },
    MeshLambertMaterial: class {
      color = { setHex: vi.fn() };
      clone = vi.fn().mockReturnThis();
      visible = true;
    },
    MeshBasicMaterial: class {
      color = { setHex: vi.fn() };
      clone = vi.fn().mockReturnThis();
      visible = true;
    },
    Mesh: MockMesh,
    Box3: class {
      setFromObject = vi.fn().mockReturnThis();
      getSize = vi.fn();
      getCenter = vi.fn();
    },
    Group: class {
      position = { set: vi.fn() };
      scale = { setScalar: vi.fn() };
      add = vi.fn();
    },
  };
});

// Mock the rendering module that uses Three.js internals
vi.mock('../../src/rendering/OcclusionOutline', () => ({
  createOcclusionSilhouette: vi.fn(() => ({
    visible: true,
  })),
  applyOcclusionMaterial: vi.fn(),
  enableStencilWrite: vi.fn(),
  enableStencilWriteOnGroup: vi.fn(),
}));

vi.mock('../../src/rendering/CharacterModelLoader', () => ({
  loadCharacterModel: vi.fn(),
  loadCharacterSilhouette: vi.fn(),
}));

import { Player } from '../../src/game/Player';
import {
  RESTING_IDLE_TIME,
  RESTING_COMBAT_COOLDOWN,
  RESTING_REGEN_RATE,
  DEEP_REST_IDLE_TIME,
  DEEP_REST_COMBAT_COOLDOWN,
  DEEP_REST_REGEN_RATE,
  PLAYER_MAX_HP,
} from '../../src/utils/constants';
import { events } from '../../src/utils/EventBus';

/** Create a mock ActionManager with no input */
function createMockActions(movement = { x: 0, z: 0 }) {
  return {
    getMovement: vi.fn(() => movement),
    wasActionPressed: vi.fn(() => false),
    isActionHeld: vi.fn(() => false),
    getAxis: vi.fn(() => 0),
    update: vi.fn(),
    endFrame: vi.fn(),
    getActiveDevice: vi.fn(() => 'keyboard'),
    addProvider: vi.fn(),
    removeProvider: vi.fn(),
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

describe('Player Resting Health Regeneration', () => {
  let player: Player;

  beforeEach(() => {
    events.clear();
    player = new Player();
    // Set HP below max so regen can apply
    player.hp = 50;
  });

  it('should have correct resting constants', () => {
    expect(RESTING_IDLE_TIME).toBe(15);
    expect(RESTING_COMBAT_COOLDOWN).toBe(15);
    expect(RESTING_REGEN_RATE).toBe(4);
  });

  it('should not be resting initially', () => {
    expect(player.isResting).toBe(false);
  });

  it('should enter resting state after being idle and out of combat for 15 seconds', () => {
    const actions = createMockActions();
    // Simulate 15 seconds of idle time in 1-second ticks
    for (let i = 0; i < 15; i++) {
      player.update(1, actions);
    }
    expect(player.isResting).toBe(true);
  });

  it('should not be resting if moving within the last 15 seconds', () => {
    const idleActions = createMockActions();
    // Idle for 14 seconds
    for (let i = 0; i < 14; i++) {
      player.update(1, idleActions);
    }
    // Move for 1 second
    const movingActions = createMockActions({ x: 1, z: 0 });
    player.update(1, movingActions);
    // Idle for 14 more seconds (not enough since movement reset the idle timer)
    for (let i = 0; i < 14; i++) {
      player.update(1, idleActions);
    }
    expect(player.isResting).toBe(false);
    // One more second to reach 15s idle
    player.update(1, idleActions);
    expect(player.isResting).toBe(true);
  });

  it('should not be resting if took damage within the last 15 seconds', () => {
    const actions = createMockActions();
    // Idle for 20 seconds — would be resting
    for (let i = 0; i < 20; i++) {
      player.update(1, actions);
    }
    expect(player.isResting).toBe(true);
    // Take damage — should exit resting
    player.takeDamage(5);
    player.update(0.016, actions);
    expect(player.isResting).toBe(false);
  });

  it('should regenerate health at ~4 HP/second while resting', () => {
    const actions = createMockActions();
    const startHp = player.hp;
    // Enter resting (15 seconds idle + out of combat)
    for (let i = 0; i < 15; i++) {
      player.update(1, actions);
    }
    expect(player.isResting).toBe(true);
    const hpAfterResting = player.hp;
    // Now simulate 5 more seconds of resting
    for (let i = 0; i < 5; i++) {
      player.update(1, actions);
    }
    // Should have gained ~20 HP over 5 seconds (4 HP/s)
    // Also gained ~4 HP during the 15th second tick (first tick of resting)
    const hpGainedDuringRest = player.hp - startHp;
    // Total resting time is about 6 seconds (15th tick + 5 more), so expect ~24 HP
    // Allow some tolerance due to accumulator rounding
    expect(hpGainedDuringRest).toBeGreaterThanOrEqual(20);
    expect(hpGainedDuringRest).toBeLessThanOrEqual(28);
  });

  it('should not regenerate above max HP', () => {
    const actions = createMockActions();
    player.hp = PLAYER_MAX_HP - 2;
    // Enter resting
    for (let i = 0; i < 16; i++) {
      player.update(1, actions);
    }
    expect(player.hp).toBe(PLAYER_MAX_HP);
  });

  it('should emit playerRestingChanged event when resting state changes', () => {
    const actions = createMockActions();
    const restingChanges: boolean[] = [];
    events.on('playerRestingChanged', (resting: unknown) => {
      restingChanges.push(resting as boolean);
    });

    // Enter resting
    for (let i = 0; i < 15; i++) {
      player.update(1, actions);
    }
    expect(restingChanges).toContain(true);

    // Take damage to exit resting
    player.takeDamage(5);
    player.update(0.016, actions);
    expect(restingChanges).toContain(false);
  });

  it('should reset resting state on resetHealth', () => {
    const actions = createMockActions();
    // Enter resting
    for (let i = 0; i < 15; i++) {
      player.update(1, actions);
    }
    expect(player.isResting).toBe(true);
    player.resetHealth();
    expect(player.isResting).toBe(false);
  });

  it('should not activate resting when player is dead', () => {
    const actions = createMockActions();
    player.hp = 0;
    player.alive = false;
    for (let i = 0; i < 20; i++) {
      player.update(1, actions);
    }
    // The update exits early when not alive, so resting never activates
    expect(player.isResting).toBe(false);
  });

  describe('Deep Rest (Tier 2)', () => {
    it('should have correct deep rest constants', () => {
      expect(DEEP_REST_IDLE_TIME).toBe(30);
      expect(DEEP_REST_COMBAT_COOLDOWN).toBe(30);
      expect(DEEP_REST_REGEN_RATE).toBe(4);
    });

    it('should not be deep resting initially', () => {
      expect(player.isDeepResting).toBe(false);
    });

    it('should enter deep rest after 30 seconds idle and out of combat', () => {
      const actions = createMockActions();
      for (let i = 0; i < 30; i++) {
        player.update(1, actions);
      }
      expect(player.isResting).toBe(true);
      expect(player.isDeepResting).toBe(true);
    });

    it('should be resting but not deep resting between 15 and 30 seconds', () => {
      const actions = createMockActions();
      for (let i = 0; i < 20; i++) {
        player.update(1, actions);
      }
      expect(player.isResting).toBe(true);
      expect(player.isDeepResting).toBe(false);
    });

    it('should regenerate at combined 8 HP/second during deep rest', () => {
      const actions = createMockActions();
      // Set HP low enough that resting regen won't cap before deep rest activates
      player.maxHp = 200;
      player.hp = 10;
      // Enter deep rest (30 seconds) — resting regen applies from second 15
      for (let i = 0; i < 30; i++) {
        player.update(1, actions);
      }
      expect(player.isDeepResting).toBe(true);
      const hpBeforeDeepRest = player.hp;
      // Simulate 5 more seconds of deep rest
      for (let i = 0; i < 5; i++) {
        player.update(1, actions);
      }
      const hpGained = player.hp - hpBeforeDeepRest;
      // Should gain ~8 HP/s × 5s = ~40 HP (combined resting + deep rest)
      expect(hpGained).toBeGreaterThanOrEqual(35);
      expect(hpGained).toBeLessThanOrEqual(45);
    });

    it('should exit deep rest when movement occurs', () => {
      const actions = createMockActions();
      for (let i = 0; i < 30; i++) {
        player.update(1, actions);
      }
      expect(player.isDeepResting).toBe(true);
      // Move
      const movingActions = createMockActions({ x: 1, z: 0 });
      player.update(1, movingActions);
      expect(player.isDeepResting).toBe(false);
      expect(player.isResting).toBe(false);
    });

    it('should exit deep rest when taking damage', () => {
      const actions = createMockActions();
      for (let i = 0; i < 30; i++) {
        player.update(1, actions);
      }
      expect(player.isDeepResting).toBe(true);
      player.takeDamage(5);
      player.update(0.016, actions);
      expect(player.isDeepResting).toBe(false);
    });

    it('should emit playerDeepRestingChanged event', () => {
      const actions = createMockActions();
      const deepRestChanges: boolean[] = [];
      events.on('playerDeepRestingChanged', (resting: unknown) => {
        deepRestChanges.push(resting as boolean);
      });
      for (let i = 0; i < 30; i++) {
        player.update(1, actions);
      }
      expect(deepRestChanges).toContain(true);
      // Take damage to exit
      player.takeDamage(5);
      player.update(0.016, actions);
      expect(deepRestChanges).toContain(false);
    });

    it('should reset deep rest state on resetHealth', () => {
      const actions = createMockActions();
      for (let i = 0; i < 30; i++) {
        player.update(1, actions);
      }
      expect(player.isDeepResting).toBe(true);
      player.resetHealth();
      expect(player.isDeepResting).toBe(false);
    });

    it('should not exceed max HP during deep rest', () => {
      const actions = createMockActions();
      player.hp = PLAYER_MAX_HP - 2;
      for (let i = 0; i < 35; i++) {
        player.update(1, actions);
      }
      expect(player.hp).toBe(PLAYER_MAX_HP);
    });
  });
});
