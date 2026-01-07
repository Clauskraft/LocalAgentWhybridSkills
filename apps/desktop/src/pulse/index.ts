/**
 * Pulse+ Module
 *
 * Proaktiv daglig briefing inspireret af ChatGPT Pulse.
 * Leverer kuraterede kort om cybersikkerhed, AI, forretning og aktivitet.
 */

// Types
export * from "./types.js";

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
} from "./storage.js";

// Service
export { PulseService, getPulseService } from "./PulseService.js";

// Scheduler
export {
  PulseScheduler,
  getPulseScheduler,
  startPulseScheduler,
  stopPulseScheduler,
} from "./PulseScheduler.js";

// Sources
export {
  ExternalFeedConnector,
  extractTags,
  inferCategory,
} from "./sources/ExternalFeedConnector.js";
