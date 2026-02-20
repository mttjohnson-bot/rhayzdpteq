import { describe, it, expect, beforeEach } from 'vitest';
import { SkillTree } from '../../src/rpg/SkillTree';
import type { SkillNode } from '../../src/rpg/SkillTree';

describe('SkillTree', () => {
  let tree: SkillTree;

  beforeEach(() => {
    tree = new SkillTree();
  });

  describe('initial state', () => {
    it('has 12 nodes (4 per branch × 3 branches)', () => {
      expect(tree.nodes.length).toBe(12);
    });

    it('all nodes start at rank 0', () => {
      for (const node of tree.nodes) {
        expect(node.currentRank).toBe(0);
      }
    });

    it('total points spent is 0', () => {
      expect(tree.totalPointsSpent).toBe(0);
    });
  });

  describe('node structure', () => {
    it('all nodes have valid branches', () => {
      const validBranches = ['warrior', 'guardian', 'scout'];
      for (const node of tree.nodes) {
        expect(validBranches).toContain(node.branch);
      }
    });

    it('all nodes have valid tiers (1-4)', () => {
      for (const node of tree.nodes) {
        expect(node.tier).toBeGreaterThanOrEqual(1);
        expect(node.tier).toBeLessThanOrEqual(4);
      }
    });

    it('each branch has 4 nodes', () => {
      const branches = { warrior: 0, guardian: 0, scout: 0 };
      for (const node of tree.nodes) {
        branches[node.branch]++;
      }
      expect(branches.warrior).toBe(4);
      expect(branches.guardian).toBe(4);
      expect(branches.scout).toBe(4);
    });

    it('each branch has tiers 1-4', () => {
      for (const branch of ['warrior', 'guardian', 'scout'] as const) {
        const tiers = tree.nodes.filter((n) => n.branch === branch).map((n) => n.tier);
        expect(tiers.sort()).toEqual([1, 2, 3, 4]);
      }
    });

    it('all node IDs are unique', () => {
      const ids = tree.nodes.map((n) => n.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all nodes have non-empty name and description', () => {
      for (const node of tree.nodes) {
        expect(node.name.length).toBeGreaterThan(0);
        expect(node.description.length).toBeGreaterThan(0);
      }
    });

    it('maxRank is between 1 and 3', () => {
      for (const node of tree.nodes) {
        expect(node.maxRank).toBeGreaterThanOrEqual(1);
        expect(node.maxRank).toBeLessThanOrEqual(3);
      }
    });
  });

  describe('prerequisite chains', () => {
    it('tier 1 nodes have no prerequisites', () => {
      const tier1 = tree.nodes.filter((n) => n.tier === 1);
      for (const node of tier1) {
        expect(node.requires).toBeNull();
      }
    });

    it('tier 2+ nodes have valid prerequisites', () => {
      const tier2plus = tree.nodes.filter((n) => n.tier > 1);
      for (const node of tier2plus) {
        expect(node.requires).not.toBeNull();
        const prereq = tree.getNode(node.requires!);
        expect(prereq).toBeDefined();
        expect(prereq!.branch).toBe(node.branch);
        expect(prereq!.tier).toBe(node.tier - 1);
      }
    });

    it('prerequisite chains are linear within each branch', () => {
      for (const branch of ['warrior', 'guardian', 'scout'] as const) {
        const branchNodes = tree.nodes
          .filter((n) => n.branch === branch)
          .sort((a, b) => a.tier - b.tier);

        for (let i = 1; i < branchNodes.length; i++) {
          expect(branchNodes[i].requires).toBe(branchNodes[i - 1].id);
        }
      }
    });
  });

  describe('canUnlock', () => {
    it('can unlock tier 1 nodes without prerequisites', () => {
      expect(tree.canUnlock('w1')).toBe(true);
      expect(tree.canUnlock('g1')).toBe(true);
      expect(tree.canUnlock('s1')).toBe(true);
    });

    it('cannot unlock tier 2 without tier 1', () => {
      expect(tree.canUnlock('w2')).toBe(false);
    });

    it('can unlock tier 2 after ranking tier 1', () => {
      tree.rankUp('w1');
      expect(tree.canUnlock('w2')).toBe(true);
    });

    it('cannot unlock non-existent node', () => {
      expect(tree.canUnlock('nonexistent')).toBe(false);
    });

    it('cannot unlock a fully maxed node', () => {
      tree.rankUp('w1');
      tree.rankUp('w1');
      tree.rankUp('w1');
      expect(tree.canUnlock('w1')).toBe(false);
    });
  });

  describe('rankUp', () => {
    it('increments currentRank', () => {
      expect(tree.rankUp('w1')).toBe(true);
      expect(tree.getNode('w1')!.currentRank).toBe(1);
    });

    it('cannot exceed maxRank', () => {
      const node = tree.getNode('w1')!;
      for (let i = 0; i < node.maxRank; i++) {
        expect(tree.rankUp('w1')).toBe(true);
      }
      expect(tree.rankUp('w1')).toBe(false);
      expect(node.currentRank).toBe(node.maxRank);
    });

    it('returns false for non-existent node', () => {
      expect(tree.rankUp('nonexistent')).toBe(false);
    });

    it('returns false when prerequisite not met', () => {
      expect(tree.rankUp('w2')).toBe(false);
    });
  });

  describe('getModifiers', () => {
    it('returns empty array when nothing is allocated', () => {
      expect(tree.getModifiers()).toEqual([]);
    });

    it('returns correct modifiers for allocated nodes', () => {
      tree.rankUp('w1'); // Power Strike: +3 flatDamage per rank
      const mods = tree.getModifiers();
      expect(mods.length).toBe(1);
      expect(mods[0].flatDamage).toBe(3);
    });

    it('scales modifiers by rank', () => {
      tree.rankUp('w1');
      tree.rankUp('w1');
      tree.rankUp('w1'); // 3 ranks
      const mods = tree.getModifiers();
      expect(mods[0].flatDamage).toBe(9); // 3 * 3
    });

    it('returns modifiers from multiple nodes', () => {
      tree.rankUp('w1');
      tree.rankUp('g1');
      const mods = tree.getModifiers();
      expect(mods.length).toBe(2);
    });
  });

  describe('totalPointsSpent', () => {
    it('counts all allocated ranks', () => {
      tree.rankUp('w1'); // 1
      tree.rankUp('w1'); // 2
      tree.rankUp('g1'); // 3
      expect(tree.totalPointsSpent).toBe(3);
    });
  });

  describe('serialization', () => {
    it('toJSON only includes nodes with ranks', () => {
      tree.rankUp('w1');
      tree.rankUp('w1');
      tree.rankUp('g1');
      const data = tree.toJSON();
      expect(data).toEqual({ w1: 2, g1: 1 });
    });

    it('fromJSON restores ranks', () => {
      tree.fromJSON({ w1: 3, g1: 2, s1: 1 });
      expect(tree.getNode('w1')!.currentRank).toBe(3);
      expect(tree.getNode('g1')!.currentRank).toBe(2);
      expect(tree.getNode('s1')!.currentRank).toBe(1);
      expect(tree.getNode('w2')!.currentRank).toBe(0);
    });

    it('round-trips correctly', () => {
      tree.rankUp('w1');
      tree.rankUp('w1');
      tree.rankUp('w1');
      tree.rankUp('w2');
      const data = tree.toJSON();
      const restored = new SkillTree();
      restored.fromJSON(data);
      expect(restored.getNode('w1')!.currentRank).toBe(3);
      expect(restored.getNode('w2')!.currentRank).toBe(1);
      expect(restored.totalPointsSpent).toBe(4);
    });

    it('fromJSON resets unmentioned nodes to 0', () => {
      tree.rankUp('w1');
      tree.fromJSON({ g1: 1 });
      expect(tree.getNode('w1')!.currentRank).toBe(0);
      expect(tree.getNode('g1')!.currentRank).toBe(1);
    });
  });

  describe('getNode', () => {
    it('returns node by id', () => {
      const node = tree.getNode('w1');
      expect(node).toBeDefined();
      expect(node!.id).toBe('w1');
    });

    it('returns undefined for non-existent id', () => {
      expect(tree.getNode('nonexistent')).toBeUndefined();
    });
  });
});
