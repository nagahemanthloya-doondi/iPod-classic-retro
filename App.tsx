
import React, { useState, useRef, useCallback, useEffect } from 'react';
import IPod from './components/IPod';
import { ScreenView, Song, Photo, Video, BatteryState, NowPlayingMedia } from './types';

declare global {
  interface Window {
    jsmediatags: any;
  }
  interface Navigator {
    getBattery: () => Promise<any>;
  }
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

  const [songs, setSongs] = useState<Song[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  
  const [nowPlayingMedia, setNowPlayingMedia] = useState<NowPlayingMedia | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const musicInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const battery = useBattery();
  const currentScreen = navigationStack[navigationStack.length - 1];

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
    setNowPlayingMedia({ type: 'song', index });
    if (audioRef.current) {
       audioRef.current.src = songs[index].url;
    }
    setIsPlaying(true);
    navigateTo(ScreenView.NOW_PLAYING);
  };
  
  const playVideo = (index: number) => {
    if (!videos[index]) return;
    setActiveIndex(index);
    setNowPlayingMedia({ type: 'video', index });
    const video = videos[index];
    if (videoRef.current && !video.isYoutube) {
      videoRef.current.src = video.url;
    }
    setIsPlaying(true);
    navigateTo(ScreenView.VIDEO_PLAYER);
  }

  const handleNavigateToNowPlaying = () => {
    if (!nowPlayingMedia) {
      navigateTo(ScreenView.NOW_PLAYING);
      return;
    }
    if (nowPlayingMedia.type === 'song') {
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
    } else if (nowPlayingMedia.type === 'video' && videos.length > 0) {
      const nextIndex = (nowPlayingMedia.index + 1) % videos.length;
      playVideo(nextIndex);
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
    } else if (nowPlayingMedia.type === 'video' && videos.length > 0) {
      const prevIndex = (nowPlayingMedia.index - 1 + videos.length) % videos.length;
      playVideo(prevIndex);
    }
  };

  // Effect for handling play/pause
  useEffect(() => {
    const mediaRef = nowPlayingMedia?.type === 'song' ? audioRef : videoRef;
    const mediaElement = mediaRef.current;
    if (!mediaElement || (nowPlayingMedia?.type === 'video' && videos[nowPlayingMedia.index].isYoutube)) return;

    if (isPlaying) {
      mediaElement.play().catch(e => console.error("Error playing media:", e));
    } else {
      mediaElement.pause();
    }
  }, [isPlaying, nowPlayingMedia, songs, videos]);

  // Effect for tracking progress
  useEffect(() => {
    const mediaRef = nowPlayingMedia?.type === 'song' ? audioRef : videoRef;
    if (nowPlayingMedia?.type === 'video' && videos[nowPlayingMedia.index]?.isYoutube) {
      setProgress(0);
      setDuration(0);
      return;
    }
    const mediaElement = mediaRef.current;
    if (!mediaElement) return;
    
    const updateProgress = () => {
      if (!isNaN(mediaElement.duration)) {
        setProgress(mediaElement.currentTime);
        setDuration(mediaElement.duration);
      }
    };
    const handleMediaEnd = () => handleNext();

    mediaElement.addEventListener('timeupdate', updateProgress);
    mediaElement.addEventListener('ended', handleMediaEnd);
    mediaElement.addEventListener('loadedmetadata', updateProgress);

    return () => {
      mediaElement.removeEventListener('timeupdate', updateProgress);
      mediaElement.removeEventListener('ended', handleMediaEnd);
      mediaElement.removeEventListener('loadedmetadata', updateProgress);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowPlayingMedia, songs, videos]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'music' | 'photo' | 'video') => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const url = URL.createObjectURL(file);
      const id = `${file.name}-${file.lastModified}`;
      
      if (type === 'music') {
        window.jsmediatags.read(file, {
          onSuccess: (tag: any) => {
            const { artist, album, title } = tag.tags;
            const picture = tag.tags.picture;
            let base64String = '';
            if (picture) {
              const base64 = btoa(String.fromCharCode.apply(null, picture.data));
              base64String = `data:${picture.format};base64,${base64}`;
            }
            const newSong: Song = { id, name: title || file.name, url, artist: artist || 'Unknown Artist', album: album || 'Unknown Album', picture: base64String };
            setSongs(prev => [...prev, newSong]);
          },
          onError: (error: any) => {
            console.error(error);
            const newSong: Song = { id, name: file.name, url, artist: 'Unknown Artist', album: 'Unknown Album', picture: '' };
            setSongs(prev => [...prev, newSong]);
          }
        });
      } else if (type === 'photo') {
        const newPhoto: Photo = { id, name: file.name, url };
        setPhotos(prev => [...prev, newPhoto]);
      } else if (type === 'video') {
         const newVideo: Video = { id, name: file.name, url, isYoutube: false };
         setVideos(prev => [...prev, newVideo]);
      }
    });
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
        songs={songs}
        photos={photos}
        videos={videos}
        setVideos={setVideos}
        playSong={playSong}
        playVideo={playVideo}
        handleNavigateToNowPlaying={handleNavigateToNowPlaying}
        nowPlayingMedia={nowPlayingMedia}
        nowPlayingSong={nowPlayingMedia?.type === 'song' ? songs[nowPlayingMedia.index] : undefined}
        isPlaying={isPlaying}
        progress={progress}
        duration={duration}
        musicInputRef={musicInputRef}
        photoInputRef={photoInputRef}
        videoInputRef={videoInputRef}
        videoRef={videoRef}
        battery={battery}
      />
      <audio ref={audioRef} />
      <input type="file" accept="audio/*" multiple ref={musicInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'music')} />
      <input type="file" accept="image/*" multiple ref={photoInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'photo')} />
      <input type="file" accept="video/*" multiple ref={videoInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'video')} />
    </>
  );
};

export default App;
