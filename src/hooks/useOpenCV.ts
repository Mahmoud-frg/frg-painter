// src/hooks/useOpenCV.ts
import { useEffect, useState } from 'react';

export default function useOpenCV() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Avoid reloading if already available
    if ((window as any).cv && (window as any).cv.Mat) {
      console.log('✅ OpenCV already loaded');
      setIsLoaded(true);
      return;
    }

    const existingScript = document.querySelector(
      'script[src="/libs/opencv.js"]'
    );
    if (existingScript) {
      console.log('🟡 OpenCV script tag already exists');
      return;
    }

    const script = document.createElement('script');
    script.src = '/libs/opencv.js';
    script.async = true;

    script.onload = () => {
      console.log('📥 OpenCV script loaded');

      const waitForInit = () => {
        const cv = (window as any).cv;
        if (cv && cv.Mat && cv.getBuildInformation) {
          console.log('✅ OpenCV fully initialized');
          setIsLoaded(true);
        } else {
          console.log('⏳ Waiting for OpenCV...');
          setTimeout(waitForInit, 50);
        }
      };

      waitForInit();
    };

    script.onerror = () => {
      console.error('❌ Failed to load OpenCV.js');
    };

    document.body.appendChild(script);
  }, []);

  return isLoaded;
}
