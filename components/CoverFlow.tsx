
import React, { useMemo } from 'react';
import { Song } from '../types';
import { MUSIC_ICON_SVG } from '../lib/constants';

interface CoverFlowProps {
  songs: Song[];
  activeIndex: number;
  playSong: (index: number) => void;
}

const CoverFlow: React.FC<CoverFlowProps> = ({ songs, activeIndex, playSong }) => {
  const albums = useMemo(() => {
    const albumMap = new Map<string, Song>();
    songs.forEach(song => {
      if (song.album && !albumMap.has(song.album)) {
        albumMap.set(song.album, song);
      }
    });
    return Array.from(albumMap.values());
  }, [songs]);

  if (albums.length === 0) {
    return <div className="flex-grow flex items-center justify-center text-gray-500">No albums to display</div>;
  }

  const activeAlbum = albums[activeIndex];

  const handleAlbumClick = (albumName: string) => {
    const firstSongOfAlbumIndex = songs.findIndex(s => s.album === albumName);
    if(firstSongOfAlbumIndex !== -1) {
        playSong(firstSongOfAlbumIndex);
    }
  }

  return (
    <div className="w-full h-full bg-black flex flex-col items-center justify-center overflow-hidden p-2">
      <div className="flex-grow w-full flex items-center justify-center" style={{ perspective: '50rem' }}>
        <div className="relative w-full h-48 flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
          {albums.map((album, index) => {
            const offset = index - activeIndex;
            const isVisible = Math.abs(offset) < 5;
            if (!isVisible) return null;

            const rotateY = offset * 45;
            const translateX = offset * 3.125; // 50px -> 3.125rem
            const zIndex = albums.length - Math.abs(offset);
            const scale = offset === 0 ? 1 : 0.75;

            return (
              <div
                key={album.album}
                className="absolute w-40 h-40 transition-transform duration-500 ease-in-out"
                style={{
                  transform: `translateX(${translateX}rem) rotateY(${rotateY}deg) scale(${scale})`,
                  zIndex: zIndex,
                  cursor: 'pointer'
                }}
                onClick={() => handleAlbumClick(album.album)}
              >
                <img
                  src={album.picture || MUSIC_ICON_SVG}
                  alt={album.album}
                  className="w-full h-full object-cover border-4 border-white shadow-lg"
                />
                 {offset === 0 && <div className="absolute -bottom-1 left-0 right-0 h-10 bg-black bg-opacity-50 backdrop-blur-sm" />}
              </div>
            );
          })}
        </div>
      </div>
      {activeAlbum && (
        <div className="text-white text-center mt-2 flex-shrink-0 z-50">
          <p className="font-bold truncate">{activeAlbum.album}</p>
          <p className="text-sm text-gray-300 truncate">{activeAlbum.artist}</p>
        </div>
      )}
    </div>
  );
};

export default CoverFlow;
