
import React from 'react';
import { ScreenView, Song, Photo, Video, MenuItem, BatteryState, NowPlayingMedia } from '../types';
import StatusBar from './StatusBar';
import MenuList from './MenuList';
import NowPlaying from './NowPlaying';
import CoverFlow from './CoverFlow';
import VideoPlayer from './VideoPlayer';
import AddYoutubeVideo from './AddYoutubeVideo';

interface ScreenProps {
  currentScreen: ScreenView;
  activeIndex: number;
  setActiveIndex: (index: number | ((prev: number) => number)) => void;
  navigateTo: (screen: ScreenView) => void;
  goBack: () => void;
  onNext: () => void;
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
  navigationStack: ScreenView[];
  musicInputRef: React.RefObject<HTMLInputElement>;
  photoInputRef: React.RefObject<HTMLInputElement>;
  videoInputRef: React.RefObject<HTMLInputElement>;
  videoRef: React.RefObject<HTMLVideoElement>;
  setYtPlayer: (player: any) => void;
  battery: BatteryState;
}


const SplitScreenView: React.FC<{ children: React.ReactNode; nowPlayingSong?: Song }> = ({ children, nowPlayingSong }) => {
    return (
        <div className="flex flex-grow overflow-hidden">
            <div className="w-1/2 h-full border-r border-gray-400">
                {children}
            </div>
            <div className="w-1/2 h-full flex items-center justify-center bg-gradient-to-b from-gray-100 to-gray-300">
                 <img 
                    src={nowPlayingSong?.picture || 'https://i.scdn.co/image/ab67616d0000b273b46f74097655d7f353caab14'} 
                    alt="Album Art" 
                    className="w-[7.5rem] h-[7.5rem] object-cover border border-gray-400 shadow-md"
                />
            </div>
        </div>
    );
};

const getYouTubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

const getYouTubeThumbnail = (url: string) => {
    const videoId = getYouTubeId(url);
    return videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : undefined;
}


const Screen: React.FC<ScreenProps> = (props) => {
  const { currentScreen, activeIndex, setActiveIndex, navigateTo, songs, photos, videos, playSong, playVideo, musicInputRef, photoInputRef, videoInputRef, handleNavigateToNowPlaying, handleClearSongs, handleClearVideos } = props;

  const mainMenu: MenuItem[] = [
    { id: ScreenView.MUSIC, name: 'Music' },
    { id: ScreenView.PHOTOS, name: 'Photos' },
    { id: ScreenView.VIDEOS, name: 'Videos' },
    { id: ScreenView.EXTRAS, name: 'Extras' },
    { id: ScreenView.SHUFFLE_PLAY, name: 'Shuffle Songs' },
    { id: ScreenView.NOW_PLAYING, name: 'Now Playing' },
  ];

  const musicMenu: MenuItem[] = [
    { id: ScreenView.COVER_FLOW, name: 'Cover Flow' },
    { id: ScreenView.MUSIC, name: 'All Songs' }, // Re-using MUSIC to show song list
    // Fix: Use ScreenView.ACTION for special menu items.
    { id: ScreenView.ACTION, name: 'Add Music' },
  ];
  
  const photosMenu: MenuItem[] = [
      { id: ScreenView.PHOTO_VIEWER, name: 'View Photos' },
      // Fix: Use ScreenView.ACTION for special menu items.
      { id: ScreenView.ACTION, name: 'Add Photos' },
  ];

  const videosMenu: MenuItem[] = [
      { id: ScreenView.VIDEO_LIST, name: 'View Videos' },
      // Fix: Use ScreenView.ACTION for special menu items.
      { id: ScreenView.ACTION, name: 'Add Videos' },
      { id: ScreenView.ADD_YOUTUBE_VIDEO, name: 'Add YouTube Link' },
  ];

  const getScreenContent = () => {
    switch (currentScreen) {
      case ScreenView.MAIN_MENU:
        return <SplitScreenView nowPlayingSong={props.nowPlayingSong}><MenuList items={mainMenu} activeIndex={activeIndex} setActiveIndex={setActiveIndex} onSelect={(id) => {
          if (id === ScreenView.NOW_PLAYING) {
            handleNavigateToNowPlaying();
          } else {
            navigateTo(id);
          }
        }} /></SplitScreenView>;
      case ScreenView.MUSIC:
         if(props.navigationStack[props.navigationStack.length-2] === ScreenView.MAIN_MENU) {
            return <SplitScreenView nowPlayingSong={props.nowPlayingSong}><MenuList items={musicMenu} activeIndex={activeIndex} setActiveIndex={setActiveIndex} onSelect={(id) => {
                 // Fix: Compare with ScreenView.ACTION for consistency.
                 if (id === ScreenView.ACTION) musicInputRef.current?.click();
                 else if (id === ScreenView.MUSIC) navigateTo(99 as ScreenView); // special id for song list
                 else navigateTo(id);
            }} /></SplitScreenView>;
        }
        // Fallthrough for song list
      case 99 as ScreenView: // Song list
        const songItems = songs.map((s, i) => ({ id: i, name: s.name, subtext: s.artist }));
        if (songs.length > 0) {
            songItems.push({ id: 'clear', name: '[Clear All Songs]', subtext: 'This action cannot be undone.' });
        }
        return <MenuList items={songItems} activeIndex={activeIndex} setActiveIndex={setActiveIndex} onSelect={(id) => {
            if (id === 'clear') {
                handleClearSongs();
            } else {
                playSong(id);
            }
        }} />;
      case ScreenView.PHOTOS:
        return <MenuList items={photosMenu} activeIndex={activeIndex} setActiveIndex={setActiveIndex} onSelect={(id) => {
            // Fix: Compare with ScreenView.ACTION for consistency.
            if (id === ScreenView.ACTION) photoInputRef.current?.click();
            else navigateTo(id);
        }} />;
      case ScreenView.PHOTO_VIEWER:
        if (photos.length === 0) return <div className="flex-grow flex items-center justify-center text-gray-500">No Photos</div>;
        return <div className="w-full h-full bg-black flex items-center justify-center">
            <img src={photos[activeIndex % photos.length].url} alt={photos[activeIndex % photos.length].name} className="max-w-full max-h-full object-contain" />
        </div>;
      case ScreenView.VIDEOS:
        return <MenuList items={videosMenu} activeIndex={activeIndex} setActiveIndex={setActiveIndex} onSelect={(id) => {
            // Fix: Compare with ScreenView.ACTION for consistency.
            if (id === ScreenView.ACTION) videoInputRef.current?.click();
            else navigateTo(id);
        }} />;
      case ScreenView.VIDEO_LIST:
        if (videos.length === 0) return <div className="flex-grow flex items-center justify-center text-gray-500">No Videos</div>;
        const videoItems = videos.map((v, i) => ({ 
            id: i, 
            name: v.name,
            subtext: v.isYoutube ? 'YouTube' : 'Local File',
            thumbnail: v.isYoutube ? getYouTubeThumbnail(v.url) : undefined,
        }));
        if (videos.length > 0) {
            videoItems.push({ id: 'clear', name: '[Clear All Videos]', subtext: 'This action cannot be undone.' });
        }
        return <MenuList items={videoItems} activeIndex={activeIndex} setActiveIndex={setActiveIndex} onSelect={(id) => {
            if (id === 'clear') {
                handleClearVideos();
            } else {
                playVideo(id);
            }
        }} />;
      case ScreenView.VIDEO_PLAYER:
        return <VideoPlayer 
            videos={props.videos} 
            videoInputRef={props.videoInputRef}
            nowPlayingMedia={props.nowPlayingMedia}
            videoRef={props.videoRef}
            setYtPlayer={props.setYtPlayer}
            setIsPlaying={props.setIsPlaying}
            onNext={props.onNext}
        />;
      case ScreenView.ADD_YOUTUBE_VIDEO:
        return <AddYoutubeVideo onAddVideo={props.onAddYoutubeVideo} goBack={props.goBack} />;
      case ScreenView.EXTRAS:
        return <div className="flex-grow flex items-center justify-center text-gray-500">Extras not implemented.</div>;
      case ScreenView.SHUFFLE_PLAY:
        // This is handled in ClickWheel.tsx, just show a message
        return <div className="flex-grow flex items-center justify-center text-gray-500">Shuffling all songs...</div>;
      case ScreenView.NOW_PLAYING:
        return <NowPlaying {...props} />;
      case ScreenView.COVER_FLOW:
        return <CoverFlow {...props} />;
      default:
        return <div className="flex-grow flex items-center justify-center">Screen Not Found</div>;
    }
  };

  const getTitleForScreen = () => {
    switch(currentScreen) {
        case ScreenView.MAIN_MENU: return "Menu";
        case ScreenView.MUSIC: 
            if(props.navigationStack.at(-2) === ScreenView.MAIN_MENU) return "Music";
            return "All Songs";
        case 99 as ScreenView: return "All Songs";
        case ScreenView.PHOTOS: return "Photos";
        case ScreenView.PHOTO_VIEWER: return photos.length > 0 ? `Photo ${activeIndex % photos.length + 1} of ${photos.length}` : "Photos";
        case ScreenView.VIDEOS: return "Videos";
        case ScreenView.VIDEO_LIST: return "All Videos";
        case ScreenView.VIDEO_PLAYER: 
            const video = props.nowPlayingMedia?.type === 'video' ? videos[props.nowPlayingMedia.index] : null;
            if (!video) return "Videos";

            if (video.isYoutube) {
                const videoId = getYouTubeId(video.url);
                const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
                return (
                    <a href={watchUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {video.name}
                    </a>
                )
            }
            return video.name;
        case ScreenView.EXTRAS: return "Extras";
        case ScreenView.NOW_PLAYING: 
            if (!props.nowPlayingSong) return "Now Playing";
            const songIndex = songs.findIndex(s => s.id === props.nowPlayingSong?.id);
            if (songIndex === -1) return "Now Playing";
            return `${songIndex + 1} of ${songs.length}`;
        case ScreenView.COVER_FLOW: return "Cover Flow";
        case ScreenView.ADD_YOUTUBE_VIDEO: return "Add YouTube";
        default: return "Menu";
    }
  };


  return (
    <div className="bg-[#cdd3d8] w-full h-full flex flex-col overflow-hidden select-none">
      <StatusBar title={getTitleForScreen()} isPlaying={props.isPlaying} battery={props.battery} />
      <div className="flex-grow overflow-hidden flex flex-col">
        {getScreenContent()}
      </div>
    </div>
  );
};

export default Screen;
