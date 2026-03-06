/**
 * Visual tab bar shown at the top of any open menu panel.
 *
 * Displays clickable tabs for: Inventory, Skills, Map, Settings, Diagnostics.
 * Highlights the active tab and shows keyboard/gamepad hints for switching.
 */

import type { InputDevice } from '../game/ActionManager';

export type MenuTab = 'inventory' | 'skills' | 'map' | 'settings' | 'diagnostics';

const TAB_LABELS: Record<MenuTab, string> = {
  inventory: 'Inventory',
  skills: 'Skills',
  map: 'Map',
  settings: 'Settings',
  diagnostics: 'Diagnostics',
};

export class MenuTabBar {
  private container: HTMLDivElement;
  private visible = false;
  private activeTab: MenuTab | null = null;
  private disabledTabs = new Set<MenuTab>();
  private tabButtons: Map<MenuTab, HTMLButtonElement> = new Map();
  private hintEl: HTMLDivElement;
  private inputDevice: InputDevice = 'keyboard';
  private onTabSelect: ((tab: MenuTab) => void) | null = null;

  private readonly allTabs: MenuTab[] = ['inventory', 'skills', 'map', 'settings', 'diagnostics'];

  constructor() {
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'absolute',
      top: '8px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'none',
      flexDirection: 'column',
      alignItems: 'center',
      zIndex: '210',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    });

    // Tab row
    const tabRow = document.createElement('div');
    Object.assign(tabRow.style, {
      display: 'flex',
      gap: '2px',
      background: 'rgba(10, 10, 20, 0.9)',
      border: '2px solid rgba(170, 68, 255, 0.5)',
      borderRadius: '6px',
      padding: '3px',
    });

    for (const tab of this.allTabs) {
      const btn = document.createElement('button');
      btn.textContent = TAB_LABELS[tab];
      Object.assign(btn.style, {
        background: 'rgba(40, 40, 60, 0.6)',
        border: '1px solid rgba(100, 100, 130, 0.3)',
        borderRadius: '4px',
        color: '#999',
        cursor: 'pointer',
        fontSize: '0.75rem',
        padding: '0.35rem 0.7rem',
        transition: 'all 0.15s',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
      });
      btn.addEventListener('click', () => {
        if (!this.disabledTabs.has(tab)) {
          this.onTabSelect?.(tab);
        }
      });
      btn.addEventListener('mouseenter', () => {
        if (tab !== this.activeTab && !this.disabledTabs.has(tab)) {
          btn.style.background = 'rgba(60, 50, 90, 0.5)';
          btn.style.color = '#ccc';
        }
      });
      btn.addEventListener('mouseleave', () => {
        if (tab !== this.activeTab) {
          this.applyInactiveStyle(btn, this.disabledTabs.has(tab));
        }
      });
      tabRow.appendChild(btn);
      this.tabButtons.set(tab, btn);
    }

    this.container.appendChild(tabRow);

    // Hint line below tabs
    this.hintEl = document.createElement('div');
    Object.assign(this.hintEl.style, {
      marginTop: '4px',
      fontSize: '0.65rem',
      color: '#666',
      textAlign: 'center',
    });
    this.container.appendChild(this.hintEl);

    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.container);
  }

  show(activeTab: MenuTab, disabledTabs: MenuTab[], onTabSelect: (tab: MenuTab) => void): void {
    this.activeTab = activeTab;
    this.disabledTabs = new Set(disabledTabs);
    this.onTabSelect = onTabSelect;
    this.visible = true;
    this.updateTabStyles();
    this.updateHintText();
    this.container.style.display = 'flex';
  }

  hide(): void {
    this.visible = false;
    this.container.style.display = 'none';
    this.onTabSelect = null;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setActiveTab(tab: MenuTab): void {
    this.activeTab = tab;
    this.updateTabStyles();
  }

  setDisabledTabs(tabs: MenuTab[]): void {
    this.disabledTabs = new Set(tabs);
    this.updateTabStyles();
  }

  setInputDevice(device: InputDevice): void {
    this.inputDevice = device;
    if (this.visible) {
      this.updateHintText();
    }
  }

  private updateTabStyles(): void {
    for (const [tab, btn] of this.tabButtons) {
      const isActive = tab === this.activeTab;
      const isDisabled = this.disabledTabs.has(tab);

      if (isActive) {
        Object.assign(btn.style, {
          background: 'rgba(100, 60, 160, 0.7)',
          border: '1px solid rgba(170, 68, 255, 0.8)',
          color: '#fff',
          cursor: 'default',
        });
      } else {
        this.applyInactiveStyle(btn, isDisabled);
      }

      btn.textContent = TAB_LABELS[tab];
    }
  }

  private applyInactiveStyle(btn: HTMLButtonElement, disabled: boolean): void {
    if (disabled) {
      Object.assign(btn.style, {
        background: 'rgba(30, 30, 40, 0.4)',
        border: '1px solid rgba(60, 60, 80, 0.3)',
        color: '#555',
        cursor: 'not-allowed',
      });
    } else {
      Object.assign(btn.style, {
        background: 'rgba(40, 40, 60, 0.6)',
        border: '1px solid rgba(100, 100, 130, 0.3)',
        color: '#999',
        cursor: 'pointer',
      });
    }
  }

  private updateHintText(): void {
    switch (this.inputDevice) {
      case 'gamepad':
        this.hintEl.textContent = 'LB / RB: switch tab | Start: close menu';
        break;
      case 'touch':
        this.hintEl.textContent = 'Tap a tab to switch';
        break;
      default:
        this.hintEl.textContent = '[ and ]: switch tab | Esc: close menu';
    }
  }
}
