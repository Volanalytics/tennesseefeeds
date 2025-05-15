interface NetworkInformation {
  readonly downlink: number;
  readonly effectiveType: string;
  readonly rtt: number;
  readonly saveData: boolean;
  readonly type: ConnectionType;
  onchange: EventListener;
}

type ConnectionType = 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown';

interface Navigator {
  connection?: NetworkInformation;
}
