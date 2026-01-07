/**
 * Pulse+ IPC Handlers
 *
 * Electron IPC handlers for kommunikation mellem main process og renderer.
 */

import { ipcMain } from 'electron';
import { getPulseService } from "./PulseService.js";
import { getPulseScheduler, startPulseScheduler } from "./PulseScheduler.js";
import type { PulseAPIResponse, PulseCard, PulseDailyDigest, PulsePreferences, CurationRequest } from "./types.js";

// ============================================================================
// IPC Channel Names
// ============================================================================

export const PULSE_CHANNELS = {
  // Digest & Cards
  GET_TODAY_CARDS: 'pulse:get-today-cards',
  GET_RECENT_CARDS: 'pulse:get-recent-cards',
  GENERATE_DIGEST: 'pulse:generate-digest',

  // Card Actions
  MARK_VIEWED: 'pulse:mark-viewed',
  SAVE_CARD: 'pulse:save-card',
  DISMISS_CARD: 'pulse:dismiss-card',
  SUBMIT_FEEDBACK: 'pulse:submit-feedback',

  // Curation
  ADD_CURATION: 'pulse:add-curation',
  GET_CURATION_REQUESTS: 'pulse:get-curation-requests',

  // Preferences
  GET_PREFERENCES: 'pulse:get-preferences',
  UPDATE_PREFERENCES: 'pulse:update-preferences',

  // Scheduler
  GET_SCHEDULER_STATUS: 'pulse:get-scheduler-status',
  RUN_NOW: 'pulse:run-now',
} as const;

// ============================================================================
// Handler Registration
// ============================================================================

export function registerPulseIpcHandlers(): void {
  const service = getPulseService();
  const scheduler = getPulseScheduler();

  // --------------------------------------------------------------------------
  // Digest & Cards
  // --------------------------------------------------------------------------

  ipcMain.handle(PULSE_CHANNELS.GET_TODAY_CARDS, async (): Promise<PulseAPIResponse<PulseCard[]>> => {
    try {
      const cards = service.getTodayCards();
      return { success: true, data: cards };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(PULSE_CHANNELS.GET_RECENT_CARDS, async (_event, days?: number): Promise<PulseAPIResponse<PulseCard[]>> => {
    try {
      const cards = service.getRecentCards(days || 7);
      return { success: true, data: cards };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(PULSE_CHANNELS.GENERATE_DIGEST, async (): Promise<PulseAPIResponse<PulseDailyDigest>> => {
    try {
      const digest = await service.generateDailyDigest();
      return { success: true, data: digest };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // --------------------------------------------------------------------------
  // Card Actions
  // --------------------------------------------------------------------------

  ipcMain.handle(PULSE_CHANNELS.MARK_VIEWED, async (_event, cardId: string): Promise<PulseAPIResponse<void>> => {
    try {
      service.markAsViewed(cardId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(PULSE_CHANNELS.SAVE_CARD, async (_event, cardId: string): Promise<PulseAPIResponse<void>> => {
    try {
      service.saveCard(cardId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(PULSE_CHANNELS.DISMISS_CARD, async (_event, cardId: string): Promise<PulseAPIResponse<void>> => {
    try {
      service.dismissCard(cardId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(PULSE_CHANNELS.SUBMIT_FEEDBACK, async (_event, cardId: string, feedback: 'up' | 'down'): Promise<PulseAPIResponse<void>> => {
    try {
      service.submitFeedback(cardId, feedback);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // --------------------------------------------------------------------------
  // Curation
  // --------------------------------------------------------------------------

  ipcMain.handle(PULSE_CHANNELS.ADD_CURATION, async (_event, topic: string): Promise<PulseAPIResponse<CurationRequest>> => {
    try {
      const request = await service.addCurationRequest(topic);
      return { success: true, data: request };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // --------------------------------------------------------------------------
  // Preferences
  // --------------------------------------------------------------------------

  ipcMain.handle(PULSE_CHANNELS.GET_PREFERENCES, async (): Promise<PulseAPIResponse<PulsePreferences>> => {
    try {
      const prefs = service.getPreferences();
      return { success: true, data: prefs };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(PULSE_CHANNELS.UPDATE_PREFERENCES, async (_event, prefs: Partial<PulsePreferences>): Promise<PulseAPIResponse<void>> => {
    try {
      service.updatePreferences(prefs);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // --------------------------------------------------------------------------
  // Scheduler
  // --------------------------------------------------------------------------

  ipcMain.handle(PULSE_CHANNELS.GET_SCHEDULER_STATUS, async (): Promise<PulseAPIResponse<{
    isRunning: boolean;
    nextScheduledRun: string | null;
    serviceState: any;
  }>> => {
    try {
      const schedulerStatus = scheduler.getStatus();
      const serviceState = service.getState();
      return {
        success: true,
        data: {
          ...schedulerStatus,
          serviceState,
        },
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(PULSE_CHANNELS.RUN_NOW, async (): Promise<PulseAPIResponse<void>> => {
    try {
      await scheduler.runNow();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  console.log('[Pulse] IPC handlers registered');

  // Start the scheduler
  startPulseScheduler();
}

// ============================================================================
// Cleanup
// ============================================================================

export function unregisterPulseIpcHandlers(): void {
  Object.values(PULSE_CHANNELS).forEach(channel => {
    ipcMain.removeHandler(channel);
  });
  console.log('[Pulse] IPC handlers unregistered');
}
