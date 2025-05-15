interface NetworkInfo {
  webrtcIPs: string[];
  dnsLeakDetected: boolean;
  locationConsistency: {
    browserTimezone: string;
    ipTimezone?: string;
    consistent: boolean;
  };
  connection: {
    type?: string;
    downlink?: number;
    rtt?: number;
    effectiveType?: string;
  };
  latencyPattern: {
    current: number;
    average: number;
    changes: number;
    lastCheck: number;
  };
}

interface SecurityFlags {
  vpnDetected: boolean;
  proxyDetected: boolean;
  torDetected: boolean;
  virtualizationDetected: boolean;
  reasons: string[];
}

/**
 * Detects real IPs through WebRTC
 */
export const detectRealIPs = async (): Promise<string[]> => {
  const ips: string[] = [];
  
  try {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.createDataChannel('');
    
    // Listen for candidates
    pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      
      // Extract IP addresses from candidate string
      const ipMatch = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/;
      const match = ipMatch.exec(e.candidate.candidate);
      
      if (match && !ips.includes(match[1])) {
        ips.push(match[1]);
      }
    };

    await pc.createOffer().then(offer => pc.setLocalDescription(offer));
    
    // Wait for candidates to be gathered
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return ips;
  } catch (error) {
    console.error('WebRTC detection failed:', error);
    return [];
  }
};

/**
 * Checks for timezone and location inconsistencies
 */
export const checkLocationConsistency = async (): Promise<{
  consistent: boolean;
  browserTimezone: string;
  ipTimezone?: string;
}> => {
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  try {
    const response = await fetch('https://worldtimeapi.org/api/ip');
    const data = await response.json();
    const ipTimezone = data.timezone;
    
    return {
      consistent: browserTimezone === ipTimezone,
      browserTimezone,
      ipTimezone
    };
  } catch (error) {
    console.error('Location consistency check failed:', error);
    return {
      consistent: true, // Default to true if check fails
      browserTimezone
    };
  }
};

/**
 * Monitors network latency patterns
 */
export class LatencyMonitor {
  private static instance: LatencyMonitor;
  private latencyHistory: number[] = [];
  private changes = 0;
  private lastCheck = 0;
  
  private constructor() {
    this.startMonitoring();
  }
  
  static getInstance(): LatencyMonitor {
    if (!LatencyMonitor.instance) {
      LatencyMonitor.instance = new LatencyMonitor();
    }
    return LatencyMonitor.instance;
  }
  
  private async measureLatency(): Promise<number> {
    const start = performance.now();
    try {
      await fetch('/api/ping');
      return performance.now() - start;
    } catch {
      return -1;
    }
  }
  
  private startMonitoring() {
    setInterval(async () => {
      const latency = await this.measureLatency();
      if (latency === -1) return;
      
      this.latencyHistory.push(latency);
      if (this.latencyHistory.length > 10) {
        this.latencyHistory.shift();
      }
      
      const avgLatency = this.getAverageLatency();
      if (Math.abs(latency - avgLatency) > 100) {
        this.changes++;
      }
      
      this.lastCheck = Date.now();
    }, 30000);
  }
  
  getAverageLatency(): number {
    if (this.latencyHistory.length === 0) return 0;
    return this.latencyHistory.reduce((a, b) => a + b) / this.latencyHistory.length;
  }
  
  getMetrics() {
    return {
      current: this.latencyHistory[this.latencyHistory.length - 1] || 0,
      average: this.getAverageLatency(),
      changes: this.changes,
      lastCheck: this.lastCheck
    };
  }
}

/**
 * Gets detailed network information
 */
export const getNetworkInfo = async (): Promise<NetworkInfo> => {
  const connection = navigator.connection || ({} as any);
  
  return {
    webrtcIPs: await detectRealIPs(),
    dnsLeakDetected: false, // Implement DNS leak detection if needed
    locationConsistency: await checkLocationConsistency(),
    connection: {
      type: connection.type,
      downlink: connection.downlink,
      rtt: connection.rtt,
      effectiveType: connection.effectiveType
    },
    latencyPattern: LatencyMonitor.getInstance().getMetrics()
  };
};

/**
 * Analyzes collected data for security flags
 */
export const analyzeSecurityFlags = (networkInfo: NetworkInfo): SecurityFlags => {
  const flags: SecurityFlags = {
    vpnDetected: false,
    proxyDetected: false,
    torDetected: false,
    virtualizationDetected: false,
    reasons: []
  };
  
  // Check for VPN/Proxy indicators
  if (!networkInfo.locationConsistency.consistent) {
    flags.vpnDetected = true;
    flags.reasons.push('Timezone mismatch detected');
  }
  
  if (networkInfo.latencyPattern.changes > 3) {
    flags.vpnDetected = true;
    flags.reasons.push('Unusual latency pattern changes');
  }
  
  // Check for multiple IPs
  if (networkInfo.webrtcIPs.length > 1) {
    flags.proxyDetected = true;
    flags.reasons.push('Multiple IP addresses detected via WebRTC');
  }
  
  return flags;
};

/**
 * Main tracking function that collects and analyzes all data
 */
export const trackEvasionAttempts = async () => {
  const networkInfo = await getNetworkInfo();
  const securityFlags = analyzeSecurityFlags(networkInfo);
  
  // Return comprehensive tracking data
  return {
    timestamp: Date.now(),
    networkInfo,
    securityFlags,
    raw: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      vendor: navigator.vendor,
      languages: navigator.languages,
      deviceMemory: (navigator as any).deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      screenResolution: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      }
    }
  };
};
