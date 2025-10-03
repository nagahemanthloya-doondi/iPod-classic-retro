import React, { useState } from 'react';
import { Video } from '../types';

interface AddYoutubeVideoProps {
  setVideos: React.Dispatch<React.SetStateAction<Video[]>>;
  goBack: () => void;
}

const getYouTubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

const AddYoutubeVideo: React.FC<AddYoutubeVideoProps> = ({ setVideos, goBack }) => {
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [error, setError] = useState('');

    const handleAddYoutubeVideo = () => {
        if (!youtubeUrl) {
            setError('Please enter a YouTube URL');
            return;
        }
        const videoId = getYouTubeId(youtubeUrl);
        if (videoId) {
            const newVideo: Video = {
                id: `yt-${videoId}`,
                name: `YouTube: ${videoId}`,
                url: `https://www.youtube.com/embed/${videoId}`,
                isYoutube: true,
            };
            setVideos(prev => [...prev, newVideo]);
            setYoutubeUrl('');
            setError('');
            goBack();
        } else {
            setError('Invalid YouTube URL');
        }
    };

    return (
        <div className="flex-grow flex flex-col items-center justify-center relative">
             <h2 className="bg-gradient-to-b from-gray-200 to-gray-300 text-black text-center font-bold py-1 border-b-2 border-gray-400 w-full flex-shrink-0 absolute top-0">Add YouTube Link</h2>
            <div className="w-full px-4">
                <input
                    type="text"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="Paste YouTube URL here"
                    className="w-full p-2 border border-gray-400 rounded text-sm text-black placeholder-gray-500"
                    aria-label="YouTube URL Input"
                />
                <button 
                    onClick={handleAddYoutubeVideo} 
                    className="mt-2 w-full bg-blue-500 text-white px-3 py-2 rounded text-sm font-bold hover:bg-blue-600 transition-colors"
                >
                    Add Video
                </button>
                {error && <p className="text-red-500 text-xs mt-1 text-center">{error}</p>}
            </div>
        </div>
    );
};

export default AddYoutubeVideo;
