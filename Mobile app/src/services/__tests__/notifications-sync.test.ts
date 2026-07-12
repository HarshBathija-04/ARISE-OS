import { privacyText } from '../notifications/notifications';
import { CHANNEL_IDS } from '../notifications/channels';
import { SYNC_LABEL } from '../sync/types';

describe('notifications · privacyText', () => {
  it('passes normal copy through untouched', () => {
    expect(privacyText('DSA streak at risk', { sensitive: false, privacyMode: false })).toBe(
      'DSA streak at risk',
    );
  });

  it('neutralizes copy when the source is sensitive', () => {
    const out = privacyText('You resisted PORNOGRAPHY', { sensitive: true, privacyMode: false });
    expect(out).not.toContain('PORNOGRAPHY');
    expect(out).toBe('A protected protocol needs your attention.');
  });

  it('neutralizes ALL copy when Privacy Mode is on', () => {
    const out = privacyText('Workout streak reminder', { sensitive: false, privacyMode: true });
    expect(out).toBe('A protected protocol needs your attention.');
  });
});

describe('notifications · channels', () => {
  it('defines exactly the 5 spec channels', () => {
    expect(CHANNEL_IDS).toEqual([
      'DAILY_MISSIONS',
      'STREAK_WARNINGS',
      'FOCUS',
      'RECOVERY',
      'SYSTEM_EVENTS',
    ]);
  });
});

describe('sync · status labels', () => {
  it('uses the exact spec wording for the key transitions', () => {
    expect(SYNC_LABEL.PENDING).toBe('SYNC PENDING');
    expect(SYNC_LABEL.VALIDATED).toBe('SYSTEM VALIDATED');
    expect(SYNC_LABEL.REVIEW).toBe('ACTION REQUIRES REVIEW');
  });

  it('has a label for every status', () => {
    (['PENDING', 'SYNCING', 'VALIDATED', 'REVIEW', 'FAILED'] as const).forEach((s) => {
      expect(typeof SYNC_LABEL[s]).toBe('string');
      expect(SYNC_LABEL[s].length).toBeGreaterThan(0);
    });
  });
});
