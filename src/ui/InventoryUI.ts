/**
 * Inventory screen UI.
 *
 * Shows equipped items on the left, bag items on the right.
 * Click a bag item to equip it, click an equipped item to unequip it.
 * Right-click a consumable to use it.
 */

import { Inventory } from '../rpg/Inventory';
import { Item, rarityColor, ItemSlot } from '../rpg/LootTable';
import { ComputedStats } from '../rpg/Stats';
import { events } from '../utils/EventBus';

export class InventoryUI {
  private container: HTMLDivElement;
  private equipmentEl: HTMLDivElement;
  private bagEl: HTMLDivElement;
  private statsEl: HTMLDivElement;
  private inventory: Inventory | null = null;
  private computedStats: ComputedStats | null = null;
  private onClose: (() => void) | null = null;
  private visible = false;

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
      background: 'transparent', border: '1px solid rgba(255,255,255,0.3)',
      borderRadius: '4px', color: '#aaa', cursor: 'pointer', fontSize: '1rem',
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
    Object.assign(this.equipmentEl.style, { display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' });
    leftCol.appendChild(this.equipmentEl);

    const statTitle = document.createElement('div');
    statTitle.textContent = 'Stats';
    Object.assign(statTitle.style, { fontSize: '0.9rem', color: '#aa88cc', marginBottom: '0.5rem' });
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
    Object.assign(this.bagEl.style, { display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '300px', overflowY: 'auto' });
    rightCol.appendChild(this.bagEl);

    body.appendChild(rightCol);
    this.container.appendChild(body);

    // Keyboard hint
    const hint = document.createElement('div');
    hint.textContent = 'Press I or Escape to close. Right-click potions to use.';
    Object.assign(hint.style, { marginTop: '0.8rem', fontSize: '0.7rem', color: '#777', textAlign: 'center' });
    this.container.appendChild(hint);

    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.container);
  }

  show(inventory: Inventory, stats: ComputedStats, onClose: () => void): void {
    this.inventory = inventory;
    this.computedStats = stats;
    this.onClose = onClose;
    this.visible = true;
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

  refresh(): void {
    if (!this.inventory) return;
    this.renderEquipment();
    this.renderBag();
    this.renderStats();
  }

  private renderEquipment(): void {
    if (!this.inventory) return;
    this.equipmentEl.innerHTML = '';

    const slots: ItemSlot[] = ['weapon', 'armor', 'ring'];
    for (const slot of slots) {
      const item = this.inventory.equipped[slot];
      const row = document.createElement('div');
      Object.assign(row.style, {
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.4rem', background: 'rgba(50,50,70,0.5)',
        border: '1px solid rgba(100,100,130,0.4)', borderRadius: '3px',
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

        row.addEventListener('click', () => {
          this.inventory!.unequip(slot);
          this.refresh();
        });
        row.addEventListener('mouseenter', () => { row.style.background = 'rgba(80,50,100,0.5)'; });
        row.addEventListener('mouseleave', () => { row.style.background = 'rgba(50,50,70,0.5)'; });
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

    for (const item of this.inventory.bag) {
      const row = document.createElement('div');
      Object.assign(row.style, {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.3rem 0.5rem', background: 'rgba(40,40,55,0.5)',
        border: '1px solid rgba(80,80,100,0.3)', borderRadius: '3px',
        cursor: 'pointer', fontSize: '0.8rem',
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

      // Left click to equip, right click to use consumable
      row.addEventListener('click', () => {
        if (item.type === 'equipment') {
          this.inventory!.equip(item.id);
          this.refresh();
        }
      });
      row.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (item.type === 'consumable') {
          const consumed = this.inventory!.useConsumable(item.id);
          if (consumed) {
            events.emit('useConsumable', consumed);
            this.refresh();
          }
        }
      });

      row.addEventListener('mouseenter', () => { row.style.background = 'rgba(60,50,80,0.5)'; });
      row.addEventListener('mouseleave', () => { row.style.background = 'rgba(40,40,55,0.5)'; });
      this.bagEl.appendChild(row);
    }

    // Bag count
    const countEl = document.createElement('div');
    countEl.textContent = `${this.inventory.bagSize} / ${this.inventory.maxBagSize}`;
    Object.assign(countEl.style, { fontSize: '0.65rem', color: '#666', textAlign: 'right', marginTop: '0.3rem' });
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
    ].filter(Boolean).join('<br>');
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
    return lines.join('\n');
  }
}
