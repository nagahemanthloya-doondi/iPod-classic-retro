import React, { useEffect, useRef } from 'react';
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

declare global {
    interface Window {
        Hls: any;
    }
}

const getYouTubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videos, videoInputRef, nowPlayingMedia, videoRef, setYtPlayer, setIsPlaying, onNext }) => {
    const activeVideoIndex = nowPlayingMedia?.type === 'video' ? nowPlayingMedia.index : -1;
    const activeVideo = activeVideoIndex !== -1 ? videos[activeVideoIndex] : null;
    const hlsRef = useRef<any>(null);
    
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
    }, [videoId]);

    useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement || !activeVideo || activeVideo.isYoutube) {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
            return;
        }

        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        let nativeHlsCanPlayListener: (() => void) | null = null;

        if (activeVideo.isIPTV) {
            // Using a more reliable CORS proxy for streaming content. URL is encoded to handle special characters.
            const PROXY_URL = 'https://corsproxy.io/?';
            const streamUrl = `${PROXY_URL}${encodeURIComponent(activeVideo.url)}`;
            const { Hls } = window;

            if (Hls && Hls.isSupported()) {
                // More robust HLS configuration for better error tolerance with unstable streams
                const hlsConfig = {
                    manifestLoadingTimeOut: 45000,
                    levelLoadingTimeOut: 45000,
                    fragLoadingTimeOut: 60000,
                    manifestLoadingMaxRetry: 10,
                    levelLoadingMaxRetry: 10,
                    fragLoadingMaxRetry: 10,
                    manifestLoadingRetryDelay: 2000,
                    levelLoadingRetryDelay: 2000,
                    fragLoadingRetryDelay: 2000,
                };
                const hls = new Hls(hlsConfig);
                hlsRef.current = hls;
                hls.loadSource(streamUrl);
                hls.attachMedia(videoElement);
                hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
                    videoElement.play().catch(e => console.error("Autoplay failed for HLS.js stream:", e));
                });
                hls.on(window.Hls.Events.ERROR, function (event, data) {
                    if (data.fatal) {
                        console.error('HLS.js fatal error:', data.type, data.details);
                        switch (data.type) {
                            case window.Hls.ErrorTypes.MEDIA_ERROR:
                                console.warn('HLS.js: media error encountered, trying to recover...');
                                hls.recoverMediaError();
                                break;
                            case window.Hls.ErrorTypes.NETWORK_ERROR:
                                console.warn('HLS.js: network error encountered, trying to recover...');
                                hls.startLoad();
                                break;
                            default:
                                console.error('HLS.js: unrecoverable error, destroying instance.');
                                hls.destroy();
                                break;
                        }
                    }
                });
            } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
                videoElement.src = streamUrl;
                nativeHlsCanPlayListener = () => {
                    videoElement.play().catch(e => console.error("Autoplay failed for native HLS stream:", e));
                };
                videoElement.addEventListener('canplay', nativeHlsCanPlayListener);
            } else {
                console.error("HLS playback not supported.");
            }
        } else { // Local video
            videoElement.src = activeVideo.url;
        }
        
        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
             if (nativeHlsCanPlayListener && videoElement) {
                videoElement.removeEventListener('canplay', nativeHlsCanPlayListener);
            }
        }

    }, [activeVideo, videoRef, setIsPlaying, onNext]);

    if (!activeVideo) {
        return (
            <div className="flex-grow flex flex-col p-4 items-center justify-center text-gray-500">
                <p className="mb-4 text-center font-semibold">No Videos Loaded</p>
                <button onClick={() => videoInputRef.current?.click()} className="w-full bg-gray-200 text-black px-3 py-2 rounded text-sm font-bold hover:bg-gray-300 transition-colors">
                    Load from Files
                </button>
                <p className="mt-2 text-center text-xs">You can add a YouTube or IPTV link from the previous menu.</p>
            </div>
        );
    }
    
    return (
        <div className="w-full h-full bg-black flex items-center justify-center">
            {activeVideo.isYoutube ? (
                <div id="youtube-player" className="w-full h-full"></div>
            ) : (
                <video ref={videoRef} controls className="max-w-full max-h-full object-contain">
                    Your browser does not support the video tag.
                </video>
            )}
        </div>
    );
};

export default VideoPlayer;