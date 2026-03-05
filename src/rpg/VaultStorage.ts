/**
 * Long-term item storage (vault) accessible from the Hub.
 *
 * The vault holds items separately from the player's bag. Items can be
 * transferred between the bag (via Inventory) and the vault.
 */

import { Item } from './LootTable';
import { events } from '../utils/EventBus';

const MAX_VAULT_SIZE = 48;

export class VaultStorage {
  items: Item[] = [];

  get size(): number {
    return this.items.length;
  }

  get maxSize(): number {
    return MAX_VAULT_SIZE;
  }

  get isFull(): boolean {
    return this.items.length >= MAX_VAULT_SIZE;
  }

  /** Add an item to the vault. Returns false if full. */
  addItem(item: Item): boolean {
    if (this.isFull) return false;
    this.items.push(item);
    events.emit('vaultChanged');
    return true;
  }

  /** Remove an item from the vault by id. Returns the item or null. */
  removeItem(itemId: string): Item | null {
    const idx = this.items.findIndex((i) => i.id === itemId);
    if (idx < 0) return null;
    const [item] = this.items.splice(idx, 1);
    events.emit('vaultChanged');
    return item;
  }

  toJSON(): Item[] {
    return [...this.items];
  }

  fromJSON(data: Item[]): void {
    this.items = Array.isArray(data) ? [...data] : [];
  }
}
