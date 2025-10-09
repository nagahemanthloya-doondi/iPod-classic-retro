
import React from 'react';
import { Song, NowPlayingMedia, FmChannel } from '../types';
import { MUSIC_ICON_SVG } from '../lib/constants';

interface NowPlayingProps {
  nowPlayingSong?: Song;
  nowPlayingFmChannel?: FmChannel;
  isPlaying: boolean;
  progress: number;
  duration: number;
  nowPlayingMedia: NowPlayingMedia | null;
  songs: Song[];
  fmChannels: FmChannel[];
}

const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds === Infinity) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

const NowPlaying: React.FC<NowPlayingProps> = (props) => {
  const { nowPlayingSong, isPlaying, progress, duration, nowPlayingMedia, songs, nowPlayingFmChannel, fmChannels } = props;

  const isFm = nowPlayingMedia?.type === 'fm' && nowPlayingFmChannel;

  const currentSongIndex = nowPlayingMedia?.type === 'song' ? nowPlayingMedia.index : -1;
  const totalSongs = songs.length;

  const currentFmIndex = nowPlayingMedia?.type === 'fm' ? nowPlayingMedia.index : -1;
  const totalFmChannels = fmChannels.length;

  if (!nowPlayingSong && !isFm) {
    return <div className="flex-grow flex items-center justify-center text-gray-500 bg-gray-100">Nothing Playing</div>;
  }

  const title = isFm ? nowPlayingFmChannel.name : nowPlayingSong?.name;
  const artist = isFm ? 'Live Radio' : nowPlayingSong?.artist;
  const album = isFm ? '' : nowPlayingSong?.album;
  const picture = isFm ? MUSIC_ICON_SVG : (nowPlayingSong?.picture || MUSIC_ICON_SVG);
  const progressPercent = duration > 0 && duration !== Infinity ? (progress / duration) * 100 : 0;

  const getTrackCounter = () => {
    if (currentSongIndex >= 0 && totalSongs > 0) {
      return `${currentSongIndex + 1}/${totalSongs}`;
    }
    if (currentFmIndex >= 0 && totalFmChannels > 0) {
      return `${currentFmIndex + 1}/${totalFmChannels}`;
    }
    return '';
  }

  return (
    <div className="flex-grow flex flex-col justify-between p-4 bg-gray-100 text-black">
      <div className="flex justify-between items-center">
        <span className="font-bold text-lg text-gray-800">
          {getTrackCounter()}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      </div>
      
      <div className="flex items-center space-x-4 my-4">
        <div className="flex-shrink-0 w-28 h-28">
            <img 
                src={picture}
                alt="Album Art" 
                className="w-full h-full object-cover shadow-lg border border-gray-200"
            />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold truncate">{title}</p>
          <p className="text-lg text-gray-700 truncate">{artist}</p>
          <p className="text-lg text-gray-600 truncate">{album}</p>
        </div>
      </div>
      
      <div className="w-full">
        {isFm ? (
          <div className="w-full text-center">
            <span className="font-bold text-blue-500 text-lg">LIVE</span>
          </div>
        ) : (
          <>
            <div className="bg-gray-300 h-1.5 w-full">
              <div className="bg-blue-500 h-1.5" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <div className="flex justify-between text-sm font-semibold text-gray-800 mt-1">
              <span>{formatTime(progress)}</span>
              <span>-{formatTime(duration - progress)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NowPlaying;
