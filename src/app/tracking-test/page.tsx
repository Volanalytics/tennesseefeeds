'use client';

import { useEffect, useState } from 'react';
import { trackEvasionAttempts } from '@/utils/advanced-tracking';

export default function TrackingTestPage() {
  const [trackingData, setTrackingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getTrackingData = async () => {
      try {
        const data = await trackEvasionAttempts();
        setTrackingData(data);
      } catch (error) {
        console.error('Error getting tracking data:', error);
      } finally {
        setLoading(false);
      }
    };

    getTrackingData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <h1 className="text-2xl font-bold mb-4">Loading tracking data...</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Tracking Test Results</h1>
      
      {trackingData?.securityFlags?.vpnDetected && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          VPN Usage Detected
        </div>
      )}

      {trackingData?.securityFlags?.proxyDetected && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Proxy Usage Detected
        </div>
      )}

      <div className="space-y-6">
        <section className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">Network Information</h2>
          <div className="space-y-2">
            <p><strong>WebRTC IPs:</strong> {trackingData?.networkInfo?.webrtcIPs?.join(', ') || 'None detected'}</p>
            <p><strong>Location Consistency:</strong> {trackingData?.networkInfo?.locationConsistency?.consistent ? 'Consistent' : 'Inconsistent'}</p>
            <p><strong>Browser Timezone:</strong> {trackingData?.networkInfo?.locationConsistency?.browserTimezone}</p>
            <p><strong>IP Timezone:</strong> {trackingData?.networkInfo?.locationConsistency?.ipTimezone || 'Unknown'}</p>
          </div>
        </section>

        <section className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">Connection Details</h2>
          <div className="space-y-2">
            <p><strong>Type:</strong> {trackingData?.networkInfo?.connection?.type || 'Unknown'}</p>
            <p><strong>Downlink:</strong> {trackingData?.networkInfo?.connection?.downlink || 'Unknown'} Mbps</p>
            <p><strong>RTT:</strong> {trackingData?.networkInfo?.connection?.rtt || 'Unknown'} ms</p>
            <p><strong>Effective Type:</strong> {trackingData?.networkInfo?.connection?.effectiveType || 'Unknown'}</p>
          </div>
        </section>

        <section className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">Latency Pattern</h2>
          <div className="space-y-2">
            <p><strong>Current:</strong> {trackingData?.networkInfo?.latencyPattern?.current || 0} ms</p>
            <p><strong>Average:</strong> {trackingData?.networkInfo?.latencyPattern?.average || 0} ms</p>
            <p><strong>Pattern Changes:</strong> {trackingData?.networkInfo?.latencyPattern?.changes || 0}</p>
            <p><strong>Last Check:</strong> {trackingData?.networkInfo?.latencyPattern?.lastCheck ? 
              new Date(trackingData.networkInfo.latencyPattern.lastCheck).toLocaleString() : 'Never'}</p>
          </div>
        </section>

        <section className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">System Information</h2>
          <div className="space-y-2">
            <p><strong>User Agent:</strong> {trackingData?.raw?.userAgent}</p>
            <p><strong>Platform:</strong> {trackingData?.raw?.platform}</p>
            <p><strong>Vendor:</strong> {trackingData?.raw?.vendor}</p>
            <p><strong>Languages:</strong> {trackingData?.raw?.languages?.join(', ')}</p>
            <p><strong>Device Memory:</strong> {trackingData?.raw?.deviceMemory || 'Unknown'} GB</p>
            <p><strong>Hardware Concurrency:</strong> {trackingData?.raw?.hardwareConcurrency} threads</p>
            <p><strong>Screen Resolution:</strong> {trackingData?.raw?.screenResolution?.width}x{trackingData?.raw?.screenResolution?.height}</p>
            <p><strong>Color Depth:</strong> {trackingData?.raw?.screenResolution?.colorDepth} bits</p>
          </div>
        </section>
      </div>
    </div>
  );
}
