/**
 * Pulse+ Scheduler
 *
 * Håndterer daglig kørsel af Pulse digest generation.
 * Kører som default kl. 05:00 CET, konfigurerbar via preferences.
 */

import { getPulseService, PulseService } from './PulseService';
import { getPreferences } from './storage';

// ============================================================================
// Scheduler Class
// ============================================================================

export class PulseScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private isRunning = false;
  private lastScheduledTime: string | null = null;

  constructor(private service: PulseService) {}

  // ==========================================================================
  // Scheduling Logic
  // ==========================================================================

  start(): void {
    if (this.isRunning) {
      console.log('[PulseScheduler] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[PulseScheduler] Starting scheduler...');
    this.scheduleNextRun();
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('[PulseScheduler] Stopped');
  }

  private scheduleNextRun(): void {
    if (!this.isRunning) return;

    const preferences = getPreferences();

    if (!preferences.enabled) {
      console.log('[PulseScheduler] Pulse is disabled, skipping schedule');
      // Check again in 1 hour
      this.timer = setTimeout(() => this.scheduleNextRun(), 60 * 60 * 1000);
      return;
    }

    const nextRun = this.calculateNextRunTime(preferences.dailyTime);
    const msUntilNextRun = nextRun.getTime() - Date.now();

    console.log(`[PulseScheduler] Next run scheduled for: ${nextRun.toISOString()} (in ${Math.round(msUntilNextRun / 1000 / 60)} minutes)`);

    this.lastScheduledTime = nextRun.toISOString();

    this.timer = setTimeout(async () => {
      await this.runDigestGeneration();
      this.scheduleNextRun();
    }, msUntilNextRun);
  }

  private calculateNextRunTime(dailyTime: string): Date {
    const [hours, minutes] = dailyTime.split(':').map(Number);

    const now = new Date();
    const todayRun = new Date(now);
    todayRun.setHours(hours, minutes, 0, 0);

    // If today's run time has passed, schedule for tomorrow
    if (todayRun.getTime() <= now.getTime()) {
      todayRun.setDate(todayRun.getDate() + 1);
    }

    return todayRun;
  }

  private async runDigestGeneration(): Promise<void> {
    console.log('[PulseScheduler] Running scheduled digest generation...');

    try {
      const digest = await this.service.generateDailyDigest();
      console.log(`[PulseScheduler] Digest generated with ${digest.cards.length} cards`);

      // Optionally notify via Electron notification
      this.sendNotification(digest.cards.length);
    } catch (error) {
      console.error('[PulseScheduler] Failed to generate digest:', error);
    }
  }

  private sendNotification(cardCount: number): void {
    try {
      const { Notification } = require('electron');

      if (Notification.isSupported() && cardCount > 0) {
        new Notification({
          title: '🔔 Pulse+ Daglig Briefing',
          body: `${cardCount} nye indsigter klar til gennemsyn`,
          silent: false,
        }).show();
      }
    } catch (error) {
      // Notification not available (e.g., in renderer process)
      console.log('[PulseScheduler] Notification not available');
    }
  }

  // ==========================================================================
  // Manual Trigger
  // ==========================================================================

  async runNow(): Promise<void> {
    console.log('[PulseScheduler] Manual digest generation triggered');
    await this.runDigestGeneration();
  }

  // ==========================================================================
  // Status
  // ==========================================================================

  getStatus(): {
    isRunning: boolean;
    nextScheduledRun: string | null;
  } {
    return {
      isRunning: this.isRunning,
      nextScheduledRun: this.lastScheduledTime,
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let schedulerInstance: PulseScheduler | null = null;

export function getPulseScheduler(): PulseScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new PulseScheduler(getPulseService());
  }
  return schedulerInstance;
}

export function startPulseScheduler(): void {
  getPulseScheduler().start();
}

export function stopPulseScheduler(): void {
  getPulseScheduler().stop();
}
