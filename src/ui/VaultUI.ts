/**
 * Vault storage UI overlay.
 *
 * Two-column layout: player bag (left) and vault storage (right).
 * Items transfer between bag and vault via confirm action or click.
 * Supports keyboard, gamepad, and touch input.
 */

import { Inventory } from '../rpg/Inventory';
import { VaultStorage } from '../rpg/VaultStorage';
import { Item, rarityColor } from '../rpg/LootTable';
import type { ActionManager } from '../game/ActionManager';
import type { InputDevice } from '../game/ActionManager';

export class VaultUI {
  private container: HTMLDivElement;
  private bagEl: HTMLDivElement;
  private vaultEl: HTMLDivElement;
  private tooltipEl: HTMLDivElement;
  private hintEl: HTMLDivElement;
  private inventory: Inventory | null = null;
  private vault: VaultStorage | null = null;
  private onClose: (() => void) | null = null;
  private visible = false;

  // Navigation state
  private selectedColumn: 'bag' | 'vault' = 'bag';
  private selectedIndex = 0;
  private inputDevice: InputDevice = 'keyboard';

  constructor() {
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(10, 10, 20, 0.95)',
      border: '2px solid rgba(68, 170, 255, 0.6)',
      borderRadius: '8px',
      padding: '1.5rem',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#eee',
      minWidth: '520px',
      maxWidth: '640px',
      maxHeight: '80vh',
      overflowY: 'auto',
      zIndex: '200',
      display: 'none',
    });

    // Header
    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1rem',
    });

    const title = document.createElement('h2');
    title.textContent = 'Storage Vault';
    Object.assign(title.style, { margin: '0', fontSize: '1.3rem', color: '#88bbff' });
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'X';
    Object.assign(closeBtn.style, {
      background: 'transparent',
      border: '1px solid rgba(255,255,255,0.3)',
      borderRadius: '4px',
      color: '#aaa',
      cursor: 'pointer',
      fontSize: '1rem',
      padding: '0.2rem 0.6rem',
    });
    closeBtn.addEventListener('click', () => this.hide());
    header.appendChild(closeBtn);
    this.container.appendChild(header);

    // Two-column body
    const body = document.createElement('div');
    Object.assign(body.style, { display: 'flex', gap: '1rem' });

    // Left: bag
    const leftCol = document.createElement('div');
    Object.assign(leftCol.style, { flex: '1' });

    const bagTitle = document.createElement('div');
    bagTitle.textContent = 'Bag';
    Object.assign(bagTitle.style, { fontSize: '0.9rem', color: '#aa88cc', marginBottom: '0.5rem' });
    leftCol.appendChild(bagTitle);

    this.bagEl = document.createElement('div');
    Object.assign(this.bagEl.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.3rem',
      maxHeight: '300px',
      overflowY: 'auto',
    });
    leftCol.appendChild(this.bagEl);
    body.appendChild(leftCol);

    // Right: vault
    const rightCol = document.createElement('div');
    Object.assign(rightCol.style, { flex: '1' });

    const vaultTitle = document.createElement('div');
    vaultTitle.textContent = 'Vault';
    Object.assign(vaultTitle.style, {
      fontSize: '0.9rem',
      color: '#88bbff',
      marginBottom: '0.5rem',
    });
    rightCol.appendChild(vaultTitle);

    this.vaultEl = document.createElement('div');
    Object.assign(this.vaultEl.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.3rem',
      maxHeight: '300px',
      overflowY: 'auto',
    });
    rightCol.appendChild(this.vaultEl);
    body.appendChild(rightCol);
    this.container.appendChild(body);

    // Tooltip
    this.tooltipEl = document.createElement('div');
    Object.assign(this.tooltipEl.style, {
      marginTop: '0.6rem',
      padding: '0.5rem',
      background: 'rgba(30, 25, 50, 0.8)',
      border: '1px solid rgba(68, 170, 255, 0.3)',
      borderRadius: '4px',
      fontSize: '0.75rem',
      lineHeight: '1.4',
      color: '#ccc',
      display: 'none',
      whiteSpace: 'pre-line',
    });
    this.container.appendChild(this.tooltipEl);

    // Input hints
    this.hintEl = document.createElement('div');
    Object.assign(this.hintEl.style, {
      marginTop: '0.8rem',
      fontSize: '0.7rem',
      color: '#777',
      textAlign: 'center',
      lineHeight: '1.4',
    });
    this.container.appendChild(this.hintEl);
    this.updateHint();

    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.container);
  }

  show(inventory: Inventory, vault: VaultStorage, onClose: () => void): void {
    this.inventory = inventory;
    this.vault = vault;
    this.onClose = onClose;
    this.visible = true;
    this.selectedColumn = 'bag';
    this.selectedIndex = 0;
    this.container.style.display = 'block';
    this.refresh();
  }

  hide(): void {
    this.visible = false;
    this.container.style.display = 'none';
    this.onClose?.();
  }

  isVisible(): boolean {
    return this.visible;
  }

  setInputDevice(device: InputDevice): void {
    this.inputDevice = device;
    this.updateHint();
  }

  refresh(): void {
    if (!this.inventory || !this.vault) return;
    this.renderBag();
    this.renderVault();
    this.updateSelectionHighlight();
  }

  handleActions(actions: ActionManager): void {
    if (!this.inventory || !this.vault) return;

    const bagLen = this.inventory.bag.length;
    const vaultLen = this.vault.items.length;

    if (actions.wasActionPressed('uiUp')) {
      const max = this.selectedColumn === 'bag' ? bagLen : vaultLen;
      if (max > 0) {
        this.selectedIndex = (this.selectedIndex - 1 + max) % max;
        this.updateSelectionHighlight();
      }
    }

    if (actions.wasActionPressed('uiDown')) {
      const max = this.selectedColumn === 'bag' ? bagLen : vaultLen;
      if (max > 0) {
        this.selectedIndex = (this.selectedIndex + 1) % max;
        this.updateSelectionHighlight();
      }
    }

    if (actions.wasActionPressed('uiLeft') || actions.wasActionPressed('uiRight')) {
      this.selectedColumn = this.selectedColumn === 'bag' ? 'vault' : 'bag';
      const max = this.selectedColumn === 'bag' ? bagLen : vaultLen;
      if (this.selectedIndex >= max) this.selectedIndex = Math.max(0, max - 1);
      this.updateSelectionHighlight();
    }

    if (actions.wasActionPressed('uiConfirm')) {
      this.transferSelected();
    }

    if (actions.wasActionPressed('uiCancel')) {
      this.hide();
    }
  }

  /** Transfer the currently selected item to the other column. */
  private transferSelected(): void {
    if (!this.inventory || !this.vault) return;

    if (this.selectedColumn === 'bag') {
      const item = this.inventory.bag[this.selectedIndex];
      if (!item) return;
      if (this.vault.isFull) return;
      this.inventory.removeItem(item.id);
      this.vault.addItem(item);
    } else {
      const item = this.vault.items[this.selectedIndex];
      if (!item) return;
      if (this.inventory.bag.length >= this.inventory.maxBagSize) return;
      this.vault.removeItem(item.id);
      this.inventory.addItem(item);
    }

    // Clamp selection index after transfer
    const max = this.selectedColumn === 'bag' ? this.inventory.bag.length : this.vault.items.length;
    if (this.selectedIndex >= max) {
      this.selectedIndex = Math.max(0, max - 1);
    }
    this.refresh();
  }

  private updateHint(): void {
    switch (this.inputDevice) {
      case 'touch':
        this.hintEl.innerHTML = 'Tap an item to transfer it';
        break;
      case 'gamepad':
        this.hintEl.innerHTML =
          'D-pad: navigate | Left/Right: switch column | A: transfer | B: close';
        break;
      default:
        this.hintEl.innerHTML =
          'Esc: close | Click: transfer | WASD/Arrows: navigate | Space: transfer' +
          '<br>Gamepad: D-pad navigate | A: transfer | B: close';
    }
  }

  private updateSelectionHighlight(): void {
    this.highlightList(this.bagEl, 'bag');
    this.highlightList(this.vaultEl, 'vault');
    this.updateTooltip();
  }

  private highlightList(el: HTMLDivElement, column: 'bag' | 'vault'): void {
    const items = column === 'bag' ? (this.inventory?.bag ?? []) : (this.vault?.items ?? []);
    const children = el.children;
    for (let i = 0; i < children.length; i++) {
      const row = children[i] as HTMLElement;
      if (i < items.length && this.selectedColumn === column && i === this.selectedIndex) {
        row.style.outline = '2px solid #4488ff';
        row.style.outlineOffset = '-2px';
        row.scrollIntoView({ block: 'nearest' });
      } else {
        row.style.outline = 'none';
      }
    }
  }

  private updateTooltip(): void {
    const item: Item | null =
      this.selectedColumn === 'bag'
        ? (this.inventory?.bag[this.selectedIndex] ?? null)
        : (this.vault?.items[this.selectedIndex] ?? null);

    if (item) {
      this.tooltipEl.textContent = this.itemTooltip(item);
      this.tooltipEl.style.display = 'block';
    } else {
      this.tooltipEl.style.display = 'none';
    }
  }

  private renderBag(): void {
    if (!this.inventory) return;
    this.bagEl.innerHTML = '';

    if (this.inventory.bag.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'Bag is empty';
      Object.assign(empty.style, { fontSize: '0.75rem', color: '#555', padding: '0.5rem' });
      this.bagEl.appendChild(empty);
      return;
    }

    for (const item of this.inventory.bag) {
      this.bagEl.appendChild(this.createItemRow(item, 'bag'));
    }

    // Bag count
    const countEl = document.createElement('div');
    countEl.textContent = `${this.inventory.bagSize} / ${this.inventory.maxBagSize}`;
    Object.assign(countEl.style, {
      fontSize: '0.65rem',
      color: '#666',
      textAlign: 'right',
      marginTop: '0.3rem',
    });
    this.bagEl.appendChild(countEl);
  }

  private renderVault(): void {
    if (!this.vault) return;
    this.vaultEl.innerHTML = '';

    if (this.vault.items.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'Vault is empty';
      Object.assign(empty.style, { fontSize: '0.75rem', color: '#555', padding: '0.5rem' });
      this.vaultEl.appendChild(empty);
      return;
    }

    for (const item of this.vault.items) {
      this.vaultEl.appendChild(this.createItemRow(item, 'vault'));
    }

    // Vault count
    const countEl = document.createElement('div');
    countEl.textContent = `${this.vault.size} / ${this.vault.maxSize}`;
    Object.assign(countEl.style, {
      fontSize: '0.65rem',
      color: '#666',
      textAlign: 'right',
      marginTop: '0.3rem',
    });
    this.vaultEl.appendChild(countEl);
  }

  private createItemRow(item: Item, source: 'bag' | 'vault'): HTMLDivElement {
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.3rem 0.5rem',
      background: 'rgba(40,40,55,0.5)',
      border: '1px solid rgba(80,80,100,0.3)',
      borderRadius: '3px',
      cursor: 'pointer',
      fontSize: '0.8rem',
    });
    row.title = this.itemTooltip(item);

    const nameEl = document.createElement('span');
    nameEl.textContent = item.name;
    nameEl.style.color = rarityColor(item.rarity);
    row.appendChild(nameEl);

    const typeTag = document.createElement('span');
    typeTag.textContent = item.type === 'equipment' ? (item.slot ?? '') : 'use';
    Object.assign(typeTag.style, { fontSize: '0.65rem', color: '#777' });
    row.appendChild(typeTag);

    // Click to transfer
    row.addEventListener('click', () => {
      if (!this.inventory || !this.vault) return;
      if (source === 'bag') {
        if (this.vault.isFull) return;
        this.inventory.removeItem(item.id);
        this.vault.addItem(item);
      } else {
        if (this.inventory.bag.length >= this.inventory.maxBagSize) return;
        this.vault.removeItem(item.id);
        this.inventory.addItem(item);
      }
      const max =
        this.selectedColumn === 'bag' ? this.inventory.bag.length : this.vault.items.length;
      if (this.selectedIndex >= max) {
        this.selectedIndex = Math.max(0, max - 1);
      }
      this.refresh();
    });

    row.addEventListener('mouseenter', () => {
      row.style.background = 'rgba(60,50,80,0.5)';
    });
    row.addEventListener('mouseleave', () => {
      row.style.background = 'rgba(40,40,55,0.5)';
    });

    return row;
  }

  private itemTooltip(item: Item): string {
    const lines = [item.name, `[${item.rarity}] Lv.${item.level}`];
    const m = item.modifier;
    if (m.flatDamage) lines.push(`+${m.flatDamage} Attack`);
    if (m.flatDefense) lines.push(`+${m.flatDefense} Defense`);
    if (m.flatMaxHp) lines.push(`+${m.flatMaxHp} Max HP`);
    if (m.strength) lines.push(`+${m.strength} Strength`);
    if (m.vitality) lines.push(`+${m.vitality} Vitality`);
    if (m.agility) lines.push(`+${m.agility} Agility`);
    if (m.luck) lines.push(`+${m.luck} Luck`);
    if (m.attackSpeed) lines.push(`+${(m.attackSpeed * 100).toFixed(0)}% Attack Speed`);
    if (m.moveSpeed) lines.push(`+${(m.moveSpeed * 100).toFixed(0)}% Move Speed`);
    if (m.critChance) lines.push(`+${(m.critChance * 100).toFixed(1)}% Crit Chance`);
    if (m.hpRegen) lines.push(`+${m.hpRegen.toFixed(1)} HP/s`);
    if (item.consumeEffect === 'heal') lines.push(`Heals ${item.consumeValue} HP`);
    if (item.consumeEffect === 'speedBoost')
      lines.push(`+${item.consumeValue}% Speed for ${item.consumeDuration}s`);
    if (item.consumeEffect === 'strengthBoost')
      lines.push(`+${item.consumeValue} ATK for ${item.consumeDuration}s`);
    if (item.consumeEffect === 'manaShield')
      lines.push(`${item.consumeValue} HP shield for ${item.consumeDuration}s`);
    return lines.join('\n');
  }
}
