export enum ScreenView {
  MAIN_MENU,
  MUSIC,
  VIDEOS,
  PHOTOS,
  EXTRAS,
  SHUFFLE_PLAY,
  NOW_PLAYING,
  COVER_FLOW,
  VIDEO_PLAYER,
  VIDEO_LIST,
  PHOTO_VIEWER,
  ADD_YOUTUBE_VIDEO,
}

export interface MediaFile {
  id: string;
  name: string;
  url: string;
}

export interface Song extends MediaFile {
  artist: string;
  album: string;
  picture: string; // base64 encoded image
}

export interface Photo extends MediaFile {}

export interface Video extends MediaFile {
  isYoutube: boolean;
}

export interface MenuItem {
  id: ScreenView;
  name: string;
}

export interface BatteryState {
  level: number; // 0 to 1
  charging: boolean;
  supported: boolean;
}

export interface NowPlayingMedia {
  type: 'song' | 'video';
  index: number;
}
