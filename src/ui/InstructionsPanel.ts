export class InstructionsPanel {
  private container: HTMLDivElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'instructions-panel';
    Object.assign(this.container.style, {
      position: 'absolute',
      top: '12px',
      right: '12px',
      padding: '12px 16px',
      background: 'rgba(0, 0, 0, 0.7)',
      border: '1px solid rgba(170, 68, 255, 0.3)',
      borderRadius: '6px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      fontSize: '0.85rem',
      lineHeight: '1.6',
      color: '#ccc',
      maxWidth: '260px',
      pointerEvents: 'auto',
    });

    this.container.innerHTML = `
      <div style="color:#aa88ff; font-weight:600; margin-bottom:6px; font-size:0.95rem;">Controls</div>
      <div><span style="color:#eee">WASD / Arrows</span> — Move</div>
      <div><span style="color:#eee">E</span> — Interact</div>
      <div><span style="color:#eee">Click / Space</span> — Attack</div>
      <hr style="border:none; border-top:1px solid rgba(255,255,255,0.1); margin:8px 0;">
      <div style="color:#aa88ff; font-weight:600; margin-bottom:6px; font-size:0.95rem;">Objective</div>
      <div>Find the <span style="color:#dd88ff">purple portal</span> and press <span style="color:#eee">E</span> to enter the dungeon.</div>
      <hr style="border:none; border-top:1px solid rgba(255,255,255,0.1); margin:8px 0;">
      <div style="color:#666; font-size:0.75rem; cursor:pointer;" id="instructions-toggle">Click to hide</div>
    `;
  }

  show(): void {
    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.container);

    const toggle = this.container.querySelector('#instructions-toggle') as HTMLElement;
    toggle?.addEventListener('click', () => {
      const content = this.container.querySelectorAll(':scope > div:not(:last-child), :scope > hr');
      const isHidden = (content[0] as HTMLElement).style.display === 'none';
      content.forEach((el) => {
        (el as HTMLElement).style.display = isHidden ? '' : 'none';
      });
      toggle.textContent = isHidden ? 'Click to hide' : 'Controls (click to show)';
    });
  }

  hide(): void {
    this.container.remove();
  }
}
