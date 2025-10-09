
import React, { useState, forwardRef, useImperativeHandle, useRef, useEffect, useCallback } from 'react';
import { ScreenView, Song, Photo, Video, MenuItem, BatteryState, NowPlayingMedia, J2MEApp, Theme, FILTERS, CameraFilter, FmChannel } from '../types';
import StatusBar from './StatusBar';
import MenuList, { CustomMenuItem } from './MenuList';
import NowPlaying from './NowPlaying';
import CoverFlow from './CoverFlow';
import VideoPlayer from './VideoPlayer';
import AddYoutubeVideo from './AddYoutubeVideo';
import AddFmChannel from './AddFmChannel';
import Games from './Games';
import BrickBreaker from './games/BrickBreaker';
import Snake from './games/Snake';
import J2MERunner from './J2MERunner';
import { BrickBreakerRef, SnakeRef, CameraRef } from '../App';
import { MUSIC_ICON_SVG } from '../lib/constants';

interface ScreenProps {
  currentScreen: ScreenView;
  activeIndex: number;
  setActiveIndex: (index: number | ((prev: number) => number)) => void;
  navigateTo: (screen: ScreenView) => void;
  goBack: () => void;
  onNext: () => void;
  onSelect: (selectedId?: any) => void;
  songs: Song[];
  photos: Photo[];
  videos: Video[];
  iptvLinks: Video[];
  allVideos: Video[];
  j2meApps: J2MEApp[];
  fmChannels: FmChannel[];
  onAddYoutubeVideo: (video: Video) => void;
  onAddIptvLink: (video: Video) => void;
  onAddOnlineVideo: (video: Video) => void;
  onAddFmChannel: (channel: FmChannel) => void;
  onAddPhoto: (photoData: { id: string, name: string, file: File }) => void;
  handleClearSongs: () => void;
  handleClearPhotos: () => void;
  handleClearVideos: () => void;
  handleClearIptvLinks: () => void;
  handleClearJ2meApps: () => void;
  handleClearFmChannels: () => void;
  playSong: (index: number) => void;
  playVideo: (index: number) => void;
  playFmChannel: (index: number) => void;
  handleNavigateToNowPlaying: () => void;
  nowPlayingMedia: NowPlayingMedia | null;
  nowPlayingSong?: Song;
  nowPlayingFmChannel?: FmChannel;
  isPlaying: boolean;
  setIsPlaying: (isPlaying: boolean) => void;
  progress: number;
  duration: number;
  navigationStack: ScreenView[];
  musicInputRef: React.RefObject<HTMLInputElement>;
  photoInputRef: React.RefObject<HTMLInputElement>;
  videoInputRef: React.RefObject<HTMLInputElement>;
  j2meInputRef: React.RefObject<HTMLInputElement>;
  videoRef: React.RefObject<HTMLVideoElement>;
  setYtPlayer: (player: any) => void;
  battery: BatteryState;
  brickBreakerRef: React.RefObject<BrickBreakerRef>;
  snakeRef: React.RefObject<SnakeRef>;
  cameraRef: React.RefObject<CameraRef>;
  runningApp: J2MEApp | null;
  setRunningApp: (app: J2MEApp | null) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error('Could not parse mime type from data URL');
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

const Camera = forwardRef<CameraRef, {
  onAddPhoto: (photoData: { id: string, name: string, file: File }) => void;
  activeIndex: number;
}>(({ onAddPhoto, activeIndex }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement>(null);
  const switchAudioRef = useRef<HTMLAudioElement>(null);
  const animationFrameIdRef = useRef<number>();
  const overlayImageCache = useRef<Record<string, HTMLImageElement>>({});
  const [error, setError] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isSwitching, setIsSwitching] = useState(false);
  
  const activeFilter = FILTERS[activeIndex % FILTERS.length];

  useEffect(() => {
    // Preload all overlay images
    FILTERS.forEach(filter => {
      if (filter.overlay && !overlayImageCache.current[filter.name]) {
        const img = new Image();
        img.src = filter.overlay;
        img.onload = () => {
          overlayImageCache.current[filter.name] = img;
        };
      }
    });
  }, []);

  useEffect(() => {
    // Play a subtle click sound when changing filters.
    if (clickAudioRef.current) {
        clickAudioRef.current.currentTime = 0;
        // Fix: Use an empty arrow function for the catch handler to resolve the "Expected 1 arguments, but got 0" error, as it's a valid way to handle promise rejections without using the error object.
        clickAudioRef.current.play().catch(() => {});
    }
  }, [activeIndex]);

  useEffect(() => {
    const setupCamera = async () => {
      setIsReady(false);
      setError(null);
      try {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
              // Bug fix: Explicitly play the video to ensure the stream starts rendering.
              videoRef.current?.play().catch(e => console.error("Camera video play failed:", e));
              setIsReady(true);
              setIsSwitching(false);
          };
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setError(`Camera (${facingMode}) not available or access denied.`);
        setIsSwitching(false);
      }
    };
    setupCamera();

    return () => {
      // Important: Stop the camera stream when the component unmounts.
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [facingMode]);

  const drawVideoToCanvas = useCallback(() => {
    // Bug fix: Check for readyState >= 3 for more reliable frame drawing.
    if (videoRef.current && canvasRef.current && videoRef.current.readyState >= 3) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Match canvas dimensions to video to avoid distortion
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        ctx.filter = activeFilter.css;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Draw overlay if it's loaded
        const overlayImg = overlayImageCache.current[activeFilter.name];
        if (overlayImg && overlayImg.complete) {
            ctx.globalAlpha = activeFilter.name === 'Newspaper' ? 0.4 : 0.2;
            ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1.0;
        }
      }
    }
    animationFrameIdRef.current = requestAnimationFrame(drawVideoToCanvas);
  }, [activeFilter]);
  
  useEffect(() => {
      if (!isReady) return;
      animationFrameIdRef.current = requestAnimationFrame(drawVideoToCanvas);
      return () => {
          if (animationFrameIdRef.current) {
              cancelAnimationFrame(animationFrameIdRef.current)
          };
      }
  }, [drawVideoToCanvas, isReady]);

  useImperativeHandle(ref, () => ({
    capture: () => {
      const video = videoRef.current;
      if (!video || !isReady) return;
      
      // Simulate camera flash
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 200);

      if (clickAudioRef.current) {
        clickAudioRef.current.currentTime = 0;
        clickAudioRef.current.play().catch(e => {});
      }

      // Create a temporary canvas to save an un-mirrored image
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = video.videoWidth;
      tempCanvas.height = video.videoHeight;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;
      
      ctx.filter = activeFilter.css;
      ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

      // Draw overlay if it exists
      const overlayImg = overlayImageCache.current[activeFilter.name];
      if (overlayImg && overlayImg.complete) {
          ctx.globalAlpha = activeFilter.name === 'Newspaper' ? 0.4 : 0.2;
          ctx.drawImage(overlayImg, 0, 0, tempCanvas.width, tempCanvas.height);
          ctx.globalAlpha = 1.0;
      }
      
      // Draw vignette if it exists
      if (activeFilter.vignette) {
          const gradient = ctx.createRadialGradient(
              tempCanvas.width / 2, tempCanvas.height / 2, tempCanvas.height / 3,
              tempCanvas.width / 2, tempCanvas.height / 2, tempCanvas.width / 1.5
          );
          gradient.addColorStop(0, 'rgba(0,0,0,0)');
          gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      }

      const dataUrl = tempCanvas.toDataURL('image/jpeg');
      const filename = `iPod-Photo-${new Date().toISOString()}.jpg`;
      const file = dataURLtoFile(dataUrl, filename);
      const photoData = { id: filename, name: filename, file };
      onAddPhoto(photoData);
    },
    switchCamera: () => {
        if (isSwitching) return;
        
        // Feature: Play switch sound on camera flip.
        if (switchAudioRef.current) {
            switchAudioRef.current.currentTime = 0;
            switchAudioRef.current.play().catch(e => {});
        }

        setIsSwitching(true);
        setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
    }
  }));
  
  const canvasStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'none', // Removed mirroring for front camera preview per user request.
    transition: 'opacity 0.3s ease-in-out',
    opacity: isReady && !isSwitching ? 1 : 0,
  };

  const cameraModeText = facingMode === 'user' ? 'Front' : 'Back';

  return (
    <div className="w-full h-full flex flex-col bg-black">
      <StatusBar title="Camera" battery={{ level: 1, charging: false, supported: false }} />
      <div className="flex-grow relative overflow-hidden rounded-b-md">
        {isFlashing && <div className="absolute inset-0 bg-white z-20 animate-flash" />}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-4 bg-black">
            <p className="font-bold text-red-500 mb-2">Camera Error</p>
            <p className="text-xs">{error}</p>
          </div>
        )}
        {(!isReady || isSwitching) && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm bg-black">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading Camera...
            </div>
        )}
        {activeFilter.isVhs && <div className="absolute inset-0 vhs-overlay z-10" />}
        
        <video ref={videoRef} autoPlay playsInline muted className="hidden"></video>
        <canvas ref={canvasRef} style={canvasStyle}></canvas>
        {activeFilter.vignette && <div className="absolute inset-0 pointer-events-none" style={{boxShadow: 'inset 0 0 5rem rgba(0,0,0,0.6)'}} />}
        
        <audio ref={clickAudioRef} src="data:audio/mpeg;base64,SUQzBAAAAAAAI1RTSEUAAAAbAAADN1e/oEIABAAAAAAAUVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV-AAAAAGGgYAAAAAAAAAAAAAAAAAAP/V/Jqanb69iDSm40iK40kOKmB4qUExqYLGjA8aMDhpgegJCAmaFjRoZIAEwwWNGB40YHiwgKADBkwPDDB4wJDgAQOGBwwYMjxowPCgAUOGBw4cMDxwYMjwwAEjA4ZGDgAZMjhoZIAEwwOGDCApMMDgoAHDA4YMD0xwYKDgwIHDgwcOGSA0eICg4AEjA4YHDxgyQGDgAaQDBiQpHBggNEjwYADSAQMGBw0YJDRoANIBgwMGDSAZGCDA8KAAGbAAyADhQSMDBgANEgAZQHCgAYMGB1AMHCApQGAgARkCgAEGAwYEIA0eDJAgGGAwYACkAwYEIA0YADBggIABgwYMDxgwQJDgAaQDBgwYQDogwPDgAQMDhoMGMgAYQGAAyADhQYMIDgAYMDwYMDxggMDBgYMjA4AGDAA8QJDwwICgAQMGCBAeHCA0YACAAYIGDRggQMDwgAEDgAcIPHggJGigAYMIDhgYJBAAJDQwAMgAwcIDQ4QGCA0YAGAAyAEGCRggAGCAYADBggJDgAcMPCAYYECAAAMGCBAQGGDAYMABgwQEDBggQGgA4QABggQGggYQGDAACDA8QGBAYMABgwMCDA8QDBgAAOBggQECBAQMGCBAeIMDAAMEDBAYYABgYGEBg0AGCAwYIEBgYYAgwwAAAwYDBgAcMGCAwQIABA4AGDA8YQGAAYQGCAwQGDRggMAAA4AHCAwQIQAAYQGAAYMDBgAEBgAIQAhgAAGAA4cCAAQMGCAgYMDwYQGAAYQGCAA4AQAAYAEBggADDgAMAABgAAGAAwAABAAYYMDwYAGAAwAADAAYAGCAYYADAAYYAGAAwQECAAwAAAAQMCAAwAAGAwYAGAAwPBAAAGAAwAADBAYYDAAYAECAAwPDBAAMAABgAEBgAcEAgwADgAYAGEBwQMCAAwAECAwAAEAAYYDAAYAGAAAEBgwYIABgYQGAAYACAQIQAAYAECAwAAAGAAwYGEBgAAHDAAYYAAAYQGAAYMDxAQMGCAgQDBgAAAAAABgAAAAAAGAAwAAGAwYEAAAAYAEBAQAAAAYADBAAGAAwYAAAwPBAAYAAAAYYADAAAECAAEBgAECAAwAAABgYAGAAYAEAAYADDAwPBAAAGAAwQAAAAAYYAAAAAGAAwQAAABgAAABgQADgAYADBAAAAAAcADgAYAAAAAABgAAAABgAAABgAAAAAAABgAAABgAGAAAAAABAQMAAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD//3AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJABMAEQAAAAAABn/n/u/gAAAABJRU5ErkJggg=="></audio>
        <audio ref={switchAudioRef} src="data:audio/mpeg;base64,SUQzBAAAAAAAI1RTSEUAAAAbAAADN1e/oEIABAAAAAAAUVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV-AAAAAFlvgYAAAAAAAAAAAAAAAAAAP/V/JgAFu8OAAAABQAB" />
      </div>

      <div className="bg-gray-800 text-white p-1 text-center font-bold text-sm flex-shrink-0 flex justify-between items-center">
        <span>{cameraModeText}</span>
        <span className="truncate">{activeFilter.name}</span>
        <span className="w-12 text-right"></span>
      </div>
    </div>
  );
});

const MENU_ICONS = [
  // Music
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="#a4accc"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`,
  // Photos
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="#a4accc"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>`,
  // Videos
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="#a4accc"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>`,
  // Extras
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="#a4accc"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`,
  // Settings
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="#a4accc"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l-.38-2.65c.61-.25 1.17-.59-1.69-.98l2.49 1c.23.09.49 0 .61.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>`,
  // Shuffle Songs
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="#a4accc"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>`
];

const Screen: React.FC<ScreenProps> = (props) => {
    const { currentScreen, activeIndex, setActiveIndex, onSelect, songs, photos, videos, j2meApps, nowPlayingMedia, playSong, theme, setTheme, iptvLinks } = props;

    const renderContent = () => {
        switch (currentScreen) {
            case ScreenView.MAIN_MENU: {
                const menuItems: MenuItem[] = [
                    { id: ScreenView.MUSIC, name: 'Music' },
                    { id: ScreenView.PHOTOS, name: 'Photos' },
                    { id: ScreenView.VIDEOS, name: 'Videos' },
                    { id: ScreenView.EXTRAS, name: 'Extras' },
                    { id: ScreenView.SETTINGS, name: 'Settings' },
                    { id: ScreenView.SHUFFLE_PLAY, name: 'Shuffle Songs' },
                ];
                return (
                    <>
                        <StatusBar title="Menu" battery={props.battery} />
                        <div className="flex-grow flex flex-row overflow-hidden">
                            <div className="w-1/2">
                                <MenuList items={menuItems} activeIndex={activeIndex} setActiveIndex={setActiveIndex as any} onSelect={onSelect} />
                            </div>
                            <div className="w-1/2 flex items-center justify-center p-4" style={{ backgroundColor: 'var(--screen-bg)' }}>
                                <div 
                                    className="w-32 h-32 bg-gray-100 flex items-center justify-center rounded-lg shadow-lg border border-gray-300"
                                    dangerouslySetInnerHTML={{ __html: MENU_ICONS[activeIndex] || '' }}
                                />
                            </div>
                        </div>
                    </>
                );
            }
            case ScreenView.MUSIC: {
                 if(props.navigationStack[props.navigationStack.length - 2] === ScreenView.MAIN_MENU) {
                     const menuItems: MenuItem[] = [
                        { id: ScreenView.COVER_FLOW, name: 'Cover Flow' },
                        { id: ScreenView.MUSIC, name: 'All Songs' },
                        { id: ScreenView.FM_RADIO, name: 'FM Radio' },
                        { id: ScreenView.ACTION, name: 'Add Music' },
                    ];
                     return (
                         <>
                             <StatusBar title="Music" battery={props.battery} />
                             <MenuList items={menuItems} activeIndex={activeIndex} setActiveIndex={setActiveIndex as any} onSelect={onSelect} />
                         </>
                     );
                 }
                 // Fallthrough to show all songs
            }
            // eslint-disable-next-line no-fallthrough
            case 99 as ScreenView: { // Special ID for "All Songs" list
                const menuItems: CustomMenuItem[] = songs.map((song, index) => ({
                    id: index,
                    name: song.name,
                    subtext: `${song.artist} - ${song.album}`,
                    thumbnail: song.picture || MUSIC_ICON_SVG,
                }));

                if (songs.length > 0) {
                    menuItems.push({ id: 'clear', name: 'Clear All Songs', subtext: 'Deletes all songs from the iPod' });
                }

                return (
                    <>
                        <StatusBar title="All Songs" battery={props.battery} />
                        {songs.length > 0 ? (
                            <MenuList items={menuItems} activeIndex={activeIndex} setActiveIndex={setActiveIndex as any} onSelect={onSelect} />
                        ) : (
                            <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
                                <p className="font-bold mb-2">No Music</p>
                                <p className="text-sm">Use the 'Add Music' option to add songs.</p>
                            </div>
                        )}
                    </>
                )
            }
            case ScreenView.FM_RADIO: {
                const menuItems: CustomMenuItem[] = [
                    { id: 'add', name: 'Add FM Channel' },
                    ...props.fmChannels.map((channel, index) => ({
                        id: index,
                        name: channel.name,
                        subtext: 'FM Stream'
                    })),
                ];
                if (props.fmChannels.length > 0) {
                     menuItems.push({ id: 'clear', name: 'Clear All Channels' });
                }
                return (
                    <>
                        <StatusBar title="FM Radio" battery={props.battery} />
                        <MenuList items={menuItems} activeIndex={activeIndex} setActiveIndex={setActiveIndex as any} onSelect={onSelect} />
                    </>
                )
            }
            case ScreenView.ADD_FM_CHANNEL:
                return <AddFmChannel onAddFmChannel={props.onAddFmChannel} goBack={props.goBack} />;
            case ScreenView.PHOTOS: {
                const menuItems: CustomMenuItem[] = [
                    { id: ScreenView.PHOTO_VIEWER, name: 'View Photos' },
                    { id: 'add', name: 'Add Photos' },
                ];
                if (photos.length > 0) {
                    menuItems.push({ id: 'clear', name: 'Clear Photos' });
                }
                return (
                    <>
                        <StatusBar title="Photos" battery={props.battery} />
                        <MenuList items={menuItems} activeIndex={activeIndex} setActiveIndex={setActiveIndex as any} onSelect={onSelect} />
                    </>
                );
            }
            case ScreenView.PHOTO_VIEWER: {
                const photo = photos[activeIndex];
                return (
                    <div className="w-full h-full bg-black flex flex-col">
                         <StatusBar title={photo ? photo.name : "Photos"} battery={props.battery} />
                         <div className="flex-grow flex items-center justify-center overflow-hidden">
                             {photo ? (
                                <img src={photo.url} alt={photo.name} className="max-w-full max-h-full object-contain" />
                             ) : (
                                <p className="text-white">No photos found.</p>
                             )}
                         </div>
                    </div>
                );
            }
            case ScreenView.VIDEOS: {
                 const menuItems: MenuItem[] = [
                    { id: ScreenView.VIDEO_LIST, name: 'View Videos' },
                    { id: ScreenView.LIVE_TV, name: 'Live TV' },
                    { id: ScreenView.ACTION, name: 'Add Videos' },
                    { id: ScreenView.ADD_YOUTUBE_VIDEO, name: 'Add YouTube Link' },
                    { id: ScreenView.ADD_IPTV_LINK, name: 'Add IPTV Link' },
                    { id: ScreenView.ADD_ONLINE_VIDEO, name: 'Add Online Video' },
                ];
                return (
                    <>
                        <StatusBar title="Videos" battery={props.battery} />
                        <MenuList items={menuItems} activeIndex={activeIndex} setActiveIndex={setActiveIndex as any} onSelect={onSelect} />
                    </>
                );
            }
            case ScreenView.VIDEO_LIST: {
                const menuItems: CustomMenuItem[] = videos.map((video, index) => ({
                    id: index,
                    name: video.name,
                    subtext: video.isYoutube ? 'YouTube' : (video.isOnlineVideo ? 'Online Video' : 'Local File'),
                }));
                if (videos.length > 0) {
                     menuItems.push({ id: 'clear', name: 'Clear All Videos' });
                }
                return (
                     <>
                        <StatusBar title="All Videos" battery={props.battery} />
                        {videos.length > 0 ? (
                           <MenuList items={menuItems} activeIndex={activeIndex} setActiveIndex={setActiveIndex as any} onSelect={onSelect} />
                        ) : (
                            <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
                                <p className="font-bold mb-2">No Videos</p>
                                <p className="text-sm">Use the options in the previous menu to add videos.</p>
                            </div>
                        )}
                     </>
                )
            }
            case ScreenView.LIVE_TV: {
                const menuItems: CustomMenuItem[] = iptvLinks.map((video, index) => ({
                    id: index,
                    name: video.name,
                    subtext: "IPTV Stream"
                }));
                if (iptvLinks.length > 0) {
                    menuItems.push({ id: 'clear', name: 'Clear IPTV Links' });
                }
                 return (
                     <>
                        <StatusBar title="Live TV" battery={props.battery} />
                        {iptvLinks.length > 0 ? (
                            <MenuList items={menuItems} activeIndex={activeIndex} setActiveIndex={setActiveIndex as any} onSelect={onSelect} />
                        ) : (
                             <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
                                <p className="font-bold mb-2">No IPTV Links</p>
                                <p className="text-sm">Add IPTV links from the Videos menu.</p>
                            </div>
                        )}
                     </>
                 );
            }
            case ScreenView.ADD_YOUTUBE_VIDEO:
                return <AddYoutubeVideo onAddVideo={props.onAddYoutubeVideo} goBack={props.goBack} />;
            case ScreenView.ADD_IPTV_LINK:
                 // Fix: Access AddIptvLink as a property of AddYoutubeVideo.
                 return <AddYoutubeVideo.AddIptvLink onAddVideo={props.onAddIptvLink} goBack={props.goBack} />;
            case ScreenView.ADD_ONLINE_VIDEO:
                // Fix: Access AddOnlineVideo as a property of AddYoutubeVideo.
                return <AddYoutubeVideo.AddOnlineVideo onAddVideo={props.onAddOnlineVideo} goBack={props.goBack} />;
            case ScreenView.EXTRAS: {
                const menuItems: MenuItem[] = [
                    { id: ScreenView.GAMES, name: 'Games' },
                    { id: ScreenView.APPS, name: 'Apps' },
                    { id: ScreenView.CAMERA, name: 'Camera' },
                ];
                return (
                    <>
                        <StatusBar title="Extras" battery={props.battery} />
                        <MenuList items={menuItems} activeIndex={activeIndex} setActiveIndex={setActiveIndex as any} onSelect={onSelect} />
                    </>
                );
            }
            case ScreenView.GAMES:
                return (
                    <>
                        <StatusBar title="Games" battery={props.battery} />
                        <Games activeIndex={activeIndex} setActiveIndex={setActiveIndex as any} onSelect={onSelect} />
                    </>
                );
            case ScreenView.APPS: {
                const menuItems: CustomMenuItem[] = [
                    { id: 'add', name: 'Add App (.jar)' },
                    ...j2meApps.map((app) => ({
                        id: app.id,
                        name: app.name,
                        subtext: 'J2ME Application'
                    })),
                ];
                if (j2meApps.length > 0) {
                     menuItems.push({ id: 'clear', name: 'Clear All Apps' });
                }
                return (
                    <>
                        <StatusBar title="Apps" battery={props.battery} />
                        <MenuList items={menuItems} activeIndex={activeIndex} setActiveIndex={setActiveIndex as any} onSelect={(id) => {
                            if (id === 'add') {
                                props.j2meInputRef.current?.click();
                            } else if (id === 'clear') {
                                props.handleClearJ2meApps();
                            } else {
                                const appIndex = j2meApps.findIndex(app => app.id === id);
                                onSelect(appIndex + 1); // +1 to account for 'Add'
                            }
                        }} />
                    </>
                )
            }
            case ScreenView.SETTINGS: {
                 const menuItems: MenuItem[] = [
                    { id: ScreenView.THEMES, name: 'Themes' },
                    { id: ScreenView.CORS_PROXY, name: 'CORS Proxy' },
                ];
                 return (
                    <>
                        <StatusBar title="Settings" battery={props.battery} />
                        <MenuList items={menuItems} activeIndex={activeIndex} setActiveIndex={setActiveIndex as any} onSelect={onSelect} />
                    </>
                 );
            }
            case ScreenView.THEMES: {
                const themes: Theme[] = ['classic', 'dark', 'gold'];
                const menuItems: CustomMenuItem[] = themes.map(t => ({
                    id: t,
                    name: t.charAt(0).toUpperCase() + t.slice(1),
                }));
                const currentThemeIndex = themes.indexOf(theme);
                return (
                    <>
                        <StatusBar title="Themes" battery={props.battery} />
                        <MenuList items={menuItems} activeIndex={currentThemeIndex} setActiveIndex={(i) => setTheme(themes[i])} onSelect={(id) => onSelect(id)} />
                    </>
                )
            }
            case ScreenView.NOW_PLAYING:
                return (
                    <>
                        <StatusBar title={nowPlayingMedia?.type === 'song' ? 'Now Playing' : 'Video Player'} battery={props.battery} />
                        <NowPlaying {...props} />
                    </>
                );
            case ScreenView.COVER_FLOW:
                 return (
                    <>
                        <StatusBar title="Cover Flow" battery={props.battery} />
                        <CoverFlow 
                            songs={songs} 
                            activeIndex={activeIndex} 
                            setActiveIndex={setActiveIndex} 
                            onSelect={onSelect} 
                        />
                    </>
                 );
            case ScreenView.VIDEO_PLAYER:
                return <VideoPlayer {...props} videos={props.allVideos} />;
            case ScreenView.BRICK_BREAKER:
                 return <BrickBreaker ref={props.brickBreakerRef} goBack={props.goBack} />;
            case ScreenView.SNAKE:
                 return <Snake ref={props.snakeRef} goBack={props.goBack} />;
            case ScreenView.J2ME_RUNNER:
                return <J2MERunner app={props.runningApp} />;
            case ScreenView.CAMERA:
                return <Camera ref={props.cameraRef} onAddPhoto={props.onAddPhoto} activeIndex={activeIndex} />;
            default:
                return (
                    <div className="flex-grow flex items-center justify-center">
                        <p>Screen not implemented</p>
                    </div>
                );
        }
    };

    return <>{renderContent()}</>;
};

export default Screen;
