
import React, { useRef, useCallback } from 'react';
import { ScreenView, Song, Photo, Video } from '../types';

interface ClickWheelProps {
  onMenuClick: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
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

const ClickWheel: React.FC<ClickWheelProps> = ({ onMenuClick, onPlayPause, onNext, onPrev, currentScreen, navigationStack, activeIndex, setActiveIndex, navigateTo, songs, photos, videos, playSong }) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastAngle = useRef(0);
  const angleAccumulator = useRef(0);
  const scrollThreshold = 15; // Lowered for better sensitivity

  const getElementCenter = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  };
  
  const getMenuItemsForScreen = useCallback(() => {
     switch (currentScreen) {
      case ScreenView.MAIN_MENU: return 6;
      case ScreenView.MUSIC: 
        if(navigationStack[navigationStack.length-2] === ScreenView.MAIN_MENU) return 3;
        return songs.length;
      case 99 as ScreenView: return songs.length;
      case ScreenView.PHOTOS: return 2;
      case ScreenView.PHOTO_VIEWER: return photos.length;
      case ScreenView.VIDEOS: return 3;
      case ScreenView.VIDEO_LIST: return videos.length;
      case ScreenView.VIDEO_PLAYER: return 0;
      case ScreenView.ADD_YOUTUBE_VIDEO: return 0;
      case ScreenView.COVER_FLOW: return songs.filter((s, i, a) => a.findIndex(t => t.album === s.album) === i).length;
      default: return 0;
     }
  }, [currentScreen, navigationStack, songs, photos, videos]);
  
  const handleScroll = useCallback((direction: 'up' | 'down') => {
    const itemCount = getMenuItemsForScreen();
    if (itemCount === 0) return;

    setActiveIndex(prev => {
        if(direction === 'down') return (prev + 1) % itemCount;
        if(direction === 'up') return (prev - 1 + itemCount) % itemCount;
        return prev;
    });
  }, [getMenuItemsForScreen, setActiveIndex]);

  // --- Touch Event Handlers ---
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current || !wheelRef.current) return;
    const center = getElementCenter(wheelRef.current);
    const touch = e.touches[0];
    const angle = Math.atan2(touch.clientY - center.y, touch.clientX - center.x) * (180 / Math.PI);
    
    let angleDiff = angle - lastAngle.current;
    if (angleDiff > 180) angleDiff -= 360;
    if (angleDiff < -180) angleDiff += 360;

    angleAccumulator.current += angleDiff;

    if (angleAccumulator.current > scrollThreshold) {
      handleScroll('down');
      angleAccumulator.current = 0;
    } else if (angleAccumulator.current < -scrollThreshold) {
      handleScroll('up');
      angleAccumulator.current = 0;
    }
    lastAngle.current = angle;
  }, [handleScroll]);
  
  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
  }, [handleTouchMove]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!wheelRef.current) return;
    isDragging.current = true;
    const center = getElementCenter(wheelRef.current);
    const touch = e.touches[0];
    lastAngle.current = Math.atan2(touch.clientY - center.y, touch.clientX - center.x) * (180 / Math.PI);
    angleAccumulator.current = 0;
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
  }, [handleTouchMove, handleTouchEnd]);

  // --- Mouse Event Handlers ---
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !wheelRef.current) return;
    const center = getElementCenter(wheelRef.current);
    const angle = Math.atan2(e.clientY - center.y, e.clientX - center.x) * (180 / Math.PI);
    
    let angleDiff = angle - lastAngle.current;
    if (angleDiff > 180) angleDiff -= 360;
    if (angleDiff < -180) angleDiff += 360;

    angleAccumulator.current += angleDiff;

    if (angleAccumulator.current > scrollThreshold) {
      handleScroll('down');
      angleAccumulator.current = 0;
    } else if (angleAccumulator.current < -scrollThreshold) {
      handleScroll('up');
      angleAccumulator.current = 0;
    }
    lastAngle.current = angle;
  }, [handleScroll]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!wheelRef.current) return;
    isDragging.current = true;
    const center = getElementCenter(wheelRef.current);
    lastAngle.current = Math.atan2(e.clientY - center.y, e.clientX - center.x) * (180 / Math.PI);
    angleAccumulator.current = 0;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, handleMouseUp]);
  
  const handleSelect = () => {
    const activeElement = document.querySelector('[data-active="true"]');
    if (activeElement instanceof HTMLElement) {
        activeElement.click();
    } else if (currentScreen === ScreenView.SHUFFLE_PLAY) {
        if(songs.length > 0) {
            const randomIndex = Math.floor(Math.random() * songs.length);
            playSong(randomIndex);
        }
    }
  };

  return (
    <div 
      ref={wheelRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className="relative w-56 h-56 bg-gray-100 rounded-full flex items-center justify-center cursor-pointer select-none shadow-inner border-2 border-gray-300"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <div className="absolute text-gray-500 font-bold top-4 text-lg" onClick={(e) => { e.stopPropagation(); onMenuClick(); }}>MENU</div>
      <div className="absolute text-gray-500 font-bold left-5 text-xl" onClick={(e) => { e.stopPropagation(); onPrev(); }}>&#x23EE;</div>
      <div className="absolute text-gray-500 font-bold right-5 text-xl" onClick={(e) => { e.stopPropagation(); onNext(); }}>&#x23ED;</div>
      <div className="absolute text-gray-500 font-bold bottom-5 text-xl" onClick={(e) => { e.stopPropagation(); onPlayPause(); }}>►❚❚</div>
      <div onClick={(e) => { e.stopPropagation(); handleSelect(); }} className="w-20 h-20 bg-gray-300 rounded-full border-2 border-gray-400 shadow-md active:shadow-inner"></div>
    </div>
  );
};

export default ClickWheel;
