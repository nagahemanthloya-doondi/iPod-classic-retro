
import React, { useState } from 'react';
import { ScreenView, Song, Photo, Video, MenuItem, BatteryState, NowPlayingMedia, J2MEApp, Theme } from '../types';
import StatusBar from './StatusBar';
import MenuList, { CustomMenuItem } from './MenuList';
import NowPlaying from './NowPlaying';
import CoverFlow from './CoverFlow';
import VideoPlayer from './VideoPlayer';
import AddYoutubeVideo from './AddYoutubeVideo';
import Games from './Games';
import BrickBreaker from './games/BrickBreaker';
import Snake from './games/Snake';
import J2MERunner from './J2MERunner';
import { BrickBreakerRef, SnakeRef } from '../App';
import { MUSIC_ICON_SVG } from '../lib/constants';

interface ScreenProps {
  currentScreen: ScreenView;
  activeIndex: number;
  setActiveIndex: (index: number | ((prev: number) => number)) => void;
  navigateTo: (screen: ScreenView) => void;
  goBack: () => void;
  onNext: () => void;
  onSelect: (selectedId?: any) => void;
  songs: Song[];
  photos: Photo[];
  videos: Video[];
  j2meApps: J2MEApp[];
  onAddYoutubeVideo: (video: Video) => void;
  onAddIptvLink: (video: Video) => void;
  onAddOnlineVideo: (video: Video) => void;
  handleClearSongs: () => void;
  handleClearVideos: () => void;
  handleClearJ2meApps: () => void;
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
  j2meInputRef: React.RefObject<HTMLInputElement>;
  videoRef: React.RefObject<HTMLVideoElement>;
  setYtPlayer: (player: any) => void;
  battery: BatteryState;
  brickBreakerRef: React.RefObject<BrickBreakerRef>;
  snakeRef: React.RefObject<SnakeRef>;
  runningApp: J2MEApp | null;
  setRunningApp: (app: J2MEApp | null) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}


const SplitScreenView: React.FC<{ children: React.ReactNode; nowPlayingSong?: Song }> = ({ children, nowPlayingSong }) => {
    return (
        <div className="flex flex-grow overflow-hidden">
            <div className="w-1/2 h-full border-r border-gray-400">
                {children}
            </div>
            <div className="w-1/2 h-full flex items-center justify-center bg-gradient-to-b from-gray-100 to-gray-300">
                 <img 
                    src={nowPlayingSong?.picture || MUSIC_ICON_SVG} 
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

const AddIptvLink: React.FC<{onAddVideo: (video: Video) => void; goBack: () => void;}> = ({ onAddVideo, goBack }) => {
    const [iptvUrl, setIptvUrl] = useState('');
    const [channelName, setChannelName] = useState('');
    const [error, setError] = useState('');

    const handleAddIptvLink = () => {
        if (!iptvUrl) {
            setError('Please enter a URL');
            return;
        }

        try {
            // Test if it is a valid URL format
            new URL(iptvUrl);
        } catch (_) {
            setError('Please enter a valid URL');
            return;
        }

        try {
            const urlPath = iptvUrl.split('?')[0];
            let name = 'IPTV Stream';
            if (channelName.trim()) {
                name = channelName.trim();
            } else {
                try {
                    const decodedUrlPath = decodeURIComponent(urlPath);
                    const lastSegment = decodedUrlPath.substring(decodedUrlPath.lastIndexOf('/') + 1);
                    if (lastSegment) {
                        // Remove extension for a cleaner name
                        name = lastSegment.replace(/\.(m3u8?)$/i, '');
                    }
                } catch(e) {
                    console.warn('Could not decode URL part for name', e);
                    const lastSegment = urlPath.substring(urlPath.lastIndexOf('/') + 1);
                    name = lastSegment.replace(/\.(m3u8?)$/i, '') || 'IPTV Stream';
                }
            }

            const newVideo: Video = {
                id: `iptv-${Date.now()}-${iptvUrl}`,
                name: name,
                url: iptvUrl,
                isYoutube: false,
                isIPTV: true,
                isOnlineVideo: false,
            };
            onAddVideo(newVideo);
            setIptvUrl('');
            setChannelName('');
            setError('');
            goBack();
        } catch (err: any) {
            console.error(err);
            setError('An error occurred. Please check the URL.');
        }
    };

    return (
        <div className="flex-grow flex flex-col items-center justify-center relative">
             <h2 className="bg-gradient-to-b from-gray-200 to-gray-300 text-black text-center font-bold py-1 border-b-2 border-gray-400 w-full flex-shrink-0 absolute top-0">Add IPTV Link</h2>
            <div className="w-full px-4">
                <input
                    type="text"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    placeholder="Channel Name (optional)"
                    className="w-full p-2 border border-gray-400 rounded text-sm text-black placeholder-gray-500 mb-2"
                    aria-label="Channel Name Input"
                />
                <input
                    type="text"
                    value={iptvUrl}
                    onChange={(e) => setIptvUrl(e.target.value)}
                    placeholder="Paste M3U/M3U8 URL here"
                    className="w-full p-2 border border-gray-400 rounded text-sm text-black placeholder-gray-500"
                    aria-label="IPTV URL Input"
                />
                <button 
                    onClick={handleAddIptvLink} 
                    className="mt-2 w-full bg-blue-500 text-white px-3 py-2 rounded text-sm font-bold hover:bg-blue-600 transition-colors"
                >
                    Add Stream
                </button>
                {error && <p className="text-red-500 text-xs mt-1 text-center">{error}</p>}
            </div>
        </div>
    );
};

const AddOnlineVideo: React.FC<{onAddVideo: (video: Video) => void; goBack: () => void;}> = ({ onAddVideo, goBack }) => {
    const [videoUrl, setVideoUrl] = useState('');
    const [videoName, setVideoName] = useState('');
    const [error, setError] = useState('');

    const handleAddVideo = () => {
        if (!videoUrl) {
            setError('Please enter a video URL');
            return;
        }

        try {
            // Test if it is a valid URL format
            new URL(videoUrl);
        } catch (_) {
            setError('Please enter a valid URL');
            return;
        }

        try {
            const name = videoName.trim() || videoUrl.substring(videoUrl.lastIndexOf('/') + 1) || 'Online Video';

            const newVideo: Video = {
                id: `online-${Date.now()}-${videoUrl}`,
                name: name,
                url: videoUrl,
                isYoutube: false,
                isIPTV: false,
                isOnlineVideo: true,
            };
            onAddVideo(newVideo);
            setVideoUrl('');
            setVideoName('');
            setError('');
            goBack();
        } catch (err: any) {
            console.error(err);
            setError('An error occurred. Please check the URL.');
        }
    };

    return (
        <div className="flex-grow flex flex-col items-center justify-center relative">
             <h2 className="bg-gradient-to-b from-gray-200 to-gray-300 text-black text-center font-bold py-1 border-b-2 border-gray-400 w-full flex-shrink-0 absolute top-0">Add Online Video</h2>
            <div className="w-full px-4">
                <input
                    type="text"
                    value={videoName}
                    onChange={(e) => setVideoName(e.target.value)}
                    placeholder="Video Name (optional)"
                    className="w-full p-2 border border-gray-400 rounded text-sm text-black placeholder-gray-500 mb-2"
                    aria-label="Video Name Input"
                />
                <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="Paste Video URL here"
                    className="w-full p-2 border border-gray-400 rounded text-sm text-black placeholder-gray-500"
                    aria-label="Online Video URL Input"
                />
                <button onClick={handleAddVideo} className="mt-2 w-full bg-blue-500 text-white px-3 py-2 rounded text-sm font-bold hover:bg-blue-600 transition-colors">Add Video</button>
                {error && <p className="text-red-500 text-xs mt-1 text-center">{error}</p>}
            </div>
        </div>
    );
};


const Screen: React.FC<ScreenProps> = (props) => {
  const { currentScreen, activeIndex, setActiveIndex, navigateTo, onSelect, songs, photos, videos, j2meApps, playSong, playVideo, musicInputRef, photoInputRef, videoInputRef, j2meInputRef, handleNavigateToNowPlaying, handleClearSongs, handleClearVideos, handleClearJ2meApps, brickBreakerRef, snakeRef } = props;

  const mainMenu: MenuItem[] = [
    { id: ScreenView.MUSIC, name: 'Music' },
    { id: ScreenView.PHOTOS, name: 'Photos' },
    { id: ScreenView.VIDEOS, name: 'Videos' },
    { id: ScreenView.EXTRAS, name: 'Extras' },
    { id: ScreenView.SETTINGS, name: 'Settings' },
    { id: ScreenView.SHUFFLE_PLAY, name: 'Shuffle Songs' },
    { id: ScreenView.NOW_PLAYING, name: 'Now Playing' },
  ];

  const musicMenu: MenuItem[] = [
    { id: ScreenView.COVER_FLOW, name: 'Cover Flow' },
    { id: ScreenView.MUSIC, name: 'All Songs' }, 
    { id: ScreenView.ACTION, name: 'Add Music' },
  ];
  
  const photosMenu: MenuItem[] = [
      { id: ScreenView.PHOTO_VIEWER, name: 'View Photos' },
      { id: ScreenView.ACTION, name: 'Add Photos' },
  ];

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
  ];

  const settingsMenu: MenuItem[] = [
    { id: ScreenView.THEMES, name: 'Themes' },
  ];

  const themesMenu = [
    { id: 'classic', name: 'Classic' },
    { id: 'dark', name: 'Dark' },
    { id: 'gold', name: 'Gold' },
  ];

  const getScreenContent = () => {
    switch (currentScreen) {
      case ScreenView.MAIN_MENU:
        return <SplitScreenView nowPlayingSong={props.nowPlayingSong}><MenuList items={mainMenu} activeIndex={activeIndex} setActiveIndex={setActiveIndex} onSelect={onSelect} /></SplitScreenView>;
      case ScreenView.MUSIC:
         if(props.navigationStack[props.navigationStack.length-2] === ScreenView.MAIN_MENU) {
            return <SplitScreenView nowPlayingSong={props.nowPlayingSong}><MenuList items={musicMenu} activeIndex={activeIndex} setActiveIndex={setActiveIndex} onSelect={onSelect} /></SplitScreenView>;
        }
      case 99 as ScreenView: // Song list
        const songItems: CustomMenuItem[] = songs.map((s, i) => ({ 
            id: i, 
            name: s.name, 
            subtext: s.artist,
            thumbnail: s.picture || MUSIC_ICON_SVG
        }));
        if (songs.length > 0) {
            songItems.push({ id: 'clear', name: '[Clear All Songs]', subtext: 'This action cannot be undone.' });
        }
        return <MenuList items={songItems} activeIndex={activeIndex} setActiveIndex={setActiveIndex} onSelect={onSelect} />;
      case ScreenView.PHOTOS:
        return <MenuList items={photosMenu} activeIndex={activeIndex} setActiveIndex={setActiveIndex} onSelect={onSelect} />;
      case ScreenView.PHOTO_VIEWER:
        if (photos.length === 0) return <div className="flex-grow flex items-center justify-center text-gray-500">No Photos</div>;
        return <div className="w-full h-full bg-black flex items-center justify-center">
            <img src={photos[activeIndex % photos.length].url} alt={photos[activeIndex % photos.length].name} className="max-w-full max-h-full object-contain" />
        </div>;
      case ScreenView.VIDEOS:
        return <MenuList items={videosMenu} activeIndex={activeIndex} setActiveIndex={setActiveIndex} onSelect={onSelect} />;
      case ScreenView.VIDEO_LIST:
        if (videos.length === 0) return <div className="flex-grow flex items-center justify-center text-gray-500">No Videos</div>;
        const videoItems = videos.map((v, i) => ({ 
            id: i, 
            name: v.name,
            subtext: v.isYoutube ? 'YouTube' : v.isIPTV ? 'IPTV Stream' : v.isOnlineVideo ? 'Online Video' : 'Local File',
            thumbnail: v.isYoutube ? getYouTubeThumbnail(v.url) : undefined,
        }));
        if (videos.length > 0) {
            videoItems.push({ id: 'clear', name: '[Clear All Videos]', subtext: 'This action cannot be undone.' });
        }
        return <MenuList items={videoItems} activeIndex={activeIndex} setActiveIndex={setActiveIndex} onSelect={onSelect} />;
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
      case ScreenView.ADD_IPTV_LINK:
        return <AddIptvLink onAddVideo={props.onAddIptvLink} goBack={props.goBack} />;
      case ScreenView.ADD_ONLINE_VIDEO:
        return <AddOnlineVideo onAddVideo={props.onAddOnlineVideo} goBack={props.goBack} />;
      case ScreenView.LIVE_TV:
        const iptvStreams = videos.filter(v => v.isIPTV);
        if (iptvStreams.length === 0) return <div className="flex-grow flex items-center justify-center text-gray-500">No IPTV Streams</div>;
        const iptvItems: CustomMenuItem[] = iptvStreams.map((v) => ({ 
            id: v.id, 
            name: v.name,
            subtext: 'IPTV Stream'
        }));
        if (iptvStreams.length > 0) {
            iptvItems.push({ id: 'clear', name: '[Clear All Streams]', subtext: 'This action cannot be undone.' });
        }
        return <MenuList items={iptvItems} activeIndex={activeIndex} setActiveIndex={setActiveIndex} onSelect={onSelect} />;
      case ScreenView.SETTINGS:
        return <MenuList items={settingsMenu} activeIndex={activeIndex} setActiveIndex={setActiveIndex} onSelect={onSelect} />;
      case ScreenView.THEMES:
        return <MenuList items={themesMenu} activeIndex={activeIndex} setActiveIndex={setActiveIndex} onSelect={onSelect} />;
      case ScreenView.EXTRAS:
        return <MenuList items={extrasMenu} activeIndex={activeIndex} setActiveIndex={setActiveIndex} onSelect={onSelect} />;
      case ScreenView.GAMES:
        return <Games 
            activeIndex={activeIndex} 
            setActiveIndex={setActiveIndex as (index: number) => void} 
            onSelect={onSelect}
        />;
      case ScreenView.APPS:
        const appItems: CustomMenuItem[] = [{ id: 'add', name: 'Add App (.jar)', subtext: 'Load a J2ME application or game' }];
        j2meApps.forEach((app, i) => appItems.push({ id: i, name: app.name, subtext: 'J2ME Application' }));
        if (j2meApps.length > 0) {
            appItems.push({ id: 'clear', name: '[Clear All Apps]', subtext: 'This action cannot be undone.' });
        }
        return <MenuList items={appItems} activeIndex={activeIndex} setActiveIndex={setActiveIndex} onSelect={onSelect} />;
      // Fix: Corrected typo from JME_RUNNER to J2ME_RUNNER
      case ScreenView.J2ME_RUNNER:
        return <J2MERunner app={props.runningApp} />;
      case ScreenView.BRICK_BREAKER:
        return <BrickBreaker ref={brickBreakerRef} goBack={props.goBack} />;
      case ScreenView.SNAKE:
        return <Snake ref={snakeRef} goBack={props.goBack} />;
      case ScreenView.SHUFFLE_PLAY:
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
        case ScreenView.MUSIC: return "Music";
        case ScreenView.PHOTOS: return "Photos";
        case ScreenView.PHOTO_VIEWER: return "Photo Viewer";
        case ScreenView.VIDEOS: return "Videos";
        case ScreenView.VIDEO_LIST: return "All Videos";
        case ScreenView.VIDEO_PLAYER: return props.nowPlayingMedia?.type === 'video' ? props.videos[props.nowPlayingMedia.index]?.name : 'Video Player';
        case ScreenView.EXTRAS: return "Extras";
        case ScreenView.SETTINGS: return "Settings";
        case ScreenView.THEMES: return "Themes";
        case ScreenView.NOW_PLAYING: return "Now Playing";
        case ScreenView.COVER_FLOW: return "Cover Flow";
        case ScreenView.GAMES: return "Games";
        case ScreenView.BRICK_BREAKER: return "Brick Breaker";
        case ScreenView.SNAKE: return "Snake";
        case ScreenView.APPS: return "Apps";
        case ScreenView.J2ME_RUNNER: return props.runningApp?.name || "J2ME Runner";
        case ScreenView.ADD_YOUTUBE_VIDEO: return "Add YouTube";
        case ScreenView.ADD_IPTV_LINK: return "Add IPTV";
        case ScreenView.ADD_ONLINE_VIDEO: return "Add Online Video";
        case ScreenView.LIVE_TV: return "Live TV";
        case 99 as ScreenView: return "All Songs";
        default: return "iPod";
    }
  }

  return (
    <div className="flex-grow flex flex-col overflow-hidden">
      <StatusBar title={getTitleForScreen()} battery={props.battery} />
      {getScreenContent()}
    </div>
  );
};

export default Screen;