
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import IPod from './components/IPod';
import { ScreenView, Song, Photo, Video, BatteryState, NowPlayingMedia, MenuItem, J2MEApp, Theme, FmChannel } from './types';
import * as db from './lib/db';
import { CustomMenuItem } from './components/MenuList';

declare global {
  interface Window {
    jsmediatags: any;
    YT: any;
    onYouTubeIframeAPIReady: () => void;
    Hls: any;
  }
  interface Navigator {
    getBattery: () => Promise<any>;
  }
}

export interface BrickBreakerRef {
  movePaddle: (direction: 'left' | 'right') => void;
  startGame: () => void;
}

export interface SnakeRef {
  turn: (direction: 'left' | 'right') => void;
  startGame: () => void;
  setDirection: (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void;
}

export interface CameraRef {
  capture: () => void;
  switchCamera: () => void;
}


const useBattery = (): BatteryState => {
  const [batteryState, setBatteryState] = useState<BatteryState>({
    level: 1,
    charging: false,
    supported: true,
  });

  useEffect(() => {
    if (!navigator.getBattery) {
      setBatteryState(s => ({ ...s, supported: false }));
      return;
    }

    let battery: any;

    const handleChange = () => {
      setBatteryState({
        level: battery.level,
        charging: battery.charging,
        supported: true,
      });
    };

    navigator.getBattery().then(bat => {
      battery = bat;
      handleChange();
      battery.addEventListener('levelchange', handleChange);
      battery.addEventListener('chargingchange', handleChange);
    });

    return () => {
      if (battery) {
        battery.removeEventListener('levelchange', handleChange);
        battery.removeEventListener('chargingchange', handleChange);
      }
    };
  }, []);

  return batteryState;
};


const App: React.FC = () => {
  const [navigationStack, setNavigationStack] = useState<ScreenView[]>([ScreenView.MAIN_MENU]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isGamepadMode, setIsGamepadMode] = useState(false);
  const [screenExtensionHeight, setScreenExtensionHeight] = useState(0);
  const [theme, setTheme] = useState<Theme>('classic');

  const [songs, setSongs] = useState<Song[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [iptvLinks, setIptvLinks] = useState<Video[]>([]);
  const [j2meApps, setJ2meApps] = useState<J2MEApp[]>([]);
  const [fmChannels, setFmChannels] = useState<FmChannel[]>([]);
  
  const [nowPlayingMedia, setNowPlayingMedia] = useState<NowPlayingMedia | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [runningApp, setRunningApp] = useState<J2MEApp | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsAudioRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const brickBreakerRef = useRef<BrickBreakerRef>(null);
  const snakeRef = useRef<SnakeRef>(null);
  const cameraRef = useRef<CameraRef>(null);

  const musicInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const j2meInputRef = useRef<HTMLInputElement>(null);

  const battery = useBattery();
  const currentScreen = navigationStack[navigationStack.length - 1];
  
  const allVideos = useMemo(() => [...videos, ...iptvLinks], [videos, iptvLinks]);

  const isGameScreen = [
    ScreenView.BRICK_BREAKER,
    ScreenView.SNAKE,
  ].includes(currentScreen);

  useEffect(() => {
    const savedTheme = localStorage.getItem('ipod-theme') as Theme;
    if (savedTheme) {
        setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('ipod-theme', theme);
    document.body.className = `flex items-stretch justify-center theme-${theme}`;
  }, [theme]);

  useEffect(() => {
    if (!isGameScreen && isGamepadMode) {
      setIsGamepadMode(false);
    }
  }, [currentScreen, isGameScreen, isGamepadMode]);

  useEffect(() => {
    const loadData = async () => {
      await db.initDB();
      
      // Load songs
      const storedSongs = await db.getAllMedia<{id: string, name: string, artist: string, album: string, picture: string, file: File}>('songs');
      const loadedSongs = storedSongs.map(s => ({ ...s, url: URL.createObjectURL(s.file) }));
      setSongs(loadedSongs);

      // Load photos
      const storedPhotos = await db.getAllMedia<{id: string, name: string, file: File}>('photos');
      const loadedPhotos = storedPhotos.map(p => ({ ...p, url: URL.createObjectURL(p.file) }));
      setPhotos(loadedPhotos);

      // Load local videos
      const storedVideos = await db.getAllMedia<{id: string, name: string, file: File}>('videos');
      const loadedLocalVideos = storedVideos.map(v => ({ ...v, url: URL.createObjectURL(v.file), isYoutube: false, isIPTV: false, isOnlineVideo: false }));
      
      // Load YouTube videos from localStorage
      const storedYTVideos = JSON.parse(localStorage.getItem('youtube_videos') || '[]');
            
      // Load Online videos from localStorage
      const storedOnlineVideos = JSON.parse(localStorage.getItem('online_videos') || '[]');

      setVideos([...loadedLocalVideos, ...storedYTVideos, ...storedOnlineVideos]);
      
      // Load IPTV videos from localStorage
      const storedIPTVideos = JSON.parse(localStorage.getItem('iptv_videos') || '[]');
      setIptvLinks(storedIPTVideos);

      // Load FM Channels from localStorage
      const storedFmChannels = JSON.parse(localStorage.getItem('fm_channels') || '[]');
      setFmChannels(storedFmChannels);
      
      // Load J2ME apps
      const storedApps = await db.getAllMedia<{id: string, name: string, file: File}>('j2me_apps');
      const loadedApps = storedApps.map(a => ({ ...a, url: URL.createObjectURL(a.file) }));
      setJ2meApps(loadedApps);
    };

    loadData();

    return () => {
        // Cleanup object URLs on unmount
        songs.forEach(media => URL.revokeObjectURL(media.url));
        photos.forEach(media => URL.revokeObjectURL(media.url));
        allVideos.forEach(video => {
            if (!video.isYoutube && !video.isIPTV && !video.isOnlineVideo && video.url.startsWith('blob:')) {
                URL.revokeObjectURL(video.url);
            }
        });
        j2meApps.forEach(app => URL.revokeObjectURL(app.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const navigateTo = (screen: ScreenView) => {
    setNavigationStack([...navigationStack, screen]);
    setActiveIndex(0);
  };

  const goBack = () => {
    if (navigationStack.length > 1) {
      setNavigationStack(navigationStack.slice(0, -1));
      setActiveIndex(0);
    }
  };

  const playSong = (index: number) => {
    if (!songs[index]) return;
    if (hlsAudioRef.current) {
        hlsAudioRef.current.destroy();
        hlsAudioRef.current = null;
    }
    setNowPlayingMedia({ type: 'song', index });
    if (audioRef.current) {
       audioRef.current.src = songs[index].url;
    }
    setIsPlaying(true);
    navigateTo(ScreenView.NOW_PLAYING);
  };
  
  const playVideo = (index: number) => {
    if (!allVideos[index]) return;
    setActiveIndex(index);
    setNowPlayingMedia({ type: 'video', index });
    const video = allVideos[index];

    if (ytPlayerRef.current && ytPlayerRef.current.destroy) {
        ytPlayerRef.current.destroy();
    }
    ytPlayerRef.current = null;
    
    // For IPTV, VideoPlayer will manage starting playback.
    // For other types, we start immediately.
    if (video.isIPTV) {
        setIsPlaying(false);
    } else {
        setIsPlaying(true);
    }
    
    navigateTo(ScreenView.VIDEO_PLAYER);
  };

  const playFmChannel = (index: number) => {
    if (!fmChannels[index]) return;

    if (hlsAudioRef.current) {
        hlsAudioRef.current.destroy();
        hlsAudioRef.current = null;
    }

    setNowPlayingMedia({ type: 'fm', index });
    const channel = fmChannels[index];
    const audioEl = audioRef.current;
    if (!audioEl) return;

    const proxyUrl = localStorage.getItem('cors_proxy_url') || '';
    let streamUrl = channel.url;
    if (proxyUrl && proxyUrl.trim()) {
        const formattedProxy = proxyUrl.trim();
        streamUrl = `${formattedProxy.endsWith('/') ? formattedProxy : formattedProxy + '/'}${streamUrl}`;
    }

    if (channel.url.toLowerCase().includes('.m3u8') && window.Hls && window.Hls.isSupported()) {
        const hls = new window.Hls();
        hlsAudioRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(audioEl);
        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
            audioEl.play().catch(e => console.error("FM autoplay failed", e));
        });
        hls.on(window.Hls.Events.ERROR, (event: any, data: any) => {
            if (data.fatal) {
                console.error("HLS fatal error on audio stream:", data);
            }
        });
    } else {
        audioEl.src = streamUrl;
    }

    setIsPlaying(true);
    navigateTo(ScreenView.NOW_PLAYING);
  };

  const handleNavigateToNowPlaying = () => {
    if (!nowPlayingMedia) {
      navigateTo(ScreenView.NOW_PLAYING);
      return;
    }
    if (nowPlayingMedia.type === 'song' || nowPlayingMedia.type === 'fm') {
      navigateTo(ScreenView.NOW_PLAYING);
    } else if (nowPlayingMedia.type === 'video') {
      setActiveIndex(nowPlayingMedia.index);
      navigateTo(ScreenView.VIDEO_PLAYER);
    }
  };

  const handlePlayPause = () => {
     if (!nowPlayingMedia) {
        if (songs.length > 0) playSong(0);
        return;
    }
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    if (!nowPlayingMedia) return;
    if (nowPlayingMedia.type === 'song' && songs.length > 0) {
      const nextIndex = (nowPlayingMedia.index + 1) % songs.length;
      playSong(nextIndex);
    } else if (nowPlayingMedia.type === 'video' && allVideos.length > 0) {
      const nextIndex = (nowPlayingMedia.index + 1) % allVideos.length;
      playVideo(nextIndex);
    } else if (nowPlayingMedia.type === 'fm' && fmChannels.length > 0) {
      const nextIndex = (nowPlayingMedia.index + 1) % fmChannels.length;
      playFmChannel(nextIndex);
    }
  };

  const handlePrev = () => {
    if (!nowPlayingMedia) return;
    const mediaRef = nowPlayingMedia.type === 'song' ? audioRef : videoRef;
    if (mediaRef.current && mediaRef.current.currentTime > 3) {
      mediaRef.current.currentTime = 0;
    } else if (nowPlayingMedia.type === 'song' && songs.length > 0) {
      const prevIndex = (nowPlayingMedia.index - 1 + songs.length) % songs.length;
      playSong(prevIndex);
    } else if (nowPlayingMedia.type === 'video' && allVideos.length > 0) {
      const prevIndex = (nowPlayingMedia.index - 1 + allVideos.length) % allVideos.length;
      playVideo(prevIndex);
    } else if (nowPlayingMedia.type === 'fm' && fmChannels.length > 0) {
      const prevIndex = (nowPlayingMedia.index - 1 + fmChannels.length) % fmChannels.length;
      playFmChannel(prevIndex);
    }
  };

  // Effect for handling play/pause
  useEffect(() => {
    const isYT = nowPlayingMedia?.type === 'video' && allVideos[nowPlayingMedia.index]?.isYoutube;

    if (isYT && ytPlayerRef.current && typeof ytPlayerRef.current.getPlayerState === 'function') {
      const playerState = ytPlayerRef.current.getPlayerState();
      if (isPlaying && playerState !== window.YT.PlayerState.PLAYING) {
        ytPlayerRef.current.playVideo();
      } else if (!isPlaying && playerState === window.YT.PlayerState.PLAYING) {
        ytPlayerRef.current.pauseVideo();
      }
    } else if (!isYT) {
      const mediaRef = (nowPlayingMedia?.type === 'song' || nowPlayingMedia?.type === 'fm') ? audioRef : videoRef;
      const mediaElement = mediaRef.current;
      if (!mediaElement) return;

      const controlPlayback = async () => {
        try {
          if (isPlaying) {
            await mediaElement.play();
          } else {
            mediaElement.pause();
          }
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            console.error("Error playing media:", error);
          }
        }
      };
      
      controlPlayback();
    }
  }, [isPlaying, nowPlayingMedia, allVideos]);

  // Effect for tracking progress
  useEffect(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    const isYT = nowPlayingMedia?.type === 'video' && allVideos[nowPlayingMedia.index]?.isYoutube;
    if (isYT) {
      progressIntervalRef.current = window.setInterval(() => {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          const currentTime = ytPlayerRef.current.getCurrentTime();
          const duration = ytPlayerRef.current.getDuration();
          setProgress(currentTime);
          if (duration) setDuration(duration);
        }
      }, 250);
    } else {
      const mediaRef = (nowPlayingMedia?.type === 'song' || nowPlayingMedia?.type === 'fm') ? audioRef : videoRef;
      const mediaElement = mediaRef.current;
      if (!mediaElement) return;
      
      const updateProgress = () => {
        if (!isNaN(mediaElement.duration)) {
          setProgress(mediaElement.currentTime);
          setDuration(mediaElement.duration);
        }
      };
      const handleMediaEnd = () => handleNext();
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);

      mediaElement.addEventListener('timeupdate', updateProgress);
      mediaElement.addEventListener('ended', handleMediaEnd);
      mediaElement.addEventListener('loadedmetadata', updateProgress);
      mediaElement.addEventListener('play', handlePlay);
      mediaElement.addEventListener('pause', handlePause);

      return () => {
        mediaElement.removeEventListener('timeupdate', updateProgress);
        mediaElement.removeEventListener('ended', handleMediaEnd);
        mediaElement.removeEventListener('loadedmetadata', updateProgress);
        mediaElement.removeEventListener('play', handlePlay);
        mediaElement.removeEventListener('pause', handlePause);
      };
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowPlayingMedia]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'music' | 'photo' | 'video' | 'j2me') => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const id = `${file.name}-${file.lastModified}`;
      
      if (type === 'music') {
        if (window.jsmediatags) {
          window.jsmediatags.read(file, {
            onSuccess: async (tag: any) => {
              const { artist, album, title } = tag.tags;
              const picture = tag.tags.picture;
              let base64String = '';
              if (picture) {
                const base64 = btoa(String.fromCharCode.apply(null, picture.data));
                base64String = `data:${picture.format};base64,${base64}`;
              }
              const songData = { id, name: title || file.name, artist: artist || 'Unknown Artist', album: album || 'Unknown Album', picture: base64String, file };
              await db.addMedia('songs', songData);
              const newSong: Song = { ...songData, url: URL.createObjectURL(file) };
              setSongs(prev => [...prev, newSong]);
            },
            onError: async (error: any) => {
              console.error(error);
              const songData = { id, name: file.name, artist: 'Unknown Artist', album: 'Unknown Album', picture: '', file };
              await db.addMedia('songs', songData);
              const newSong: Song = { ...songData, url: URL.createObjectURL(file) };
              setSongs(prev => [...prev, newSong]);
            }
          });
        } else {
            console.error("jsmediatags library not loaded, falling back to filename.");
            const fallback = async () => {
                const songData = { id, name: file.name, artist: 'Unknown Artist', album: 'Unknown Album', picture: '', file };
                await db.addMedia('songs', songData);
                const newSong: Song = { ...songData, url: URL.createObjectURL(file) };
                setSongs(prev => [...prev, newSong]);
            };
            fallback();
        }
      } else if (type === 'photo') {
          const photoData = { id, name: file.name, file };
          db.addMedia('photos', photoData);
          const newPhoto: Photo = { ...photoData, url: URL.createObjectURL(file) };
          setPhotos(prev => [...prev, newPhoto]);
      } else if (type === 'video') {
          const videoData = { id, name: file.name, file };
          db.addMedia('videos', videoData);
          const newVideo: Video = { ...videoData, url: URL.createObjectURL(file), isYoutube: false, isIPTV: false, isOnlineVideo: false };
          setVideos(prev => [...prev, newVideo]);
      } else if (type === 'j2me') {
          const appData = { id, name: file.name, file };
          db.addMedia('j2me_apps', appData);
          const newApp: J2MEApp = { ...appData, url: URL.createObjectURL(file) };
          setJ2meApps(prev => [...prev, newApp]);
      }
    });
  };

  const handleAddPhoto = useCallback(async (photoData: { id: string, name: string, file: File }) => {
    await db.addMedia('photos', photoData);
    const newPhoto: Photo = { ...photoData, url: URL.createObjectURL(photoData.file) };
    setPhotos(prev => [...prev, newPhoto]);
  }, []);

  const handleAddYoutubeVideo = (video: Video) => {
    const currentYTVideos = JSON.parse(localStorage.getItem('youtube_videos') || '[]');
    const updatedYTVideos = [...currentYTVideos.filter((v: Video) => v.id !== video.id), video];
    localStorage.setItem('youtube_videos', JSON.stringify(updatedYTVideos));
    setVideos(prev => [...prev.filter(v => v.id !== video.id), video]);
  };
  
  const handleAddIptvLink = (video: Video) => {
    const currentIPTVideos = JSON.parse(localStorage.getItem('iptv_videos') || '[]');
    const updatedIPTVideos = [...currentIPTVideos.filter((v: Video) => v.id !== video.id), video];
    localStorage.setItem('iptv_videos', JSON.stringify(updatedIPTVideos));
    setIptvLinks(updatedIPTVideos);
  };

  const handleAddOnlineVideo = (video: Video) => {
    const currentOnlineVideos = JSON.parse(localStorage.getItem('online_videos') || '[]');
    const updatedOnlineVideos = [...currentOnlineVideos.filter((v: Video) => v.id !== video.id), video];
    localStorage.setItem('online_videos', JSON.stringify(updatedOnlineVideos));
    setVideos(prev => [...prev.filter(v => v.id !== video.id), video]);
  };

  const handleAddFmChannel = (channel: FmChannel) => {
    const currentFmChannels = JSON.parse(localStorage.getItem('fm_channels') || '[]');
    const updatedFmChannels = [...currentFmChannels.filter((c: FmChannel) => c.id !== channel.id), channel];
    localStorage.setItem('fm_channels', JSON.stringify(updatedFmChannels));
    setFmChannels(updatedFmChannels);
  };

  const handleClearSongs = async () => {
    await db.clearStore('songs');
    songs.forEach(song => URL.revokeObjectURL(song.url));
    setSongs([]);
    setActiveIndex(0);
  };

  const handleClearPhotos = async () => {
    await db.clearStore('photos');
    photos.forEach(photo => URL.revokeObjectURL(photo.url));
    setPhotos([]);
    setActiveIndex(0);
  };

  const handleClearVideos = async () => {
    await db.clearStore('videos');
    localStorage.removeItem('youtube_videos');
    localStorage.removeItem('online_videos');
    videos.forEach(video => {
        if (!video.isYoutube && !video.isIPTV && !video.isOnlineVideo && video.url.startsWith('blob:')) {
            URL.revokeObjectURL(video.url);
        }
    });
    setVideos([]);
    setActiveIndex(0);
  };

  const handleClearIptvLinks = () => {
    localStorage.removeItem('iptv_videos');
    setIptvLinks([]);
    setActiveIndex(0);
  };

  const handleClearFmChannels = () => {
    localStorage.removeItem('fm_channels');
    setFmChannels([]);
    setActiveIndex(0);
  };

  const handleClearJ2meApps = async () => {
    await db.clearStore('j2me_apps');
    j2meApps.forEach(app => URL.revokeObjectURL(app.url));
    setJ2meApps([]);
    setActiveIndex(0);
  };

  const handleSeek = (direction: 'forward' | 'backward') => {
    if (!nowPlayingMedia) return;
    const seekAmount = 5; // 5 seconds
    const isYT = nowPlayingMedia.type === 'video' && allVideos[nowPlayingMedia.index].isYoutube;

    if (isYT && ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
      const currentTime = ytPlayerRef.current.getCurrentTime();
      const newTime = direction === 'forward' ? currentTime + seekAmount : currentTime - seekAmount;
      ytPlayerRef.current.seekTo(newTime, true);
    } else {
      const mediaRef = (nowPlayingMedia.type === 'song' || nowPlayingMedia.type === 'fm') ? audioRef : videoRef;
      if (mediaRef.current) {
        mediaRef.current.currentTime += (direction === 'forward' ? seekAmount : -seekAmount);
      }
    }
  };

  const handleSetCorsProxy = () => {
    const currentProxy = localStorage.getItem('cors_proxy_url') || '';
    const newProxy = window.prompt('Enter your CORS proxy URL. (e.g., https://my-proxy.com/)\n\nLeave blank to disable.', currentProxy);
    if (newProxy !== null) { // prompt returns null on cancel
        localStorage.setItem('cors_proxy_url', newProxy.trim());
    }
  };

  const setYtPlayer = (player: any) => {
    ytPlayerRef.current = player;
  };

  const toggleGamepadMode = () => {
    if (isGameScreen) {
      setIsGamepadMode(prev => !prev);
    }
  };

  const handleGamepadInput = (input: 'up' | 'down' | 'left' | 'right' | 'a' | 'b') => {
    switch (currentScreen) {
        case ScreenView.BRICK_BREAKER:
            if (input === 'left' || input === 'right') {
                brickBreakerRef.current?.movePaddle(input);
            } else if (input === 'a') {
                brickBreakerRef.current?.startGame();
            }
            break;
        case ScreenView.SNAKE:
            if (input === 'a') {
                snakeRef.current?.startGame();
            } else if (input === 'up') {
                snakeRef.current?.setDirection('UP');
            } else if (input === 'down') {
                snakeRef.current?.setDirection('DOWN');
            } else if (input === 'left') {
                snakeRef.current?.setDirection('LEFT');
            } else if (input === 'right') {
                snakeRef.current?.setDirection('RIGHT');
            }
            break;
    }
  };

  const handleSelect = (selectedId?: any) => {
    if (isGamepadMode) {
        handleGamepadInput('a');
        return;
    }

    const mainMenu: MenuItem[] = [
        { id: ScreenView.MUSIC, name: 'Music' },
        { id: ScreenView.PHOTOS, name: 'Photos' },
        { id: ScreenView.VIDEOS, name: 'Videos' },
        { id: ScreenView.EXTRAS, name: 'Extras' },
        { id: ScreenView.SETTINGS, name: 'Settings' },
        { id: ScreenView.SHUFFLE_PLAY, name: 'Shuffle Songs' },
    ];
    
    const musicMenu: MenuItem[] = [
        { id: ScreenView.COVER_FLOW, name: 'Cover Flow' },
        { id: ScreenView.MUSIC, name: 'All Songs' }, 
        { id: ScreenView.FM_RADIO, name: 'FM Radio' },
        { id: ScreenView.ACTION, name: 'Add Music' },
    ];
    
    const getPhotosMenu = (photos: Photo[]): CustomMenuItem[] => {
        const menu: CustomMenuItem[] = [
            { id: ScreenView.PHOTO_VIEWER, name: 'View Photos' },
            { id: 'add', name: 'Add Photos' },
        ];
        if (photos.length > 0) {
            menu.push({ id: 'clear', name: 'Clear Photos' });
        }
        return menu;
    }

    const videosMenu: MenuItem[] = [
        { id: ScreenView.VIDEO_LIST, name: 'View Videos' },
        { id: ScreenView.LIVE_TV, name: 'Live TV' },
        { id: ScreenView.ACTION, name: 'Add Videos' },
        { id: ScreenView.ADD_YOUTUBE_VIDEO, name: 'Add YouTube Link' },
        { id: ScreenView.ADD_IPTV_LINK, name: 'Add IPTV Link' },
        { id: ScreenView.ADD_ONLINE_VIDEO, name: 'Add Online Video' },
    ];

    const extrasMenu: MenuItem[] = [
      { id: ScreenView.GAMES, name: 'Games' },
      { id: ScreenView.APPS, name: 'Apps' },
      { id: ScreenView.CAMERA, name: 'Camera' },
    ];

    const gamesMenu: MenuItem[] = [
        { id: ScreenView.BRICK_BREAKER, name: 'Brick Breaker' },
        { id: ScreenView.SNAKE, name: 'Snake' },
        { id: ScreenView.ACTION, name: 'Solitaire' },
        { id: ScreenView.ACTION, name: 'Minesweeper' },
        { id: ScreenView.ACTION, name: 'Pac-Man' },
        { id: ScreenView.ACTION, name: 'Tetris' },
        { id: ScreenView.ACTION, name: 'Pong' },
        { id: ScreenView.ACTION, name: 'Space Invaders' },
        { id: ScreenView.ACTION, name: 'Asteroids' },
        { id: ScreenView.ACTION, name: 'Frogger' },
        { id: ScreenView.ACTION, name: 'Galaga' },
    ];
    
    const settingsMenu: MenuItem[] = [
      { id: ScreenView.THEMES, name: 'Themes' },
      { id: ScreenView.CORS_PROXY, name: 'CORS Proxy' },
    ];

    switch (currentScreen) {
        case ScreenView.MAIN_MENU: {
            const idToUse = selectedId !== undefined ? selectedId : mainMenu[activeIndex].id;
            
            // For mouse clicks, update the active index to match selection
            if (selectedId !== undefined) {
                const newIndex = mainMenu.findIndex(item => item.id === idToUse);
                if (newIndex !== -1) setActiveIndex(newIndex);
            }

            if (idToUse === ScreenView.SHUFFLE_PLAY) {
                const allPlayable = [
                    ...songs.map((song, index) => ({ type: 'song', index })),
                    ...fmChannels.map((channel, index) => ({ type: 'fm', index }))
                ];
            
                if (allPlayable.length > 0) {
                    const randomIndex = Math.floor(Math.random() * allPlayable.length);
                    const selectedMedia = allPlayable[randomIndex];
                    if (selectedMedia.type === 'song') {
                        playSong(selectedMedia.index);
                    } else if (selectedMedia.type === 'fm') {
                        playFmChannel(selectedMedia.index);
                    }
                }
            } else {
                navigateTo(idToUse);
            }
            break;
        }
        
        case ScreenView.MUSIC: {
            if(navigationStack[navigationStack.length - 2] === ScreenView.MAIN_MENU) {
                const idToUse = selectedId !== undefined ? selectedId : musicMenu[activeIndex].id;
                
                if (selectedId !== undefined) {
                    const newIndex = musicMenu.findIndex(item => item.id === idToUse);
                    if (newIndex !== -1) setActiveIndex(newIndex);
                }

                if (idToUse === ScreenView.ACTION) {
                    musicInputRef.current?.click();
                } else if (idToUse === ScreenView.MUSIC) {
                    navigateTo(99 as ScreenView); // special id for song list
                } else {
                    navigateTo(idToUse);
                }
            } else { // Song list was rendered via fallthrough
                const songIndex = selectedId ?? activeIndex;
                if (songs.length > 0 && songIndex === songs.length) { // "Clear" button
                    handleClearSongs();
                } else if (songs[songIndex]) {
                    playSong(songIndex);
                }
            }
            break;
        }
        
        case 99 as ScreenView: { // Song List
            const songIndex = selectedId ?? activeIndex;
            if (selectedId === 'clear' || (selectedId === undefined && songIndex === songs.length)) {
                handleClearSongs();
            } else if (songs[songIndex]) {
                playSong(songIndex);
            }
            break;
        }

        case ScreenView.FM_RADIO: {
            const menuItems = [
                { id: 'add' },
                ...fmChannels.map((c, i) => ({ id: i })),
                ...(fmChannels.length > 0 ? [{ id: 'clear' }] : [])
            ];
            const item = menuItems[activeIndex];
            const idToUse = selectedId !== undefined ? selectedId : item.id;
            
            if (idToUse === 'add') {
                navigateTo(ScreenView.ADD_FM_CHANNEL);
            } else if (idToUse === 'clear') {
                handleClearFmChannels();
            } else if (typeof idToUse === 'number') {
                playFmChannel(idToUse);
            }
            break;
        }

        case ScreenView.PHOTOS: {
            const menu = getPhotosMenu(photos);
            const idToUse = selectedId !== undefined ? selectedId : menu[activeIndex].id;
             if (selectedId !== undefined) {
                const newIndex = menu.findIndex(item => item.id === idToUse);
                if (newIndex !== -1) setActiveIndex(newIndex);
            }
            if (idToUse === 'add') {
                photoInputRef.current?.click();
            } else if (idToUse === 'clear') {
                handleClearPhotos();
            } else {
                navigateTo(idToUse as ScreenView);
            }
            break;
        }

        case ScreenView.VIDEOS: {
            const idToUse = selectedId !== undefined ? selectedId : videosMenu[activeIndex].id;
             if (selectedId !== undefined) {
                const newIndex = videosMenu.findIndex(item => item.id === idToUse);
                if (newIndex !== -1) setActiveIndex(newIndex);
            }
            if (idToUse === ScreenView.ACTION) {
                videoInputRef.current?.click();
            } else {
                navigateTo(idToUse);
            }
            break;
        }
        
        case ScreenView.SETTINGS: {
            const idToUse = selectedId !== undefined ? selectedId : settingsMenu[activeIndex].id;
            
            if (selectedId !== undefined) {
                const newIndex = settingsMenu.findIndex(item => item.id === idToUse);
                if (newIndex !== -1) setActiveIndex(newIndex);
            }

            if (idToUse === ScreenView.CORS_PROXY) {
                handleSetCorsProxy();
            } else {
                navigateTo(idToUse);
            }
            break;
        }

        case ScreenView.CORS_PROXY: {
            handleSetCorsProxy();
            goBack();
            break;
        }

        case ScreenView.THEMES: {
            const themes: Theme[] = ['classic', 'dark', 'gold'];
            const indexToUse = selectedId !== undefined ? themes.findIndex(t => t === selectedId) : activeIndex;
            if (selectedId !== undefined) setActiveIndex(indexToUse);
            setTheme(themes[indexToUse]);
            break;
        }

        case ScreenView.EXTRAS: {
            const idToUse = selectedId !== undefined ? selectedId : extrasMenu[activeIndex].id;
            if (selectedId !== undefined) {
                const newIndex = extrasMenu.findIndex(item => item.id === idToUse);
                if (newIndex !== -1) setActiveIndex(newIndex);
            }
            navigateTo(idToUse);
            break;
        }

        case ScreenView.GAMES: {
            const idToUse = selectedId !== undefined ? selectedId : gamesMenu[activeIndex].id;
             if (selectedId !== undefined) {
                const newIndex = gamesMenu.findIndex(item => item.id === idToUse);
                if (newIndex !== -1) setActiveIndex(newIndex);
            }
            if (idToUse !== ScreenView.ACTION) {
                navigateTo(idToUse);
            }
            break;
        }

        case ScreenView.APPS: {
            const totalApps = j2meApps.length;
            const indexToUse = selectedId ?? activeIndex;

            if (indexToUse === 0) { // 'Add App'
                j2meInputRef.current?.click();
            } else if (totalApps > 0 && indexToUse === totalApps + 1) { // 'Clear'
                handleClearJ2meApps();
            } else if (indexToUse > 0 && indexToUse <= totalApps) {
                const selectedApp = j2meApps[indexToUse - 1];
                setRunningApp(selectedApp);
                navigateTo(ScreenView.J2ME_RUNNER);
            }
            break;
        }

        case ScreenView.BRICK_BREAKER:
            brickBreakerRef.current?.startGame();
            break;

        case ScreenView.SNAKE:
            snakeRef.current?.startGame();
            break;
        
        case ScreenView.CAMERA:
            cameraRef.current?.capture();
            break;

        case ScreenView.VIDEO_LIST: {
            const indexInVideosList = selectedId ?? activeIndex;
            if (selectedId === 'clear' || (selectedId === undefined && indexInVideosList === videos.length)) {
                handleClearVideos();
            } else if (videos[indexInVideosList]) {
                const videoToPlay = videos[indexInVideosList];
                const indexInAllVideos = allVideos.findIndex(v => v.id === videoToPlay.id);
                if (indexInAllVideos !== -1) {
                    playVideo(indexInAllVideos);
                }
            }
            break;
        }
        
        case ScreenView.LIVE_TV: {
            const indexToUse = selectedId ?? activeIndex;
            if (indexToUse === 'clear' || (selectedId === undefined && indexToUse === iptvLinks.length)) {
                handleClearIptvLinks();
            } else if (typeof indexToUse === 'number' && iptvLinks[indexToUse]) {
                const videoToPlay = iptvLinks[indexToUse];
                const indexInAllVideos = allVideos.findIndex(v => v.id === videoToPlay.id);
                if (indexInAllVideos !== -1) {
                    playVideo(indexInAllVideos);
                }
            }
            break;
        }

        case ScreenView.COVER_FLOW: {
            const albumMap = new Map();
            songs.forEach(song => {
                if (song.album && !albumMap.has(song.album)) {
                    albumMap.set(song.album, song);
                }
            });
            const albums = Array.from(albumMap.values());
            const indexToUse = selectedId ?? activeIndex;
            const activeAlbum = albums[indexToUse];
            if (activeAlbum) {
                const firstSongOfAlbumIndex = songs.findIndex(s => s.album === activeAlbum.album);
                if(firstSongOfAlbumIndex !== -1) {
                    playSong(firstSongOfAlbumIndex);
                }
            }
            break;
        }
        
        default:
            break;
    }
};

  const handleCenterDoubleClick = () => {
    if (isGameScreen) {
      toggleGamepadMode();
    } else if (currentScreen === ScreenView.CAMERA) {
      cameraRef.current?.switchCamera();
    }
  };

  return (
    <>
      <IPod
        currentScreen={currentScreen}
        navigationStack={navigationStack}
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
        navigateTo={navigateTo}
        goBack={goBack}
        onPlayPause={handlePlayPause}
        onNext={handleNext}
        onPrev={handlePrev}
        onSeek={handleSeek}
        onSelect={handleSelect}
        onCenterDoubleClick={handleCenterDoubleClick}
        songs={songs}
        photos={photos}
        videos={videos}
        iptvLinks={iptvLinks}
        allVideos={allVideos}
        j2meApps={j2meApps}
        fmChannels={fmChannels}
        onAddYoutubeVideo={handleAddYoutubeVideo}
        onAddIptvLink={handleAddIptvLink}
        onAddOnlineVideo={handleAddOnlineVideo}
        onAddFmChannel={handleAddFmChannel}
        handleClearSongs={handleClearSongs}
        handleClearPhotos={handleClearPhotos}
        handleClearVideos={handleClearVideos}
        handleClearIptvLinks={handleClearIptvLinks}
        handleClearJ2meApps={handleClearJ2meApps}
        handleClearFmChannels={handleClearFmChannels}
        playSong={playSong}
        playVideo={playVideo}
        playFmChannel={playFmChannel}
        handleNavigateToNowPlaying={handleNavigateToNowPlaying}
        nowPlayingMedia={nowPlayingMedia}
        nowPlayingSong={nowPlayingMedia?.type === 'song' ? songs[nowPlayingMedia.index] : undefined}
        nowPlayingFmChannel={nowPlayingMedia?.type === 'fm' ? fmChannels[nowPlayingMedia.index] : undefined}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        progress={progress}
        duration={duration}
        musicInputRef={musicInputRef}
        photoInputRef={photoInputRef}
        videoInputRef={videoInputRef}
        j2meInputRef={j2meInputRef}
        videoRef={videoRef}
        setYtPlayer={setYtPlayer}
        battery={battery}
        brickBreakerRef={brickBreakerRef}
        snakeRef={snakeRef}
        cameraRef={cameraRef}
        onAddPhoto={handleAddPhoto}
        isGamepadMode={isGamepadMode}
        toggleGamepadMode={toggleGamepadMode}
        onGamepadInput={handleGamepadInput}
        runningApp={runningApp}
        setRunningApp={setRunningApp}
        screenExtensionHeight={screenExtensionHeight}
        setScreenExtensionHeight={setScreenExtensionHeight}
        theme={theme}
        setTheme={setTheme}
      />
      <audio ref={audioRef} crossOrigin="anonymous" />
      <input type="file" accept="audio/*" multiple ref={musicInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'music')} />
      <input type="file" accept="image/*" multiple ref={photoInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'photo')} />
      <input type="file" accept="video/*" multiple ref={videoInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'video')} />
      <input type="file" accept="application/java-archive,.jar" multiple ref={j2meInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'j2me')} />
    </>
  );
};

export default App;
