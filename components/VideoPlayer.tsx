import React from 'react';
import { Video, NowPlayingMedia } from '../types';

interface VideoPlayerProps {
  videos: Video[];
  videoInputRef: React.RefObject<HTMLInputElement>;
  nowPlayingMedia: NowPlayingMedia | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  progress: number;
  duration: number;
}

const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds === Infinity) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videos, videoInputRef, nowPlayingMedia, videoRef, progress, duration }) => {
    const activeVideoIndex = nowPlayingMedia?.type === 'video' ? nowPlayingMedia.index : -1;
    const activeVideo = activeVideoIndex !== -1 ? videos[activeVideoIndex] : null;

    if (!activeVideo) {
        return (
            <div className="flex-grow flex flex-col p-4 items-center justify-center text-gray-500">
                <p className="mb-4 text-center font-semibold">No Videos Loaded</p>
                <button onClick={() => videoInputRef.current?.click()} className="w-full bg-gray-200 text-black px-3 py-2 rounded text-sm font-bold hover:bg-gray-300 transition-colors">
                    Load from Files
                </button>
                <p className="mt-2 text-center text-xs">You can add a YouTube link from the previous menu.</p>
            </div>
        );
    }
    
    const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;
    
    return (
        <div className="w-full h-full bg-black flex flex-col items-center justify-between">
            <div className="w-full flex-grow flex items-center justify-center">
                {activeVideo.isYoutube ? (
                    <div className="w-full aspect-video">
                        <iframe
                            src={activeVideo.url}
                            title={activeVideo.name}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full"
                        ></iframe>
                    </div>
                ) : (
                    <video ref={videoRef} src={activeVideo.url} className="max-w-full max-h-full object-contain">
                        Your browser does not support the video tag.
                    </video>
                )}
            </div>
            
            {!activeVideo.isYoutube && (
                 <div className="w-full p-2 text-white flex-shrink-0">
                    <p className="text-center text-xs truncate">{activeVideo.name}</p>
                    <div className="w-full bg-gray-600 rounded-full h-1 my-1">
                        <div className="bg-white h-1 rounded-full" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-gray-400">
                        <span>{formatTime(progress)}</span>
                        <span>-{formatTime(duration - progress)}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoPlayer;
