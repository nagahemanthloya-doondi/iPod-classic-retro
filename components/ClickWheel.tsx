
import React, { useRef, useCallback, useEffect, useState } from 'react';
import { ScreenView, Song, Photo, Video, J2MEApp, FILTERS, FmChannel } from '../types';
import { BrickBreakerRef, SnakeRef, CameraRef } from '../App';

interface ClickWheelProps {
  onMenuClick: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (direction: 'forward' | 'backward') => void;
  onSelect: (selectedId?: any) => void;
  onCenterDoubleClick: () => void;
  currentScreen: ScreenView;
  navigationStack: ScreenView[];
  activeIndex: number;
  setActiveIndex: (update: number | ((prev: number) => number)) => void;
  navigateTo: (screen: ScreenView) => void;
  songs: Song[];
  photos: Photo[];
  videos: Video[];
  iptvLinks: Video[];
  j2meApps: J2MEApp[];
  fmChannels: FmChannel[];
  playSong: (index: number) => void;
  brickBreakerRef: React.RefObject<BrickBreakerRef>;
  snakeRef: React.RefObject<SnakeRef>;
  cameraRef: React.RefObject<CameraRef>;
  isGamepadMode: boolean;
  toggleGamepadMode: () => void;
  onGamepadInput: (input: 'up' | 'down' | 'left' | 'right' | 'a' | 'b') => void;
}

const ClickWheel: React.FC<ClickWheelProps> = (props) => {
  const { onMenuClick, onPlayPause, onNext, onPrev, onSelect, onCenterDoubleClick, setActiveIndex, activeIndex, currentScreen, songs, photos, videos, j2meApps, onSeek, navigationStack, playSong, cameraRef, isGamepadMode, toggleGamepadMode, iptvLinks, fmChannels, onGamepadInput } = props;
  const wheelRef = useRef<HTMLDivElement>(null);
  const lastAngle = useRef(0);
  const rotationAccumulator = useRef(0);
  const longPressTimer = useRef<number | null>(null);
  const longPressInterval = useRef<number | null>(null);
  const clickTimeoutRef = useRef<number | null>(null);
  const tickAudioRef = useRef<HTMLAudioElement>(null);
  
  // Menu item counts for different screens
  const getMenuItemCount = useCallback(() => {
    switch (currentScreen) {
        case ScreenView.MAIN_MENU:
            return 6;
        case ScreenView.MUSIC:
            if (navigationStack[navigationStack.length - 2] === ScreenView.MAIN_MENU) {
                return 4;
            }
            return songs.length + (songs.length > 0 ? 1 : 0);
        case 99 as ScreenView: // All songs
             return songs.length + (songs.length > 0 ? 1 : 0);
        case ScreenView.PHOTOS:
            return photos.length > 0 ? 3 : 2;
        case ScreenView.PHOTO_VIEWER:
            return photos.length;
        case ScreenView.VIDEOS:
            return 6;
        case ScreenView.VIDEO_LIST:
             return videos.length + (videos.length > 0 ? 1 : 0);
        case ScreenView.LIVE_TV:
             return iptvLinks.length + (iptvLinks.length > 0 ? 1 : 0);
        case ScreenView.EXTRAS:
            return 3;
        case ScreenView.GAMES:
            return 11;
        case ScreenView.APPS:
             return j2meApps.length + 1 + (j2meApps.length > 0 ? 1 : 0);
        case ScreenView.SETTINGS:
            return 2;
        case ScreenView.THEMES:
            return 3;
        case ScreenView.FM_RADIO:
            return fmChannels.length + 1 + (fmChannels.length > 0 ? 1 : 0);
        case ScreenView.COVER_FLOW: {
            const albumMap = new Map();
            songs.forEach(song => {
                if (song.album && !albumMap.has(song.album)) {
                    albumMap.set(song.album, song);
                }
            });
            return albumMap.size;
        }
        case ScreenView.CAMERA:
            return FILTERS.length;
    }
    return 0;
  }, [currentScreen, songs, photos, videos, j2meApps, navigationStack, iptvLinks, fmChannels]);


  const handleCenterClick = useCallback(() => {
    if (clickTimeoutRef.current) {
      // Double click
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      onCenterDoubleClick();
    } else {
      // Single click
      clickTimeoutRef.current = window.setTimeout(() => {
        onSelect();
        clickTimeoutRef.current = null;
      }, 300);
    }
  }, [onSelect, onCenterDoubleClick]);


  const handleRotation = useCallback((angle: number) => {
    let delta = angle - lastAngle.current;

    // Normalize delta for smooth scrolling across the -180/180 degree boundary
    if (delta > 180) {
      delta -= 360;
    } else if (delta < -180) {
      delta += 360;
    }

    lastAngle.current = angle;
    
    // A positive delta from atan2 means clockwise rotation.
    // We want clockwise to scroll down (positive index change), so we add the delta directly.
    rotationAccumulator.current += delta;

    const threshold = 25; // degrees, reduced for better responsiveness

    if (Math.abs(rotationAccumulator.current) >= threshold) {
      const scrollAmount = Math.trunc(rotationAccumulator.current / threshold);
      const itemCount = getMenuItemCount();
      
      if (itemCount > 0 && scrollAmount !== 0) {
        setActiveIndex(prev => {
          const newIndex = (prev + scrollAmount + itemCount * Math.abs(scrollAmount)) % itemCount;
          // Play sound on scroll
          if (tickAudioRef.current) {
            tickAudioRef.current.currentTime = 0;
            tickAudioRef.current.play().catch(() => {});
          }
          return newIndex;
        });
      }
      
      // Subtract the scrolled amount from the accumulator
      rotationAccumulator.current -= scrollAmount * threshold;
    }
  }, [setActiveIndex, getMenuItemCount]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (wheelRef.current) {
      const rect = wheelRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
      handleRotation(angle);
    }
  }, [handleRotation]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (wheelRef.current && e.touches.length > 0) {
      const rect = wheelRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const angle = Math.atan2(e.touches[0].clientY - centerY, e.touches[0].clientX - centerX) * (180 / Math.PI);
      handleRotation(angle);
    }
  }, [handleRotation]);


  const stopInteraction = useCallback(() => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopInteraction);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', stopInteraction);
  }, [handleMouseMove, handleTouchMove]);

  const startInteraction = useCallback((clientX: number, clientY: number) => {
    if (wheelRef.current) {
      const rect = wheelRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      lastAngle.current = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
      rotationAccumulator.current = 0;
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', stopInteraction);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', stopInteraction);
    }
  }, [stopInteraction, handleMouseMove, handleTouchMove]);
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isGamepadMode) return;
    startInteraction(e.clientX, e.clientY);
  };
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isGamepadMode) return;
    startInteraction(e.touches[0].clientX, e.touches[0].clientY);
  };


  const startLongPress = (action: 'forward' | 'backward') => {
    stopLongPress();
    onSeek(action);
    longPressInterval.current = window.setInterval(() => onSeek(action), 200);
  };

  const stopLongPress = () => {
    if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
    }
    if (longPressInterval.current) {
        clearInterval(longPressInterval.current);
        longPressInterval.current = null;
    }
  };
  
  const handleNextMouseDown = () => {
    longPressTimer.current = window.setTimeout(() => startLongPress('forward'), 500);
  };
  
  const handlePrevMouseDown = () => {
     longPressTimer.current = window.setTimeout(() => startLongPress('backward'), 500);
  };

  const handleMouseUp = () => {
    if (!longPressInterval.current) { // It was a click, not a long press
        // The onClick handler will take care of single clicks
    }
    stopLongPress();
  };

  const isGameScreen = [ScreenView.BRICK_BREAKER, ScreenView.SNAKE].includes(currentScreen);

  useEffect(() => {
    return () => { // Cleanup timers on unmount
      stopLongPress();
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <div 
          ref={wheelRef} 
          onMouseDown={handleMouseDown} 
          onTouchStart={handleTouchStart}
          className="relative w-[13.5rem] h-[13.5rem] rounded-full flex items-center justify-center select-none"
          style={{ backgroundColor: 'var(--wheel-bg)', touchAction: 'none' }}
      >
        {isGamepadMode ? (
            <>
                <button aria-label="Up" onClick={() => onGamepadInput('up')} className="absolute top-[1.2rem]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--wheel-icon-color)' }}><path fillRule="evenodd" d="M11.47 7.72a.75.75 0 011.06 0l7.5 7.5a.75.75 0 11-1.06 1.06L12 9.31l-6.97 6.97a.75.75 0 01-1.06-1.06l7.5-7.5z" clipRule="evenodd" /></svg>
                </button>
                <button aria-label="Left" onClick={() => onGamepadInput('left')} className="absolute left-[1.2rem]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--wheel-icon-color)' }}><path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" /></svg>
                </button>
                <button aria-label="Right" onClick={() => onGamepadInput('right')} className="absolute right-[1.2rem]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--wheel-icon-color)' }}><path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" /></svg>
                </button>
                <button aria-label="Down" onClick={() => onGamepadInput('down')} className="absolute bottom-[1.2rem]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--wheel-icon-color)' }}><path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" /></svg>
                </button>
            </>
        ) : (
            <>
              <button aria-label="Menu" onClick={onMenuClick} className="absolute top-[1.2rem] text-lg font-bold" style={{ color: 'var(--wheel-icon-color)'}}>MENU</button>
              <button 
                  aria-label="Previous" 
                  onMouseDown={handlePrevMouseDown}
                  onMouseUp={handleMouseUp}
                  onClick={onPrev}
                  className="absolute left-[1.2rem]"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--wheel-icon-color)'}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
              </button>
              <button
                   aria-label="Next"
                   onMouseDown={handleNextMouseDown}
                   onMouseUp={handleMouseUp}
                   onClick={onNext}
                   className="absolute right-[1.2rem]"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--wheel-icon-color)'}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
              </button>
              <button aria-label="Play/Pause" onClick={onPlayPause} className="absolute bottom-[1.2rem]">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--wheel-icon-color)'}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6l5-3-5-3z" /></svg>
              </button>
            </>
        )}
        <button
          aria-label={isGamepadMode ? "Action" : "Select"}
          onClick={handleCenterClick}
          className="w-[5.25rem] h-[5.25rem] rounded-full flex items-center justify-center z-10"
          style={{
              backgroundImage: 'var(--center-button-bg)',
              border: '2px solid var(--center-button-border)'
          }}
        >
        </button>
      </div>
      <audio ref={tickAudioRef} preload="auto" src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=" />
    </>
  );
};

export default ClickWheel;
