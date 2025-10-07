
import React, { useRef, useCallback, useEffect } from 'react';
import { ScreenView, Song, Photo, Video, J2MEApp } from '../types';
import { BrickBreakerRef, SnakeRef } from '../App';

interface ClickWheelProps {
  onMenuClick: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (direction: 'forward' | 'backward') => void;
  onSelect: () => void;
  currentScreen: ScreenView;
  navigationStack: ScreenView[];
  activeIndex: number;
  setActiveIndex: (update: number | ((prev: number) => number)) => void;
  navigateTo: (screen: ScreenView) => void;
  songs: Song[];
  photos: Photo[];
  videos: Video[];
  j2meApps: J2MEApp[];
  playSong: (index: number) => void;
  brickBreakerRef: React.RefObject<BrickBreakerRef>;
  snakeRef: React.RefObject<SnakeRef>;
  isGamepadMode: boolean;
  toggleGamepadMode: () => void;
  onGamepadInput: (input: 'up' | 'down' | 'left' | 'right' | 'a' | 'b') => void;
}

const useWheel = (
    wheelRef: React.RefObject<HTMLDivElement>,
    onRotate: (angleDelta: number) => void
) => {
    const isDragging = useRef(false);
    const lastAngle = useRef(0);

    const getAngle = (x: number, y: number) => {
        if (!wheelRef.current) return 0;
        const rect = wheelRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        return Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
    };

    const handleDown = (e: React.MouseEvent | React.TouchEvent) => {
        isDragging.current = true;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        lastAngle.current = getAngle(clientX, clientY);
    };

    const handleUp = () => {
        isDragging.current = false;
    };

    const handleMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!isDragging.current) return;
        
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const currentAngle = getAngle(clientX, clientY);
        let angleDelta = currentAngle - lastAngle.current;

        if (angleDelta > 180) angleDelta -= 360;
        if (angleDelta < -180) angleDelta += 360;

        if (Math.abs(angleDelta) > 0) {
            onRotate(angleDelta);
        }
        lastAngle.current = currentAngle;
    }, [onRotate]);
    
    useEffect(() => {
        const target = wheelRef.current;
        if (!target) return;
        
        const downHandler = (e: MouseEvent | TouchEvent) => {
            // Prevent drag from starting if event originates from center button
            const path = e.composedPath();
            if (path.some(el => (el as HTMLElement).id === 'center-button')) {
                return;
            }
            handleDown(e as any);
        };

        target.addEventListener('mousedown', downHandler as EventListener);
        target.addEventListener('touchstart', downHandler as EventListener, { passive: true });

        document.addEventListener('mousemove', handleMove as EventListener);
        document.addEventListener('touchmove', handleMove as EventListener);
        
        document.addEventListener('mouseup', handleUp);
        document.addEventListener('touchend', handleUp);

        return () => {
            target.removeEventListener('mousedown', downHandler as EventListener);
            target.removeEventListener('touchstart', downHandler as EventListener);
            document.removeEventListener('mousemove', handleMove as EventListener);
            document.removeEventListener('touchmove', handleMove as EventListener);
            document.removeEventListener('mouseup', handleUp);
            document.removeEventListener('touchend', handleUp);
        };
    }, [handleMove, wheelRef]);
};


const ClickWheel: React.FC<ClickWheelProps> = ({ onMenuClick, onPlayPause, onNext, onPrev, onSeek, onSelect, currentScreen, navigationStack, activeIndex, setActiveIndex, navigateTo, songs, photos, videos, j2meApps, playSong, brickBreakerRef, snakeRef, isGamepadMode, toggleGamepadMode, onGamepadInput }) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const accumulatedAngle = useRef(0);
  const lastClickTime = useRef(0);
  
  const handleRotate = useCallback((angleDelta: number) => {
    accumulatedAngle.current += angleDelta;
    const step = 20; // Degrees for one action
    
    if (Math.abs(accumulatedAngle.current) < step) return;
    
    const direction = accumulatedAngle.current > 0 ? 1 : -1;
    accumulatedAngle.current = 0; // Reset after action

    if (currentScreen === ScreenView.BRICK_BREAKER) {
      brickBreakerRef.current?.movePaddle(direction > 0 ? 'right' : 'left');
      return;
    }

    if (currentScreen === ScreenView.SNAKE) {
        snakeRef.current?.turn(direction > 0 ? 'right' : 'left');
        return;
    }

    if (currentScreen === ScreenView.NOW_PLAYING || currentScreen === ScreenView.VIDEO_PLAYER) {
        onSeek(direction > 0 ? 'forward' : 'backward');
    } else {
      const getListLength = () => {
        switch(currentScreen) {
            case ScreenView.MAIN_MENU: return 6;
            case ScreenView.MUSIC:
              if (navigationStack.at(-2) === ScreenView.MAIN_MENU) return 3;
              return songs.length > 0 ? songs.length + 1 : songs.length;
            case 99 as ScreenView: return songs.length > 0 ? songs.length + 1 : songs.length;
            case ScreenView.PHOTOS: return 2;
            case ScreenView.PHOTO_VIEWER: return photos.length;
            case ScreenView.VIDEOS: return 3;
            case ScreenView.EXTRAS: return 2;
            case ScreenView.GAMES: return 11;
            case ScreenView.APPS:
                if (j2meApps.length === 0) return 1; // "Add" only
                return j2meApps.length + 2; // "Add", apps, "Clear"
            case ScreenView.VIDEO_LIST: return videos.length > 0 ? videos.length + 1 : videos.length;
            case ScreenView.COVER_FLOW:
              const albumMap = new Map();
              songs.forEach(song => {
                if (song.album && !albumMap.has(song.album)) {
                  albumMap.set(song.album, song);
                }
              });
              return albumMap.size;
            default: return 0;
        }
      };
      const listLength = getListLength();
      if (listLength > 0) {
          setActiveIndex(prev => (prev + direction + listLength) % listLength);
      }
    }
  }, [currentScreen, onSeek, setActiveIndex, songs, photos, videos, j2meApps, navigationStack, brickBreakerRef, snakeRef]);

  useWheel(wheelRef, handleRotate);
  
  const handleCenterClick = () => {
    const isGameScreen = [
        ScreenView.BRICK_BREAKER,
        ScreenView.SNAKE,
    ].includes(currentScreen);

    if (isGameScreen) {
        const now = Date.now();
        if (now - lastClickTime.current < 300) { // Double-click threshold
            toggleGamepadMode();
            lastClickTime.current = 0; // Reset after double click
        } else {
            onSelect(); // Single click
            lastClickTime.current = now;
        }
    } else {
        onSelect(); // Default behavior
    }
  };

  if (isGamepadMode) {
    return (
        <div className="w-[15rem] h-[15rem] rounded-full bg-gray-700 flex items-center justify-center relative select-none p-4">
            {/* D-Pad */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 grid grid-cols-3 grid-rows-3 w-28 h-28 text-gray-700 font-bold text-lg">
                <div />
                <button aria-label="Up" onClick={() => onGamepadInput('up')} className="bg-white rounded-t active:bg-gray-300 col-start-2 flex items-center justify-center">▲</button>
                <div />
                <button aria-label="Left" onClick={() => onGamepadInput('left')} className="bg-white rounded-l active:bg-gray-300 flex items-center justify-center">◀</button>
                <div className="bg-white flex items-center justify-center"></div>
                <button aria-label="Right" onClick={() => onGamepadInput('right')} className="bg-white rounded-r active:bg-gray-300 flex items-center justify-center">▶</button>
                <div />
                <button aria-label="Down" onClick={() => onGamepadInput('down')} className="bg-white rounded-b active:bg-gray-300 col-start-2 flex items-center justify-center">▼</button>
                <div />
            </div>
            
            {/* Center button for toggling back */}
            <div id="center-button" className="w-[4rem] h-[4rem] bg-white rounded-full border-4 border-gray-700 cursor-pointer" onClick={handleCenterClick}></div>

            {/* Action Buttons */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-3">
                 <button aria-label="A button" onClick={() => onGamepadInput('a')} className="w-12 h-12 bg-white rounded-full text-gray-700 font-bold text-xl active:bg-gray-300">A</button>
                 <button aria-label="B button" onClick={() => onGamepadInput('b')} className="w-12 h-12 bg-white rounded-full text-gray-700 font-bold text-xl active:bg-gray-300">B</button>
            </div>
        </div>
    );
  }

  return (
    <div ref={wheelRef} className="w-[15rem] h-[15rem] rounded-full bg-gray-700 flex items-center justify-center relative select-none cursor-grab active:cursor-grabbing" style={{ touchAction: 'none' }}>
      <div className="absolute top-[1.5rem] text-gray-400 font-bold tracking-widest text-lg cursor-pointer" onClick={onMenuClick}>MENU</div>
      <div className="absolute right-[1.5rem] text-gray-400 cursor-pointer" onClick={onNext}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
      </div>
      <div className="absolute left-[1.5rem] text-gray-400 cursor-pointer" onClick={onPrev}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
      </div>
      <div className="absolute bottom-[1.5rem] text-gray-400 cursor-pointer" onClick={onPlayPause}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      </div>
      <div id="center-button" className="w-[6.25rem] h-[6.25rem] bg-white rounded-full border-4 border-gray-700 cursor-pointer" onClick={handleCenterClick}></div>
    </div>
  );
};

export default ClickWheel;