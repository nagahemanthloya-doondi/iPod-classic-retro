import React, { useEffect, useRef, useState } from 'react';
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

type StreamState = 'loading' | 'playing' | 'error';

const getYouTubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videos, videoInputRef, nowPlayingMedia, videoRef, setYtPlayer, setIsPlaying, onNext }) => {
    const activeVideoIndex = nowPlayingMedia?.type === 'video' ? nowPlayingMedia.index : -1;
    const activeVideo = activeVideoIndex !== -1 ? videos[activeVideoIndex] : null;
    const hlsRef = useRef<any>(null);
    const [streamState, setStreamState] = useState<StreamState>('loading');
    const [errorMessage, setErrorMessage] = useState('');
    
    const videoId = activeVideo?.isYoutube ? getYouTubeId(activeVideo.url) : null;

    // By using refs, we ensure that the latest callbacks are used without re-triggering the effects.
    const setIsPlayingRef = useRef(setIsPlaying);
    const onNextRef = useRef(onNext);

    useEffect(() => {
        setIsPlayingRef.current = setIsPlaying;
    }, [setIsPlaying]);

    useEffect(() => {
        onNextRef.current = onNext;
    }, [onNext]);

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
                            setIsPlayingRef.current(true);
                        } else if (event.data === window.YT.PlayerState.PAUSED) {
                            setIsPlayingRef.current(false);
                        } else if (event.data === window.YT.PlayerState.ENDED) {
                            setIsPlayingRef.current(false);
                            onNextRef.current();
                        }
                    }
                }
            });

            return () => {
                // Player destruction is handled in App.tsx before navigating to a new video
            };
        }
    }, [videoId, setYtPlayer]);

    useEffect(() => {
        const videoElement = videoRef.current;
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        if (!videoElement || !activeVideo || activeVideo.isYoutube) {
            return;
        }

        // Reset state for new stream
        setStreamState('loading');
        setErrorMessage('');
        
        let loadingTimeoutId: number | null = null;
        let nativeHlsCanPlayListener: (() => void) | null = null;
        let nativeHlsPlayingListener: (() => void) | null = null;
        let nativeHlsErrorListener: (() => void) | null = null;
        let hlsjsPlayingListener: (() => void) | null = null;
        let onlineCanPlayListener: (() => void) | null = null;
        let onlinePlayingListener: (() => void) | null = null;
        let onlineErrorListener: (() => void) | null = null;

        if (activeVideo.isIPTV || activeVideo.isOnlineVideo) {
            loadingTimeoutId = window.setTimeout(() => {
                 setStreamState(prev => {
                    if (prev === 'loading') {
                        setErrorMessage('Stream took too long to load.');
                        return 'error';
                    }
                    return prev;
                });
            }, 20000); // 20s timeout

            const streamUrl = activeVideo.url;
            const { Hls } = window;
            const isHlsStream = activeVideo.url.toLowerCase().includes('.m3u8') || activeVideo.isIPTV;
            
            if (isHlsStream) {
                if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
                    videoElement.src = streamUrl;
                    nativeHlsCanPlayListener = () => {
                        videoElement.play().catch(e => console.error("Autoplay failed for native HLS stream:", e));
                    };
                    nativeHlsPlayingListener = () => setStreamState('playing');
                    nativeHlsErrorListener = () => {
                        setErrorMessage('The browser could not play this stream.');
                        setStreamState('error');
                    };
                    videoElement.addEventListener('canplay', nativeHlsCanPlayListener);
                    videoElement.addEventListener('playing', nativeHlsPlayingListener);
                    videoElement.addEventListener('error', nativeHlsErrorListener);
                } else if (Hls && Hls.isSupported()) {
                    const hls = new Hls({
                        manifestLoadingTimeOut: 45000,
                        levelLoadingTimeOut: 45000,
                        fragLoadingTimeOut: 60000,
                    });
                    hlsRef.current = hls;
                    hls.loadSource(streamUrl);
                    hls.attachMedia(videoElement);
                    hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
                        videoElement.play().catch(e => console.error("Autoplay failed for HLS.js stream:", e));
                    });
                    
                    hlsjsPlayingListener = () => setStreamState('playing');
                    videoElement.addEventListener('playing', hlsjsPlayingListener);

                    hls.on(window.Hls.Events.ERROR, function (event, data) {
                        if (data.fatal) {
                            console.error('HLS.js fatal error:', data.type, data.details);
                            let userMessage = 'A media error occurred.';
                            if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) {
                                userMessage = 'A network error occurred while loading the stream.';
                            } else if (data.details === 'manifestLoadError' || data.details === 'manifestParsingError') {
                                userMessage = 'Could not load stream manifest. The link may be incorrect or offline.';
                            }
                            setErrorMessage(userMessage);
                            setStreamState('error');
                            hls.destroy();
                        }
                    });
                } else {
                    setErrorMessage("HLS playback is not supported by your browser.");
                    setStreamState('error');
                }
            } else { // Direct online video (e.g., MP4)
                videoElement.src = streamUrl;
                onlineCanPlayListener = () => {
                    videoElement.play().catch(e => console.error("Autoplay failed for online video:", e));
                };
                onlinePlayingListener = () => setStreamState('playing');
                onlineErrorListener = () => {
                    setErrorMessage('The browser could not play this video file.');
                    setStreamState('error');
                };
                videoElement.addEventListener('canplay', onlineCanPlayListener);
                videoElement.addEventListener('playing', onlinePlayingListener);
                videoElement.addEventListener('error', onlineErrorListener);
            }
        } else { // Local video
            videoElement.src = activeVideo.url;
            setStreamState('playing');
        }
        
        return () => {
            if (loadingTimeoutId) clearTimeout(loadingTimeoutId);
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
             if (videoElement) {
                if (nativeHlsCanPlayListener) videoElement.removeEventListener('canplay', nativeHlsCanPlayListener);
                if (nativeHlsPlayingListener) videoElement.removeEventListener('playing', nativeHlsPlayingListener);
                if (nativeHlsErrorListener) videoElement.removeEventListener('error', nativeHlsErrorListener);
                if (hlsjsPlayingListener) videoElement.removeEventListener('playing', hlsjsPlayingListener);
                if (onlineCanPlayListener) videoElement.removeEventListener('canplay', onlineCanPlayListener);
                if (onlinePlayingListener) videoElement.removeEventListener('playing', onlinePlayingListener);
                if (onlineErrorListener) videoElement.removeEventListener('error', onlineErrorListener);
                // Stop the video and reset src to prevent media fetching in the background
                if (!videoElement.paused) {
                    videoElement.pause();
                }
                videoElement.removeAttribute('src');
                videoElement.load();
            }
        }

    }, [activeVideo, videoRef]);

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
        <div className="w-full h-full bg-black flex items-center justify-center relative">
            {activeVideo.isYoutube ? (
                <div id="youtube-player" className="w-full h-full"></div>
            ) : (
                 <>
                    <video 
                        ref={videoRef} 
                        controls 
                        className="max-w-full max-h-full object-contain"
                        style={{ visibility: streamState === 'playing' ? 'visible' : 'hidden' }}
                    >
                        Your browser does not support the video tag.
                    </video>
                    {streamState === 'loading' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center">
                            <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="mt-2">Loading Stream...</p>
                        </div>
                    )}
                    {streamState === 'error' && (
                         <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
                            <h3 className="font-bold text-lg text-red-400 mb-2">Stream Error</h3>
                            <p className="text-sm">{errorMessage || 'Could not load the video stream.'}</p>
                         </div>
                    )}
                </>
            )}
        </div>
    );
};

export default VideoPlayer;