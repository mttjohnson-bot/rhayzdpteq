/**
 * Inventory screen UI.
 *
 * Shows equipped items on the left, bag items on the right.
 * Click a bag item to equip it, right-click consumables to use them.
 * Middle-click or shift-click to drop items (with confirmation).
 */

import { Inventory } from '../rpg/Inventory';
import { Item, rarityColor, ItemSlot } from '../rpg/LootTable';
import { ComputedStats } from '../rpg/Stats';
import { events } from '../utils/EventBus';
import { ConfirmDialog } from './ConfirmDialog';
import { ItemActionDialog, ActionButtonConfig } from './ItemActionDialog';
import type { ActionManager } from '../game/ActionManager';
import type { InputDevice } from '../game/ActionManager';

export class InventoryUI {
  private container: HTMLDivElement;
  private equipmentEl: HTMLDivElement;
  private bagEl: HTMLDivElement;
  private statsEl: HTMLDivElement;
  private tooltipEl: HTMLDivElement;
  private inventory: Inventory | null = null;
  private computedStats: ComputedStats | null = null;
  private onClose: (() => void) | null = null;
  private visible = false;

  // Gamepad / keyboard navigation state
  private selectedColumn: 'equipment' | 'bag' = 'bag';
  private selectedIndex = 0;
  private confirmDialog: ConfirmDialog;
  private itemActionDialog: ItemActionDialog;

  // Active input device — determines whether tap shows action dialog
  private inputDevice: InputDevice = 'keyboard';
  private hintEl!: HTMLDivElement;

  constructor() {
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'absolute',
      top: '60px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(10, 10, 20, 0.95)',
      border: '2px solid rgba(170, 68, 255, 0.6)',
      borderRadius: '8px',
      padding: '1.5rem',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#eee',
      minWidth: '500px',
      maxWidth: '600px',
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
    title.textContent = 'Inventory';
    Object.assign(title.style, { margin: '0', fontSize: '1.3rem', color: '#dd88ff' });
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

    // Layout: two columns
    const body = document.createElement('div');
    Object.assign(body.style, { display: 'flex', gap: '1rem' });

    // Left: equipment + stats
    const leftCol = document.createElement('div');
    Object.assign(leftCol.style, { flex: '1' });

    const eqTitle = document.createElement('div');
    eqTitle.textContent = 'Equipment';
    Object.assign(eqTitle.style, { fontSize: '0.9rem', color: '#aa88cc', marginBottom: '0.5rem' });
    leftCol.appendChild(eqTitle);

    this.equipmentEl = document.createElement('div');
    Object.assign(this.equipmentEl.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.4rem',
      marginBottom: '1rem',
    });
    leftCol.appendChild(this.equipmentEl);

    const statTitle = document.createElement('div');
    statTitle.textContent = 'Stats';
    Object.assign(statTitle.style, {
      fontSize: '0.9rem',
      color: '#aa88cc',
      marginBottom: '0.5rem',
    });
    leftCol.appendChild(statTitle);

    this.statsEl = document.createElement('div');
    Object.assign(this.statsEl.style, { fontSize: '0.75rem', lineHeight: '1.5', color: '#ccc' });
    leftCol.appendChild(this.statsEl);

    body.appendChild(leftCol);

    // Right: bag
    const rightCol = document.createElement('div');
    Object.assign(rightCol.style, { flex: '1' });

    const bagTitle = document.createElement('div');
    bagTitle.textContent = 'Bag';
    Object.assign(bagTitle.style, { fontSize: '0.9rem', color: '#aa88cc', marginBottom: '0.5rem' });
    rightCol.appendChild(bagTitle);

    this.bagEl = document.createElement('div');
    Object.assign(this.bagEl.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.3rem',
      maxHeight: '300px',
      overflowY: 'auto',
    });
    rightCol.appendChild(this.bagEl);

    body.appendChild(rightCol);
    this.container.appendChild(body);

    // Item tooltip panel (shown when navigating with gamepad/keyboard)
    this.tooltipEl = document.createElement('div');
    Object.assign(this.tooltipEl.style, {
      marginTop: '0.6rem',
      padding: '0.5rem',
      background: 'rgba(30, 25, 50, 0.8)',
      border: '1px solid rgba(170, 68, 255, 0.3)',
      borderRadius: '4px',
      fontSize: '0.75rem',
      lineHeight: '1.4',
      color: '#ccc',
      display: 'none',
      whiteSpace: 'pre-line',
      minHeight: '3rem',
      overflowY: 'hidden',
    });
    this.container.appendChild(this.tooltipEl);

    // Input hint line — updated when the active device changes
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

    this.confirmDialog = new ConfirmDialog();
    this.itemActionDialog = new ItemActionDialog();
  }

  show(inventory: Inventory, stats: ComputedStats, onClose: () => void): void {
    this.inventory = inventory;
    this.computedStats = stats;
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

  private updateHint(): void {
    switch (this.inputDevice) {
      case 'touch':
        this.hintEl.innerHTML = 'Tap any item to equip, use, or drop it';
        break;
      case 'gamepad':
        this.hintEl.innerHTML = 'D-pad: navigate | A: equip/use | R1: drop | B: close';
        break;
      default:
        this.hintEl.innerHTML =
          'I/Esc: close | Click: equip | Right-click: use | X: drop | Shift+click: drop' +
          '<br>Gamepad: D-pad navigate | A: equip/use | R1: drop | B: close';
    }
  }

  refresh(): void {
    if (!this.inventory) return;
    this.renderEquipment();
    this.renderBag();
    this.renderStats();
    this.updateSelectionHighlight();
  }

  /** Called each frame by Game.ts while the inventory is open. */
  handleActions(actions: ActionManager): void {
    if (!this.inventory) return;

    // Item action dialog takes precedence (touch) — it has its own buttons
    if (this.itemActionDialog.isVisible()) return;

    // If confirm dialog is open, delegate to it
    if (this.confirmDialog.isVisible()) {
      this.confirmDialog.handleActions(actions);
      return;
    }

    const equipSlots: ItemSlot[] = ['weapon', 'armor', 'ring'];
    const bagLen = this.inventory.bag.length;

    if (actions.wasActionPressed('uiUp')) {
      const max = this.selectedColumn === 'equipment' ? equipSlots.length : bagLen;
      if (max > 0) {
        this.selectedIndex = (this.selectedIndex - 1 + max) % max;
        this.updateSelectionHighlight();
      }
    }

    if (actions.wasActionPressed('uiDown')) {
      const max = this.selectedColumn === 'equipment' ? equipSlots.length : bagLen;
      if (max > 0) {
        this.selectedIndex = (this.selectedIndex + 1) % max;
        this.updateSelectionHighlight();
      }
    }

    if (actions.wasActionPressed('uiLeft') || actions.wasActionPressed('uiRight')) {
      this.selectedColumn = this.selectedColumn === 'equipment' ? 'bag' : 'equipment';
      const max = this.selectedColumn === 'equipment' ? equipSlots.length : bagLen;
      if (this.selectedIndex >= max) this.selectedIndex = Math.max(0, max - 1);
      this.updateSelectionHighlight();
    }

    if (actions.wasActionPressed('uiConfirm')) {
      this.activateSelected();
    }

    if (actions.wasActionPressed('dropItem')) {
      this.dropSelected();
    }

    if (actions.wasActionPressed('uiCancel')) {
      this.hide();
    }
  }

  private activateSelected(): void {
    if (!this.inventory) return;

    if (this.selectedColumn === 'equipment') {
      const slots: ItemSlot[] = ['weapon', 'armor', 'ring'];
      const slot = slots[this.selectedIndex];
      if (slot && this.inventory.equipped[slot]) {
        this.inventory.unequip(slot);
        this.refresh();
      }
    } else {
      const item = this.inventory.bag[this.selectedIndex];
      if (!item) return;
      if (item.type === 'consumable') {
        const consumed = this.inventory.useConsumable(item.id);
        if (consumed) {
          events.emit('useConsumable', consumed);
          // Clamp index if bag shrank
          if (this.selectedIndex >= this.inventory.bag.length) {
            this.selectedIndex = Math.max(0, this.inventory.bag.length - 1);
          }
          this.refresh();
        }
      } else if (item.type === 'equipment') {
        this.inventory.equip(item.id);
        // Clamp index if bag shrank
        if (this.selectedIndex >= this.inventory.bag.length) {
          this.selectedIndex = Math.max(0, this.inventory.bag.length - 1);
        }
        this.refresh();
      }
    }
  }

  private dropSelected(): void {
    if (!this.inventory) return;

    let item: Item | null = null;
    if (this.selectedColumn === 'bag') {
      item = this.inventory.bag[this.selectedIndex] ?? null;
    }
    if (!item) return;

    this.promptDrop(item);
  }

  private async promptDrop(item: Item): Promise<void> {
    if (!this.inventory) return;

    const confirmed = await this.confirmDialog.show(`Drop "${item.name}"? It will be destroyed.`);

    if (confirmed) {
      this.inventory.dropItem(item.id);
      if (this.selectedIndex >= this.inventory.bag.length) {
        this.selectedIndex = Math.max(0, this.inventory.bag.length - 1);
      }
      this.refresh();
    }
  }

  private updateSelectionHighlight(): void {
    // Highlight equipment rows
    const eqRows = this.equipmentEl.children;
    for (let i = 0; i < eqRows.length; i++) {
      const row = eqRows[i] as HTMLElement;
      if (this.selectedColumn === 'equipment' && i === this.selectedIndex) {
        row.style.outline = '2px solid #aa44ff';
        row.style.outlineOffset = '-2px';
      } else {
        row.style.outline = 'none';
      }
    }

    // Highlight bag rows (skip the count element at the end)
    const bagChildren = this.bagEl.children;
    const bagLen = this.inventory?.bag.length ?? 0;
    for (let i = 0; i < bagChildren.length; i++) {
      const row = bagChildren[i] as HTMLElement;
      if (i < bagLen && this.selectedColumn === 'bag' && i === this.selectedIndex) {
        row.style.outline = '2px solid #aa44ff';
        row.style.outlineOffset = '-2px';
        row.scrollIntoView({ block: 'nearest' });
      } else {
        row.style.outline = 'none';
      }
    }

    // Update item tooltip panel
    this.updateTooltipPanel();
  }

  private updateTooltipPanel(): void {
    if (!this.inventory) {
      this.tooltipEl.style.display = 'none';
      return;
    }

    let item: Item | null;
    if (this.selectedColumn === 'equipment') {
      const slots: ItemSlot[] = ['weapon', 'armor', 'ring'];
      item = this.inventory.equipped[slots[this.selectedIndex]] ?? null;
    } else {
      item = this.inventory.bag[this.selectedIndex] ?? null;
    }

    if (item) {
      this.tooltipEl.textContent = this.itemTooltip(item);
      this.tooltipEl.style.display = 'block';
    } else {
      this.tooltipEl.style.display = 'none';
    }
  }

  private renderEquipment(): void {
    if (!this.inventory) return;
    this.equipmentEl.innerHTML = '';

    const slots: ItemSlot[] = ['weapon', 'armor', 'ring'];
    for (let slotIdx = 0; slotIdx < slots.length; slotIdx++) {
      const slot = slots[slotIdx];
      const item = this.inventory.equipped[slot];
      const row = document.createElement('div');
      Object.assign(row.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.4rem',
        background: 'rgba(50,50,70,0.5)',
        border: '1px solid rgba(100,100,130,0.4)',
        borderRadius: '3px',
        cursor: item ? 'pointer' : 'default',
      });

      const slotLabel = document.createElement('span');
      slotLabel.textContent = slot.charAt(0).toUpperCase() + slot.slice(1) + ':';
      Object.assign(slotLabel.style, { fontSize: '0.75rem', color: '#888', minWidth: '55px' });
      row.appendChild(slotLabel);

      if (item) {
        const nameEl = document.createElement('span');
        nameEl.textContent = item.name;
        Object.assign(nameEl.style, { fontSize: '0.8rem', color: rarityColor(item.rarity) });
        row.appendChild(nameEl);
        row.title = this.itemTooltip(item);

        row.addEventListener('click', async () => {
          this.selectedColumn = 'equipment';
          this.selectedIndex = slotIdx;
          this.updateSelectionHighlight();
          if (this.inputDevice === 'touch') {
            const action = await this.itemActionDialog.show(item.name, [
              { label: 'Unequip', action: 'unequip', variant: 'primary' },
              { label: 'Cancel', action: 'cancel', variant: 'neutral' },
            ]);
            if (action === 'unequip') {
              this.inventory!.unequip(slot);
              this.refresh();
            }
          } else {
            this.inventory!.unequip(slot);
            this.refresh();
          }
        });
        row.addEventListener('mouseenter', () => {
          this.selectedColumn = 'equipment';
          this.selectedIndex = slotIdx;
          this.updateSelectionHighlight();
          row.style.background = 'rgba(80,50,100,0.5)';
        });
        row.addEventListener('mouseleave', () => {
          row.style.background = 'rgba(50,50,70,0.5)';
        });
      } else {
        const empty = document.createElement('span');
        empty.textContent = '(empty)';
        Object.assign(empty.style, { fontSize: '0.75rem', color: '#555' });
        row.appendChild(empty);
      }

      this.equipmentEl.appendChild(row);
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

    for (let bagIdx = 0; bagIdx < this.inventory.bag.length; bagIdx++) {
      const item = this.inventory.bag[bagIdx];
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

      const leftPart = document.createElement('div');
      Object.assign(leftPart.style, { display: 'flex', alignItems: 'center', gap: '0.3rem' });

      const nameEl = document.createElement('span');
      nameEl.textContent = item.name;
      nameEl.style.color = rarityColor(item.rarity);
      leftPart.appendChild(nameEl);
      row.appendChild(leftPart);

      const rightPart = document.createElement('div');
      Object.assign(rightPart.style, { display: 'flex', alignItems: 'center', gap: '0.3rem' });

      const typeTag = document.createElement('span');
      typeTag.textContent = item.type === 'equipment' ? (item.slot ?? '') : 'use';
      Object.assign(typeTag.style, { fontSize: '0.65rem', color: '#777' });
      rightPart.appendChild(typeTag);

      // Drop button
      const dropBtn = document.createElement('span');
      dropBtn.textContent = 'x';
      Object.assign(dropBtn.style, {
        fontSize: '0.65rem',
        color: '#664444',
        cursor: 'pointer',
        padding: '0 0.2rem',
        borderRadius: '2px',
      });
      dropBtn.addEventListener('mouseenter', () => {
        dropBtn.style.color = '#ff4444';
      });
      dropBtn.addEventListener('mouseleave', () => {
        dropBtn.style.color = '#664444';
      });
      dropBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.promptDrop(item);
      });
      rightPart.appendChild(dropBtn);
      row.appendChild(rightPart);

      // Touch: show action dialog; mouse: click to equip, right-click to use, shift+click to drop
      row.addEventListener('click', async (e) => {
        this.selectedColumn = 'bag';
        this.selectedIndex = bagIdx;
        this.updateSelectionHighlight();
        if (this.inputDevice === 'touch') {
          const buttons: ActionButtonConfig[] = [];
          if (item.type === 'equipment') {
            buttons.push({ label: 'Equip', action: 'equip', variant: 'primary' });
          } else {
            buttons.push({ label: 'Use', action: 'use', variant: 'primary' });
          }
          buttons.push({ label: 'Drop', action: 'drop', variant: 'danger' });
          buttons.push({ label: 'Cancel', action: 'cancel', variant: 'neutral' });

          const action = await this.itemActionDialog.show(item.name, buttons);

          if (action === 'equip' && item.type === 'equipment') {
            this.inventory!.equip(item.id);
            if (this.selectedIndex >= this.inventory!.bag.length) {
              this.selectedIndex = Math.max(0, this.inventory!.bag.length - 1);
            }
            this.refresh();
          } else if (action === 'use' && item.type === 'consumable') {
            const consumed = this.inventory!.useConsumable(item.id);
            if (consumed) {
              events.emit('useConsumable', consumed);
              if (this.selectedIndex >= this.inventory!.bag.length) {
                this.selectedIndex = Math.max(0, this.inventory!.bag.length - 1);
              }
              this.refresh();
            }
          } else if (action === 'drop') {
            this.promptDrop(item);
          }
        } else {
          if ((e as MouseEvent).shiftKey) {
            this.promptDrop(item);
          } else if (item.type === 'equipment') {
            this.inventory!.equip(item.id);
            this.refresh();
          }
        }
      });
      row.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (this.inputDevice !== 'touch' && item.type === 'consumable') {
          const consumed = this.inventory!.useConsumable(item.id);
          if (consumed) {
            events.emit('useConsumable', consumed);
            this.refresh();
          }
        }
      });

      row.addEventListener('mouseenter', () => {
        this.selectedColumn = 'bag';
        this.selectedIndex = bagIdx;
        this.updateSelectionHighlight();
        row.style.background = 'rgba(60,50,80,0.5)';
      });
      row.addEventListener('mouseleave', () => {
        row.style.background = 'rgba(40,40,55,0.5)';
      });
      this.bagEl.appendChild(row);
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

  private renderStats(): void {
    if (!this.computedStats) return;
    const s = this.computedStats;
    this.statsEl.innerHTML = [
      `STR: ${s.strength}  VIT: ${s.vitality}`,
      `AGI: ${s.agility}  LCK: ${s.luck}`,
      `HP: ${s.maxHp}  ATK: ${s.attack}  DEF: ${s.defense}`,
      `Crit: ${(s.critChance * 100).toFixed(1)}% (x${s.critMultiplier.toFixed(2)})`,
      `Atk Spd: ${(s.attackSpeed * 100).toFixed(0)}%  Move: ${(s.moveSpeed * 100).toFixed(0)}%`,
      s.hpRegen > 0 ? `Regen: ${s.hpRegen.toFixed(1)} HP/s` : '',
    ]
      .filter(Boolean)
      .join('<br>');
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
