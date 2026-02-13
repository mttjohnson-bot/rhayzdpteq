/**
 * Skill Tree UI screen.
 *
 * Shows 3 branches (Warrior, Guardian, Scout) as columns.
 * Each node shows current/max rank. Click to allocate a skill point.
 */

import { SkillTree, SkillNode } from '../rpg/SkillTree';
import { LevelSystem } from '../rpg/Leveling';

const BRANCH_COLORS: Record<string, string> = {
  warrior: '#cc4444',
  guardian: '#44aa44',
  scout: '#4488dd',
};

const BRANCH_LABELS: Record<string, string> = {
  warrior: 'Warrior',
  guardian: 'Guardian',
  scout: 'Scout',
};

const BRANCHES = ['warrior', 'guardian', 'scout'] as const;

export class SkillTreeUI {
  private container: HTMLDivElement;
  private branchesEl: HTMLDivElement;
  private pointsEl: HTMLSpanElement;
  private skillTree: SkillTree | null = null;
  private levelSystem: LevelSystem | null = null;
  private onClose: (() => void) | null = null;
  private visible = false;

  // Gamepad / keyboard navigation state
  private selectedBranch = 0;  // 0=warrior, 1=guardian, 2=scout
  private selectedNode = 0;    // index within sorted branch nodes
  private _keyHandler: (e: KeyboardEvent) => void;

  constructor() {
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(10, 10, 20, 0.95)',
      border: '2px solid rgba(170, 68, 255, 0.6)',
      borderRadius: '8px',
      padding: '1.5rem',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#eee',
      minWidth: '520px',
      maxWidth: '620px',
      zIndex: '200',
      display: 'none',
    });

    // Header
    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem',
    });

    const title = document.createElement('h2');
    title.textContent = 'Skill Tree';
    Object.assign(title.style, { margin: '0', fontSize: '1.3rem', color: '#dd88ff' });
    header.appendChild(title);

    this.pointsEl = document.createElement('span');
    Object.assign(this.pointsEl.style, { fontSize: '0.85rem', color: '#ffcc44' });
    header.appendChild(this.pointsEl);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'X';
    Object.assign(closeBtn.style, {
      background: 'transparent', border: '1px solid rgba(255,255,255,0.3)',
      borderRadius: '4px', color: '#aaa', cursor: 'pointer', fontSize: '1rem',
      padding: '0.2rem 0.6rem',
    });
    closeBtn.addEventListener('click', () => this.hide());
    header.appendChild(closeBtn);
    this.container.appendChild(header);

    // Branch columns
    this.branchesEl = document.createElement('div');
    Object.assign(this.branchesEl.style, { display: 'flex', gap: '0.8rem' });
    this.container.appendChild(this.branchesEl);

    // Hint
    const hint = document.createElement('div');
    hint.innerHTML = 'K/Esc: close | Click: allocate point'
      + '<br>Gamepad: D-pad navigate | A: allocate | B: close';
    Object.assign(hint.style, { marginTop: '0.8rem', fontSize: '0.7rem', color: '#777', textAlign: 'center', lineHeight: '1.4' });
    this.container.appendChild(hint);

    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.container);

    this._keyHandler = this.handleKey.bind(this);
  }

  show(skillTree: SkillTree, levelSystem: LevelSystem, onClose: () => void): void {
    this.skillTree = skillTree;
    this.levelSystem = levelSystem;
    this.onClose = onClose;
    this.visible = true;
    this.selectedBranch = 0;
    this.selectedNode = 0;
    this.container.style.display = 'block';
    this.refresh();
    window.addEventListener('keydown', this._keyHandler);
  }

  hide(): void {
    this.visible = false;
    this.container.style.display = 'none';
    window.removeEventListener('keydown', this._keyHandler);
    this.onClose?.();
  }

  isVisible(): boolean {
    return this.visible;
  }

  refresh(): void {
    if (!this.skillTree || !this.levelSystem) return;
    this.pointsEl.textContent = `Skill Points: ${this.levelSystem.skillPoints}`;
    this.renderBranches();
    this.updateSelectionHighlight();
  }

  private handleKey(e: KeyboardEvent): void {
    if (!this.skillTree) return;

    switch (e.key) {
      case 'ArrowLeft': {
        e.preventDefault();
        this.selectedBranch = (this.selectedBranch - 1 + BRANCHES.length) % BRANCHES.length;
        const maxNode = this.getBranchNodeCount(BRANCHES[this.selectedBranch]);
        if (this.selectedNode >= maxNode) this.selectedNode = maxNode - 1;
        this.updateSelectionHighlight();
        break;
      }
      case 'ArrowRight': {
        e.preventDefault();
        this.selectedBranch = (this.selectedBranch + 1) % BRANCHES.length;
        const maxNode = this.getBranchNodeCount(BRANCHES[this.selectedBranch]);
        if (this.selectedNode >= maxNode) this.selectedNode = maxNode - 1;
        this.updateSelectionHighlight();
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const max = this.getBranchNodeCount(BRANCHES[this.selectedBranch]);
        if (max > 0) {
          this.selectedNode = (this.selectedNode - 1 + max) % max;
          this.updateSelectionHighlight();
        }
        break;
      }
      case 'ArrowDown': {
        e.preventDefault();
        const max = this.getBranchNodeCount(BRANCHES[this.selectedBranch]);
        if (max > 0) {
          this.selectedNode = (this.selectedNode + 1) % max;
          this.updateSelectionHighlight();
        }
        break;
      }
      case ' ':
      case 'Enter': {
        e.preventDefault();
        this.activateSelected();
        break;
      }
      case 'e': {
        // B button on gamepad dispatches 'e' — treat as close/back
        this.hide();
        break;
      }
    }
  }

  private getBranchNodeCount(branch: string): number {
    if (!this.skillTree) return 0;
    return this.skillTree.nodes.filter(n => n.branch === branch).length;
  }

  private activateSelected(): void {
    if (!this.skillTree || !this.levelSystem) return;
    const branch = BRANCHES[this.selectedBranch];
    const nodes = this.skillTree.nodes
      .filter(n => n.branch === branch)
      .sort((a, b) => a.tier - b.tier);
    const node = nodes[this.selectedNode];
    if (!node) return;
    if (this.skillTree.canUnlock(node.id) && this.levelSystem.skillPoints > 0) {
      if (this.levelSystem.spendPoint()) {
        this.skillTree.rankUp(node.id);
        this.refresh();
      }
    }
  }

  private updateSelectionHighlight(): void {
    // Each branch is a column child of branchesEl
    const columns = this.branchesEl.children;
    for (let b = 0; b < columns.length; b++) {
      const col = columns[b] as HTMLElement;
      // First child is the branch header, skill nodes start at index 1
      for (let n = 1; n < col.children.length; n++) {
        const nodeEl = col.children[n] as HTMLElement;
        if (b === this.selectedBranch && (n - 1) === this.selectedNode) {
          nodeEl.style.outline = `2px solid ${BRANCH_COLORS[BRANCHES[b]]}`;
          nodeEl.style.outlineOffset = '-2px';
        } else {
          nodeEl.style.outline = 'none';
        }
      }
    }
  }

  private renderBranches(): void {
    if (!this.skillTree) return;
    this.branchesEl.innerHTML = '';

    for (const branch of ['warrior', 'guardian', 'scout'] as const) {
      const col = document.createElement('div');
      Object.assign(col.style, {
        flex: '1', display: 'flex', flexDirection: 'column', gap: '0.4rem',
      });

      // Branch header
      const branchHeader = document.createElement('div');
      branchHeader.textContent = BRANCH_LABELS[branch];
      Object.assign(branchHeader.style, {
        fontSize: '0.85rem', fontWeight: 'bold',
        color: BRANCH_COLORS[branch], textAlign: 'center',
        marginBottom: '0.3rem',
        borderBottom: `1px solid ${BRANCH_COLORS[branch]}40`,
        paddingBottom: '0.3rem',
      });
      col.appendChild(branchHeader);

      // Nodes sorted by tier
      const nodes = this.skillTree.nodes
        .filter(n => n.branch === branch)
        .sort((a, b) => a.tier - b.tier);

      for (const node of nodes) {
        col.appendChild(this.renderNode(node, branch));
      }

      this.branchesEl.appendChild(col);
    }
  }

  private renderNode(node: SkillNode, branch: string): HTMLDivElement {
    const canUnlock = this.skillTree!.canUnlock(node.id) && this.levelSystem!.skillPoints > 0;
    const isMaxed = node.currentRank >= node.maxRank;
    const isAllocated = node.currentRank > 0;

    const el = document.createElement('div');
    Object.assign(el.style, {
      padding: '0.4rem 0.5rem',
      background: isAllocated
        ? `${BRANCH_COLORS[branch]}20`
        : 'rgba(30,30,40,0.6)',
      border: `1px solid ${canUnlock ? BRANCH_COLORS[branch] : isAllocated ? BRANCH_COLORS[branch] + '80' : 'rgba(60,60,80,0.4)'}`,
      borderRadius: '4px',
      cursor: canUnlock ? 'pointer' : 'default',
      opacity: canUnlock || isAllocated ? '1' : '0.5',
    });

    const nameRow = document.createElement('div');
    Object.assign(nameRow.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center' });

    const nameEl = document.createElement('span');
    nameEl.textContent = node.name;
    Object.assign(nameEl.style, {
      fontSize: '0.8rem', fontWeight: 'bold',
      color: isAllocated ? BRANCH_COLORS[branch] : '#aaa',
    });
    nameRow.appendChild(nameEl);

    const rankEl = document.createElement('span');
    rankEl.textContent = `${node.currentRank}/${node.maxRank}`;
    Object.assign(rankEl.style, {
      fontSize: '0.7rem',
      color: isMaxed ? '#ffcc44' : isAllocated ? '#aaa' : '#666',
    });
    nameRow.appendChild(rankEl);
    el.appendChild(nameRow);

    const descEl = document.createElement('div');
    descEl.textContent = node.description;
    Object.assign(descEl.style, { fontSize: '0.65rem', color: '#888', marginTop: '0.15rem' });
    el.appendChild(descEl);

    if (canUnlock) {
      el.addEventListener('click', () => {
        if (this.levelSystem!.spendPoint()) {
          this.skillTree!.rankUp(node.id);
          this.refresh();
        }
      });
      el.addEventListener('mouseenter', () => { el.style.background = `${BRANCH_COLORS[branch]}30`; });
      el.addEventListener('mouseleave', () => {
        el.style.background = isAllocated ? `${BRANCH_COLORS[branch]}20` : 'rgba(30,30,40,0.6)';
      });
    }

    return el;
  }
}
