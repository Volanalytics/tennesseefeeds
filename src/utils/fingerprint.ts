import { v4 as uuidv4 } from 'uuid';
import { hashString } from '@/utils/hash';

interface BrowserFeatures {
  screen: {
    colorDepth: number;
    pixelDepth: number;
    width: number;
    height: number;
  };
  browser: {
    userAgent: string;
    language: string;
    platform: string;
    hardwareConcurrency: number;
    deviceMemory?: number;
    timezone: string;
    cookiesEnabled: boolean;
    doNotTrack?: string | null;
  };
  canvas?: string;
  webgl?: string;
  fonts: string[];
}

/**
 * Generates a canvas fingerprint
 */
const getCanvasFingerprint = (): string | undefined => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    // Draw various elements
    canvas.width = 200;
    canvas.height = 50;
    
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125,1,62,20);
    ctx.fillStyle = '#069';
    ctx.fillText('Fingerprint', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Canvas', 4, 17);

    return canvas.toDataURL();
  } catch {
    return undefined;
  }
};

/**
 * Gets WebGL fingerprint
 */
const getWebGLFingerprint = (): string | undefined => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (!gl) return undefined;

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return undefined;

    return [
      gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
      gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    ].join('::');
  } catch {
    return undefined;
  }
};

/**
 * Gets available system fonts
 */
const getAvailableFonts = async (): Promise<string[]> => {
  if (!document.fonts || !document.fonts.check) {
    return [];
  }

  const fontList = [
    'Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana',
    'Helvetica', 'Comic Sans MS', 'Impact', 'Tahoma', 'Terminal'
  ];

  const availableFonts = await Promise.all(
    fontList.map(async font => {
      const isAvailable = await document.fonts.check(`12px "${font}"`);
      return isAvailable ? font : '';
    })
  );

  return availableFonts.filter(Boolean);
};

/**
 * Collects browser features for fingerprinting
 */
const collectBrowserFeatures = async (): Promise<BrowserFeatures> => {
  const features: BrowserFeatures = {
    screen: {
      colorDepth: window.screen.colorDepth,
      pixelDepth: window.screen.pixelDepth,
      width: window.screen.width,
      height: window.screen.height
    },
    browser: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookiesEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack
    },
    fonts: await getAvailableFonts()
  };

  // Add deviceMemory if available
  if ('deviceMemory' in navigator) {
    features.browser.deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  }

  // Add canvas fingerprint
  const canvasFingerprint = getCanvasFingerprint();
  if (canvasFingerprint) {
    features.canvas = canvasFingerprint;
  }

  // Add WebGL fingerprint
  const webglFingerprint = getWebGLFingerprint();
  if (webglFingerprint) {
    features.webgl = webglFingerprint;
  }

  return features;
};

/**
 * Generates a unique fingerprint based on browser features
 */
export const generateEnhancedFingerprint = async (): Promise<string> => {
  if (typeof window === 'undefined') return '';

  // Check for stored fingerprint first
  const storedFingerprint = localStorage.getItem('enhanced_fingerprint');
  if (storedFingerprint) {
    return storedFingerprint;
  }

  try {
    const features = await collectBrowserFeatures();
    const fingerprintData = JSON.stringify(features);
    
    // Generate a hash of the features
    const featureHash = await hashString(fingerprintData);
    
    // Combine with a UUID for uniqueness
    const uniqueId = `${featureHash}-${uuidv4()}`;
    
    // Store the fingerprint
    localStorage.setItem('enhanced_fingerprint', uniqueId);
    
    return uniqueId;
  } catch {
    // Fallback to UUID if fingerprinting fails
    const fallbackId = uuidv4();
    localStorage.setItem('enhanced_fingerprint', fallbackId);
    return fallbackId;
  }
};

/**
 * Validates if a fingerprint is genuine
 */
export const validateFingerprint = async (fingerprint: string): Promise<boolean> => {
  if (typeof window === 'undefined') return false;

  const storedFingerprint = localStorage.getItem('enhanced_fingerprint');
  if (!storedFingerprint) return false;

  // If the fingerprint matches the stored one, it's valid
  if (fingerprint === storedFingerprint) return true;

  // Re-generate fingerprint to check if browser characteristics changed
  const newFingerprint = await generateEnhancedFingerprint();
  return fingerprint === newFingerprint;
};
