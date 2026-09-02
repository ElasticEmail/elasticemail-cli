import { afterEach, describe, expect, it, vi } from 'vitest';
import { printBanner, renderBanner, shouldShowBanner } from '../src/banner.js';

describe('shouldShowBanner', () => {
  it('shows on a TTY without --json', () => {
    expect(shouldShowBanner({ isTty: true, json: false })).toBe(true);
  });

  it('never shows in --json mode, even on a TTY', () => {
    expect(shouldShowBanner({ isTty: true, json: true })).toBe(false);
  });

  it('never shows when stdout is not a TTY', () => {
    expect(shouldShowBanner({ isTty: false, json: false })).toBe(false);
    expect(shouldShowBanner({ isTty: false, json: true })).toBe(false);
  });
});

describe('renderBanner', () => {
  it('produces non-empty ASCII art containing the figlet rendering', () => {
    const banner = renderBanner();
    expect(banner.length).toBeGreaterThan(0);
    // figlet output spans multiple lines
    expect(banner.split('\n').length).toBeGreaterThan(1);
  });
});

describe('printBanner', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints when allowed', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const printed = printBanner({ isTty: true, json: false });
    expect(printed).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does not print in --json mode', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const printed = printBanner({ isTty: true, json: true });
    expect(printed).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not print when not a TTY', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const printed = printBanner({ isTty: false, json: false });
    expect(printed).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });
});
