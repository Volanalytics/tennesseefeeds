/**
 * Creates a hash of a string using SHA-256
 */
export const hashString = async (str: string): Promise<string> => {
  try {
    // Convert string to buffer
    const buffer = new TextEncoder().encode(str);
    
    // Generate hash using Web Crypto API
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    
    // Convert hash to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return hashHex;
  } catch (error) {
    // Fallback to simple hash if Web Crypto API is not available
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
};

/**
 * Creates a quick hash for non-cryptographic purposes
 */
export const quickHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

/**
 * Compares two hashes securely (constant time comparison)
 */
export const compareHashes = (hash1: string, hash2: string): boolean => {
  if (hash1.length !== hash2.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < hash1.length; i++) {
    result |= hash1.charCodeAt(i) ^ hash2.charCodeAt(i);
  }
  return result === 0;
};
