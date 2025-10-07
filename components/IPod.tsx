
import React from 'react';
import Screen from './Screen';
import ClickWheel from './ClickWheel';
import { ScreenView, Song, Photo, Video, BatteryState, NowPlayingMedia, J2MEApp } from '../types';
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
  brickBreakerRef: React.RefObject<BrickBreakerRef>;
  snakeRef: React.RefObject<SnakeRef>;
  isGamepadMode: boolean;
  toggleGamepadMode: () => void;
  onGamepadInput: (input: 'up' | 'down' | 'left' | 'right' | 'a' | 'b') => void;
  runningApp: J2MEApp | null;
  setRunningApp: (app: J2MEApp | null) => void;
}

// Reusable Screen component part to avoid duplicating the bezel/screen markup
const ScreenComponent: React.FC<IPodProps> = (props) => (
    <div className="w-full h-[16.25rem] bg-gray-700 rounded-md border-2 border-gray-800 flex items-center justify-center">
        <div className="w-[20rem] h-[15rem] bg-[#cdd3d8] overflow-hidden flex flex-col">
            <Screen {...props} />
        </div>
    </div>
);


const IPod: React.FC<IPodProps> = (props) => {
  return (
    // This outer div is for centering the iPod on the page.
    <div className="w-full h-full flex items-center justify-center">
      {/* 
        This is the main iPod container. Its layout changes from portrait to landscape 
        via the CSS in index.html, avoiding the need for two separate DOM structures.
      */}
      <div className="ipod-container">
        <div className="ipod-body">
            <ScreenComponent {...props} />
        </div>
        <ClickWheel {...props} onMenuClick={props.goBack} />
      </div>
    </div>
  );
};

export default IPod;