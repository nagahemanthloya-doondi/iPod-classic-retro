
import React from 'react';
import { Song } from '../types';

interface NowPlayingProps {
  nowPlayingSong?: Song;
  isPlaying: boolean;
  progress: number;
  duration: number;
}

const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds === Infinity) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

const NowPlaying: React.FC<NowPlayingProps> = ({ nowPlayingSong, isPlaying, progress, duration }) => {
  if (!nowPlayingSong) {
    return <div className="flex-grow flex items-center justify-center text-gray-500">Nothing Playing</div>;
  }

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="flex-grow flex flex-col p-2 bg-gradient-to-b from-gray-100 to-gray-300">
        <p className="font-bold text-center text-md truncate">{nowPlayingSong.name}</p>
        <p className="text-gray-600 text-center text-sm truncate">{nowPlayingSong.artist}</p>
        <p className="text-gray-500 text-center text-xs truncate mb-2">{nowPlayingSong.album}</p>
        
        <div className="w-full bg-gray-400 rounded-full h-1.5 my-2">
            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${progressPercent}%` }}></div>
        </div>
        <div className="flex justify-between text-xs font-semibold text-gray-700">
            <span>{formatTime(progress)}</span>
            <span>-{formatTime(duration - progress)}</span>
        </div>
        
        <div className="flex-grow flex items-center justify-center mt-2">
            <img 
                src={nowPlayingSong.picture || 'https://picsum.photos/150'} 
                alt="Album Art" 
                className="w-[9.375rem] h-[9.375rem] object-cover border border-gray-400 shadow-lg"
            />
        </div>
    </div>
  );
};

export default NowPlaying;