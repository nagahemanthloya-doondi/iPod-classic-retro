
import React, { useRef, useCallback, useEffect, useState } from 'react';
import Screen from './Screen';
import ClickWheel from './ClickWheel';
import { ScreenView, Song, Photo, Video, BatteryState, NowPlayingMedia, J2MEApp, Theme, FmChannel } from '../types';
import { BrickBreakerRef, SnakeRef, CameraRef } from '../App';

interface IPodProps {
  currentScreen: ScreenView;
  navigationStack: ScreenView[];
  activeIndex: number;
  setActiveIndex: (index: number | ((prev: number) => number)) => void;
  navigateTo: (screen: ScreenView) => void;
  goBack: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (direction: 'forward' | 'backward') => void;
  onSelect: (selectedId?: any) => void;
  onCenterDoubleClick: () => void;
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
  onAddPhoto: (photoData: { id: string; name: string; file: File; }) => void;
  isGamepadMode: boolean;
  toggleGamepadMode: () => void;
  onGamepadInput: (input: 'up' | 'down' | 'left' | 'right' | 'a' | 'b') => void;
  runningApp: J2MEApp | null;
  setRunningApp: (app: J2MEApp | null) => void;
  screenExtensionHeight: number;
  setScreenExtensionHeight: React.Dispatch<React.SetStateAction<number>>;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const IPod: React.FC<IPodProps> = (props) => {
  const { screenExtensionHeight, setScreenExtensionHeight, theme } = props;

  const isResizing = useRef(false);
  const longPressTimer = useRef<number | null>(null);
  const startY = useRef(0);
  const startHeight = useRef(0);
  
  const [maxExtensionPx, setMaxExtensionPx] = useState(0);

  const getRemInPixels = useCallback(() => {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        return parseFloat(getComputedStyle(document.documentElement).fontSize);
    }
    return 16; // fallback
  }, []);

  useEffect(() => {
    const updateMaxHeight = () => {
        setMaxExtensionPx(4 * getRemInPixels()); 
    };
    updateMaxHeight();
    window.addEventListener('resize', updateMaxHeight);
    return () => window.removeEventListener('resize', updateMaxHeight);
  }, [getRemInPixels]);


  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const deltaY = e.clientY - startY.current;
    const newHeight = startHeight.current + deltaY;
    const clampedHeight = Math.max(0, Math.min(newHeight, maxExtensionPx));
    setScreenExtensionHeight(clampedHeight);
  }, [maxExtensionPx, setScreenExtensionHeight]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isResizing.current) return;
    e.preventDefault();
    const deltaY = e.touches[0].clientY - startY.current;
    const newHeight = startHeight.current + deltaY;
    const clampedHeight = Math.max(0, Math.min(newHeight, maxExtensionPx));
    setScreenExtensionHeight(clampedHeight);
  }, [maxExtensionPx, setScreenExtensionHeight]);

  const stopResize = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = 'default';
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResize);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', stopResize);
  }, [handleMouseMove, handleTouchMove]);


  const startResize = useCallback((clientY: number) => {
    isResizing.current = true;
    startY.current = clientY;
    startHeight.current = screenExtensionHeight;
    document.body.style.cursor = 'ns-resize';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResize);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', stopResize);
  }, [screenExtensionHeight, handleMouseMove, stopResize, handleTouchMove]);
  
  const stopLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    document.removeEventListener('mouseup', stopLongPress);
    document.removeEventListener('touchend', stopLongPress);
    document.removeEventListener('mousemove', stopLongPress);
    document.removeEventListener('touchmove', stopLongPress);
  }, []);

  const handleLongPressStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (window.matchMedia("(orientation: landscape)").matches) {
      return;
    }
    
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    document.addEventListener('mouseup', stopLongPress);
    document.addEventListener('touchend', stopLongPress);
    document.addEventListener('mousemove', stopLongPress);
    document.addEventListener('touchmove', stopLongPress);

    longPressTimer.current = window.setTimeout(() => {
        document.removeEventListener('mousemove', stopLongPress);
        document.removeEventListener('touchmove', stopLongPress);
        startResize(clientY);
    }, 300); // 300ms for long press
  }, [startResize, stopLongPress]);

  const themeClassName = theme !== 'classic' ? `theme-${theme}` : '';

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className={`ipod-container ${themeClassName}`}>
        <div className="ipod-body">
            <div 
              className="w-full rounded-md border-2 flex items-center justify-center resizable-area p-2 box-border"
              style={{ 
                  height: `calc(16.25rem + ${screenExtensionHeight}px)`,
                  backgroundColor: 'var(--screen-bezel-bg)',
                  borderColor: 'var(--screen-bezel-border)',
                }}
              onMouseDown={handleLongPressStart}
              onTouchStart={handleLongPressStart}
            >
                <div className="w-full h-full overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--screen-bg)'}}>
                    <Screen {...props} />
                </div>
            </div>
        </div>
        <ClickWheel {...props} onMenuClick={props.goBack} />
      </div>
    </div>
  );
};

export default IPod;
