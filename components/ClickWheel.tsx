
import React, { useRef, useCallback, useEffect } from 'react';
import { ScreenView, Song, Photo, Video } from '../types';

interface ClickWheelProps {
  onMenuClick: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (direction: 'forward' | 'backward') => void;
  onSelect: () => void; // Passed but selection logic is in Screen
  currentScreen: ScreenView;
  navigationStack: ScreenView[];
  activeIndex: number;
  setActiveIndex: (update: number | ((prev: number) => number)) => void;
  navigateTo: (screen: ScreenView) => void;
  songs: Song[];
  photos: Photo[];
  videos: Video[];
  playSong: (index: number) => void;
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


const ClickWheel: React.FC<ClickWheelProps> = ({ onMenuClick, onPlayPause, onNext, onPrev, onSeek, onSelect, currentScreen, navigationStack, activeIndex, setActiveIndex, navigateTo, songs, photos, videos, playSong }) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const accumulatedAngle = useRef(0);
  
  const handleRotate = useCallback((angleDelta: number) => {
    accumulatedAngle.current += angleDelta;
    const step = 20; // Degrees for one action
    
    if (Math.abs(accumulatedAngle.current) < step) return;
    
    const direction = accumulatedAngle.current > 0 ? 1 : -1;
    accumulatedAngle.current = 0; // Reset after action

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
  }, [currentScreen, onSeek, setActiveIndex, songs, photos, videos, navigationStack]);

  useWheel(wheelRef, handleRotate);
  
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
      <div id="center-button" className="w-[6.25rem] h-[6.25rem] bg-white rounded-full border-4 border-gray-700 cursor-pointer" onClick={onSelect}></div>
    </div>
  );
};

export default ClickWheel;