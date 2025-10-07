import React, { useRef, useCallback, useEffect, useState } from 'react';
import Screen from './Screen';
import ClickWheel from './ClickWheel';
import { ScreenView, Song, Photo, Video, BatteryState, NowPlayingMedia, J2MEApp, Theme } from '../types';
import { BrickBreakerRef, SnakeRef } from '../App';

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
  onSelect: () => void;
  songs: Song[];
  photos: Photo[];
  videos: Video[];
  j2meApps: J2MEApp[];
  onAddYoutubeVideo: (video: Video) => void;
  onAddIptvLink: (video: Video) => void;
  handleClearSongs: () => void;
  handleClearVideos: () => void;
  handleClearJ2meApps: () => void;
  playSong: (index: number) => void;
  playVideo: (index: number) => void;
  handleNavigateToNowPlaying: () => void;
  nowPlayingMedia: NowPlayingMedia | null;
  nowPlayingSong?: Song;
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
  // Fix: Corrected the type for `brickBreakerRef` from `BrickBreaker` to `BrickBreakerRef` to match the imported type.
  brickBreakerRef: React.RefObject<BrickBreakerRef>;
  snakeRef: React.RefObject<SnakeRef>;
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

const GamepadShoulderButton: React.FC<{ label: 'L' | 'R'; onClick: () => void; }> = ({ label, onClick }) => (
    <button 
        aria-label={`${label} button`} 
        onClick={onClick} 
        className="w-16 h-8 rounded-md text-white font-bold text-xl shadow-sm"
        style={{ 
            backgroundColor: 'var(--gamepad-shoulder-bg)',
        }}
    >
        {label}
    </button>
);

const GamepadShoulderButtons: React.FC<{ onGamepadInput: IPodProps['onGamepadInput'] }> = ({ onGamepadInput }) => (
    <div className="w-[20rem] flex justify-between px-8 my-2">
        <GamepadShoulderButton label="L" onClick={() => onGamepadInput('b')} />
        <GamepadShoulderButton label="R" onClick={() => onGamepadInput('a')} />
    </div>
);


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
            {props.isGamepadMode && <GamepadShoulderButtons onGamepadInput={props.onGamepadInput} />}
        </div>
        <ClickWheel {...props} onMenuClick={props.goBack} />
      </div>
    </div>
  );
};

export default IPod;