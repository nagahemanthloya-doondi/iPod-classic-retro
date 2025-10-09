import React, { useMemo } from 'react';
import { Song } from '../types';
import { MUSIC_ICON_SVG } from '../lib/constants';

interface CoverFlowProps {
  songs: Song[];
  activeIndex: number;
  setActiveIndex: (index: number | ((prev: number) => number)) => void;
  onSelect: (index: number) => void;
}

const CoverFlow: React.FC<CoverFlowProps> = ({ songs, activeIndex, setActiveIndex, onSelect }) => {
  const albums = useMemo(() => {
    const albumMap = new Map<string, Song>();
    songs.forEach(song => {
      // Use album name and artist as a key to differentiate albums with the same name
      const albumKey = `${song.album}|${song.artist}`;
      if (song.album && !albumMap.has(albumKey)) {
        albumMap.set(albumKey, song);
      }
    });
    return Array.from(albumMap.values());
  }, [songs]);

  if (albums.length === 0) {
    return <div className="flex-grow flex items-center justify-center text-gray-500">No albums to display</div>;
  }

  const handleCoverClick = (index: number) => {
    if (index === activeIndex) {
      onSelect(index);
    } else {
      setActiveIndex(index);
    }
  };

  const activeAlbum = albums[activeIndex];

  return (
    <div className="w-full h-full flex flex-col items-center justify-between overflow-hidden p-2" style={{ background: 'linear-gradient(to bottom, #d1d5db, white 80%)' }}>
      <div className="flex-grow w-full flex items-center justify-center pt-8" style={{ perspective: '60rem' }}>
        <div className="relative w-[9rem] h-[9rem] flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
          {albums.map((album, index) => {
            const offset = index - activeIndex;
            const isVisible = Math.abs(offset) < 6;
            if (!isVisible) return null;

            const rotateY = offset * -40;
            const translateX = offset * 4;
            const translateZ = -Math.abs(offset) * 5;
            const zIndex = albums.length - Math.abs(offset);

            return (
              <div
                key={`${album.album}-${album.artist}`}
                className="absolute w-full h-full transition-all duration-300 ease-out"
                style={{
                  transform: `translateX(${translateX}rem) translateZ(${translateZ}rem) rotateY(${rotateY}deg)`,
                  zIndex: zIndex,
                  cursor: 'pointer',
                }}
                onClick={() => handleCoverClick(index)}
                role="button"
                aria-label={`Album: ${album.album} by ${album.artist}`}
                tabIndex={0}
              >
                <div 
                    className="relative w-full h-full group"
                >
                    <img
                        src={album.picture || MUSIC_ICON_SVG}
                        alt={album.album}
                        className="w-full h-full object-cover border-2 border-white shadow-lg"
                    />
                    <div
                        className="absolute top-full left-0 w-full h-full pointer-events-none"
                        style={{
                            background: `url("${album.picture || MUSIC_ICON_SVG}")`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            transform: 'scaleY(-1)',
                            WebkitMaskImage: 'linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, transparent 50%)',
                            maskImage: 'linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, transparent 50%)',
                        }}
                    />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {activeAlbum && (
        <div className="text-black text-center pb-2 flex-shrink-0 z-50">
          <p className="font-bold truncate">{activeAlbum.album}</p>
          <p className="text-sm text-gray-700 truncate">{activeAlbum.artist}</p>
        </div>
      )}
    </div>
  );
};

export default CoverFlow;
