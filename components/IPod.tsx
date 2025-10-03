

import React from 'react';
import Screen from './Screen';
import ClickWheel from './ClickWheel';
import { ScreenView, Song, Photo, Video, BatteryState, NowPlayingMedia } from '../types';

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
  onAddYoutubeVideo: (video: Video) => void;
  handleClearSongs: () => void;
  handleClearVideos: () => void;
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
  videoRef: React.RefObject<HTMLVideoElement>;
  setYtPlayer: (player: any) => void;
  battery: BatteryState;
}

const IPod: React.FC<IPodProps> = (props) => {
  return (
    <div className="w-[22.5rem] h-full bg-gradient-to-b from-gray-200 to-gray-400 rounded-3xl shadow-2xl flex flex-col items-center justify-between p-4 border-2 border-gray-500">
      {/* Screen Bezel */}
      <div className="w-full h-[16.25rem] bg-gray-700 rounded-md border-2 border-gray-800 flex items-center justify-center mb-8">
          {/* Screen Content */}
          <div className="w-[20rem] h-[15rem] bg-[#cdd3d8] overflow-hidden flex flex-col">
              <Screen {...props} />
          </div>
      </div>
      
      <ClickWheel 
        onMenuClick={props.goBack}
        onPlayPause={props.onPlayPause}
        onNext={props.onNext}
        onPrev={props.onPrev}
        onSeek={props.onSeek}
        onSelect={props.onSelect}
        currentScreen={props.currentScreen}
        navigationStack={props.navigationStack}
        activeIndex={props.activeIndex}
        setActiveIndex={props.setActiveIndex}
        navigateTo={props.navigateTo}
        songs={props.songs}
        photos={props.photos}
        videos={props.videos}
        playSong={props.playSong}
      />
    </div>
  );
};

export default IPod;