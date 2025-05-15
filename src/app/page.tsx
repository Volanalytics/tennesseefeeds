'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { generateEnhancedFingerprint, validateFingerprint } from '@/utils/fingerprint';
import { trackEvent, trackCustomEvent } from '@/utils/tracking';

export default function Home() {
  const [fingerprint, setFingerprint] = useState<string>('');
  const [clickCount, setClickCount] = useState(0);

  useEffect(() => {
    const initializeFingerprint = async () => {
      const fp = await generateEnhancedFingerprint();
      setFingerprint(fp);
      // Track page view
      trackEvent('pageview', '/');
    };

    initializeFingerprint();
  }, []);

  const handleTestClick = async () => {
    setClickCount(prev => prev + 1);
    await trackCustomEvent('/', 'interaction', 'test_button_click', {
      clickCount: clickCount + 1
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.querySelector('input') as HTMLInputElement;
    
    await trackEvent('form_submit', '/', {
      id: 'test-form',
      text: input.value
    });

    alert('Form submitted! Your interaction has been tracked.');
    input.value = '';
  };

  return (
    <main className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Tennessee Feeds</h1>
        
        <Card className="w-full">
          <CardHeader>
            <h2 className="text-2xl font-semibold">Tracking Information</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Your Fingerprint:</p>
              <p className="font-mono text-sm bg-muted p-2 rounded-md break-all">{fingerprint}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Test Interaction Tracking:</p>
              <button
                onClick={handleTestClick}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
                id="test-button"
              >
                Click me! ({clickCount} clicks)
              </button>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Test Form Submission:</p>
              <form 
                onSubmit={handleFormSubmit}
                className="space-y-2"
                id="test-form"
              >
                <input 
                  type="text" 
                  placeholder="Type something..."
                  className="w-full px-3 py-2 border rounded-md"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Submit Form
                </button>
              </form>
            </div>
            <p className="text-sm text-muted-foreground">
              This unique identifier helps us improve your experience while maintaining privacy.
              We use advanced browser fingerprinting techniques to ensure accuracy.
            </p>
          </CardContent>
          <CardFooter className="border-t pt-6">
            <p className="text-xs text-muted-foreground">
              Your data is securely stored and never shared with third parties.
              Analytics dashboard access is restricted to authenticated administrators only.
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
