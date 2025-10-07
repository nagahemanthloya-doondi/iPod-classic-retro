
import React, { useEffect, useRef, useState } from 'react';
import { J2MEApp } from '../types';

declare global {
  interface Window {
    J2ME: any; // Assuming the library exposes a J2ME object
  }
}

interface J2MERunnerProps {
  app: J2MEApp | null;
}

const J2MERunner: React.FC<J2MERunnerProps> = ({ app }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState('loading'); // loading, error, ready

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !app) return;
    
    // Standard J2ME resolution
    canvas.width = 240;
    canvas.height = 320;

    const timer = setTimeout(() => {
        if (!window.J2ME) {
            setStatus('error');
        } else {
            // Fictional emulator integration
            // A real implementation would fetch the blob from the app.url
            fetch(app.url)
                .then(res => res.blob())
                .then(jarBlob => {
                   window.J2ME.run({
                     canvas,
                     jar: jarBlob,
                   });
                   setStatus('ready');
                }).catch(e => {
                    console.error("Failed to run J2ME app:", e);
                    setStatus('error');
                });
        }
    }, 1500); // Simulate loading time

    return () => clearTimeout(timer);
  }, [app]);

  if (!app) {
    return <div className="flex-grow flex items-center justify-center text-gray-500">No App Selected</div>;
  }
  
  if (status === 'loading') {
    return (
        <div className="w-full h-full bg-black text-white flex flex-col items-center justify-center p-4 text-center">
            <p className="mb-4 text-lg">Loading</p>
            <p className="font-bold mb-4 truncate">{app.name}</p>
            <div className="w-3/4 bg-gray-700 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full w-full animate-pulse"></div>
            </div>
        </div>
    )
  }

  if (status === 'error') {
     return (
        <div className="w-full h-full bg-black text-white flex flex-col items-center justify-center p-4 text-center">
            <h3 className="font-bold text-lg mb-2">Emulator Not Found</h3>
            <p className="text-sm mb-4">The J2ME emulator library could not be loaded.</p>
            <p className="text-xs text-gray-400">This feature requires a JavaScript-based J2ME emulator to run <span className="font-mono">.jar</span> files. The UI is ready for integration.</p>
        </div>
     )
  }

  return (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <canvas ref={canvasRef} style={{ imageRendering: 'pixelated', width: 'auto', height: '100%' }} />
    </div>
  );
};

export default J2MERunner;
