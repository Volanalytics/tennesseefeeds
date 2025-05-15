'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { trackEvent, trackError, trackPerformance } from '@/utils/tracking';
import { trackEvasionAttempts } from '@/utils/advanced-tracking';

export function TrackingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  useEffect(() => {
    const setupTracking = async () => {
      try {
        // Track page view and check for evasion attempts
        const [pageViewEvent, evasionData] = await Promise.all([
          trackEvent('pageview', pathname),
          trackEvasionAttempts()
        ]);

        // If evasion attempts detected, track them
        if (evasionData.securityFlags.vpnDetected || 
            evasionData.securityFlags.proxyDetected || 
            evasionData.securityFlags.torDetected) {
          await trackEvent('security', pathname, undefined, {
            evasionAttempt: true,
            flags: evasionData.securityFlags,
            networkInfo: evasionData.networkInfo
          });
        }

        // Track performance metrics after page load
        window.addEventListener('load', () => {
          trackPerformance(pathname);
        });

        // Set up click tracking
        const handleClick = async (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          const closestLink = target.closest('a');
          const closestButton = target.closest('button');
          const element = closestLink || closestButton || target;

          await trackEvent('click', pathname, {
            id: element.id,
            className: element.className,
            text: element.textContent?.slice(0, 100),
            tag: element.tagName.toLowerCase(),
            href: closestLink?.href,
            path: getElementPath(element)
          });
        };

        // Set up form submission tracking
        const handleSubmit = async (e: SubmitEvent) => {
          const form = e.target as HTMLFormElement;
          await trackEvent('form_submit', pathname, {
            id: form.id,
            className: form.className,
            path: getElementPath(form)
          });
        };

        // Set up error tracking
        const handleError = async (e: ErrorEvent) => {
          await trackError(e.error, pathname);
        };

        // Set up unhandled rejection tracking
        const handleUnhandledRejection = async (e: PromiseRejectionEvent) => {
          const error = e.reason instanceof Error ? e.reason : new Error(String(e.reason));
          await trackError(error, pathname);
        };

        // Add event listeners
        document.addEventListener('click', handleClick);
        document.addEventListener('submit', handleSubmit, true);
        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        // Cleanup
        return () => {
          document.removeEventListener('click', handleClick);
          document.removeEventListener('submit', handleSubmit, true);
          window.removeEventListener('error', handleError);
          window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
      } catch (error) {
        console.error('Error setting up tracking:', error);
      }
    };

    setupTracking();
  }, [pathname]);

  return <>{children}</>;
}

/**
 * Gets the CSS selector path for an element
 */
function getElementPath(element: Element): string {
  const path: string[] = [];
  let current: Element | null = element;

  while (current && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase();
    
    if (current.id) {
      selector += `#${current.id}`;
      path.unshift(selector);
      break;
    } else {
      const parent = current.parentElement;
      if (!parent) break;

      const siblings = Array.from(parent.children);
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }
    
    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}
