/**
 * Pulse+ Module
 *
 * Proaktiv daglig briefing inspireret af ChatGPT Pulse.
 * Leverer kuraterede kort om cybersikkerhed, AI, forretning og aktivitet.
 */

// Types
export * from './types';

// Storage
export {
  initPulseStorage,
  closePulseStorage,
  insertCard,
  insertCards,
  getCardById,
  getTodayCards,
  getCardsByCategory,
  getRecentCards,
  updateCardStatus,
  updateCardFeedback,
  cleanupOldCards,
  insertCurationRequest,
  getPendingCurationRequests,
  fulfillCurationRequest,
  getSources,
  getEnabledSources,
  updateSourceLastFetched,
  toggleSource,
  getPreferences,
  updatePreferences,
  getFeedbackStats,
  getPreferredTags,
} from './storage';

// Service
export { PulseService, getPulseService } from './PulseService';

// Scheduler
export {
  PulseScheduler,
  getPulseScheduler,
  startPulseScheduler,
  stopPulseScheduler,
} from './PulseScheduler';

// Sources
export {
  ExternalFeedConnector,
  extractTags,
  inferCategory,
} from './sources/ExternalFeedConnector';
