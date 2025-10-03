import React, { useEffect } from 'react';
import { Video, NowPlayingMedia } from '../types';

interface VideoPlayerProps {
  videos: Video[];
  videoInputRef: React.RefObject<HTMLInputElement>;
  nowPlayingMedia: NowPlayingMedia | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  setYtPlayer: (player: any) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  onNext: () => void;
}

const getYouTubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videos, videoInputRef, nowPlayingMedia, videoRef, setYtPlayer, setIsPlaying, onNext }) => {
    const activeVideoIndex = nowPlayingMedia?.type === 'video' ? nowPlayingMedia.index : -1;
    const activeVideo = activeVideoIndex !== -1 ? videos[activeVideoIndex] : null;
    
    const videoId = activeVideo?.isYoutube ? getYouTubeId(activeVideo.url) : null;

    useEffect(() => {
        if (activeVideo?.isYoutube && videoId && window.YT) {
            const player = new window.YT.Player('youtube-player', {
                videoId: videoId,
                playerVars: {
                    autoplay: 1,
                    controls: 1, // Show player controls
                    rel: 0,
                    modestbranding: 1,
                    fs: 1, // Enable fullscreen button
                },
                events: {
                    'onReady': (event) => {
                        setYtPlayer(event.target);
                        event.target.playVideo();
                    },
                    'onStateChange': (event) => {
                        if (event.data === window.YT.PlayerState.PLAYING) {
                            setIsPlaying(true);
                        } else if (event.data === window.YT.PlayerState.PAUSED) {
                            setIsPlaying(false);
                        } else if (event.data === window.YT.PlayerState.ENDED) {
                            setIsPlaying(false);
                            onNext();
                        }
                    }
                }
            });

            return () => {
                // Player destruction is handled in App.tsx before navigating to a new video
            };
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoId]); // Only re-create player when videoId changes

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
    
    return (
        <div className="w-full h-full bg-black flex items-center justify-center">
            {activeVideo.isYoutube ? (
                <div id="youtube-player" className="w-full h-full"></div>
            ) : (
                <video ref={videoRef} controls src={activeVideo.url} className="max-w-full max-h-full object-contain">
                    Your browser does not support the video tag.
                </video>
            )}
        </div>
    );
};

export default VideoPlayer;