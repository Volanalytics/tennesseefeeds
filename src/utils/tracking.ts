import { generateEnhancedFingerprint } from '@/utils/fingerprint';
import { quickHash } from '@/utils/hash';

export interface TrackingEvent {
  id: string;
  fingerprint: string;
  timestamp: number;
  type: 'pageview' | 'click' | 'form_submit' | 'error' | 'performance' | 'custom' | 'security';
  path: string;
  data: {
    userAgent: string;
    screenSize: {
      width: number;
      height: number;
    };
    browserInfo: {
      language: string;
      platform: string;
      vendor: string;
      timeZone: string;
      colorDepth: number;
    };
    elementInfo?: {
      id?: string;
      className?: string;
      text?: string;
      href?: string;
      tag?: string;
      path?: string;
    };
    performance?: {
      loadTime?: number;
      domContentLoaded?: number;
      firstPaint?: number;
      firstContentfulPaint?: number;
    };
    error?: {
      message: string;
      stack?: string;
      type?: string;
    };
    custom?: Record<string, unknown>;
  };
}

export interface StoredEvents {
  events: TrackingEvent[];
  lastSync?: number;
  version: string;
}

const STORAGE_VERSION = '1.0.0';
const MAX_STORED_EVENTS = 1000;
const STORAGE_KEY = 'tracking_events';

/**
 * Gets browser and system information
 */
const getBrowserInfo = () => {
  if (typeof window === 'undefined') {
    return {
      userAgent: '',
      screenSize: { width: 0, height: 0 },
      browserInfo: {
        language: '',
        platform: '',
        vendor: '',
        timeZone: '',
        colorDepth: 0
      }
    };
  }

  return {
    userAgent: window.navigator.userAgent,
    screenSize: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    browserInfo: {
      language: window.navigator.language,
      platform: window.navigator.platform,
      vendor: window.navigator.vendor,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      colorDepth: window.screen.colorDepth
    }
  };
};

/**
 * Gets performance metrics
 */
const getPerformanceMetrics = () => {
  if (typeof window === 'undefined' || !window.performance) {
    return undefined;
  }

  const timing = performance.timing;
  const paint = performance.getEntriesByType('paint');

  return {
    loadTime: timing.loadEventEnd - timing.navigationStart,
    domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
    firstPaint: paint.find(entry => entry.name === 'first-paint')?.startTime,
    firstContentfulPaint: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime
  };
};

/**
 * Stores events in localStorage with size management
 */
const storeEvent = (event: TrackingEvent) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const events: StoredEvents = stored 
      ? JSON.parse(stored) 
      : { events: [], version: STORAGE_VERSION };

    // Add new event
    events.events.push(event);

    // Maintain size limit
    if (events.events.length > MAX_STORED_EVENTS) {
      events.events = events.events.slice(-MAX_STORED_EVENTS);
    }

    events.lastSync = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (error) {
    console.error('Error storing tracking event:', error);
  }
};

/**
 * Creates and stores a tracking event
 */
export const trackEvent = async (
  type: TrackingEvent['type'],
  path: string,
  elementInfo?: TrackingEvent['data']['elementInfo'],
  customData?: Record<string, unknown>
): Promise<TrackingEvent> => {
  const fingerprint = await generateEnhancedFingerprint();
  const browserData = getBrowserInfo();
  const performanceData = getPerformanceMetrics();
  
  const event: TrackingEvent = {
    id: quickHash(`${Date.now()}-${Math.random()}`),
    fingerprint,
    timestamp: Date.now(),
    type,
    path,
    data: {
      ...browserData,
      elementInfo,
      ...(performanceData && { performance: performanceData }),
      ...(customData && { custom: customData })
    }
  };

  // Store the event
  storeEvent(event);
  console.log('Tracking event:', event);

  return event;
};

/**
 * Gets all stored tracking events
 */
export const getStoredEvents = (): StoredEvents => {
  if (typeof window === 'undefined') return { events: [], version: STORAGE_VERSION };
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { events: [], version: STORAGE_VERSION };

    const data = JSON.parse(stored);
    return {
      events: data.events || [],
      lastSync: data.lastSync,
      version: data.version || STORAGE_VERSION
    };
  } catch (error) {
    console.error('Error reading stored events:', error);
    return { events: [], version: STORAGE_VERSION };
  }
};

/**
 * Clears all stored tracking events
 */
export const clearStoredEvents = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing stored events:', error);
  }
};

/**
 * Error tracking utility
 */
export const trackError = async (error: Error, path: string) => {
  return trackEvent('error', path, undefined, {
    error: {
      message: error.message,
      stack: error.stack,
      type: error.name
    }
  });
};

/**
 * Performance tracking utility
 */
export const trackPerformance = async (path: string, metrics?: Partial<TrackingEvent['data']['performance']>) => {
  const performanceData = metrics || getPerformanceMetrics();
  if (!performanceData) return;

  return trackEvent('performance', path, undefined, {
    performance: performanceData
  });
};

/**
 * Custom event tracking utility
 */
export const trackCustomEvent = async (
  path: string,
  category: string,
  action: string,
  data?: Record<string, unknown>
) => {
  return trackEvent('custom', path, undefined, {
    category,
    action,
    ...data
  });
};
