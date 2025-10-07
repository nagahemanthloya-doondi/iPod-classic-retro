
import React, { useState } from 'react';
import { Video } from '../types';

interface AddYoutubeVideoProps {
  onAddVideo: (video: Video) => void;
  goBack: () => void;
}

const getYouTubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

const AddYoutubeVideo: React.FC<AddYoutubeVideoProps> = ({ onAddVideo, goBack }) => {
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleAddYoutubeVideo = async () => {
        if (!youtubeUrl) {
            setError('Please enter a YouTube URL');
            return;
        }
        const videoId = getYouTubeId(youtubeUrl);
        if (videoId) {
            setIsLoading(true);
            setError('');
            try {
                const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);

                if (!response.ok) {
                    throw new Error('Could not fetch video details from YouTube.');
                }

                const data = await response.json();
                const videoTitle = data.title;

                if (!videoTitle) {
                    throw new Error('Could not extract video title.');
                }

                const newVideo: Video = {
                    id: `yt-${videoId}`,
                    name: videoTitle,
                    url: `https://www.youtube.com/embed/${videoId}`,
                    isYoutube: true,
                    isIPTV: false,
                };
                onAddVideo(newVideo);
                setYoutubeUrl('');
                setError('');
                goBack();
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'Could not fetch video title. Please check the URL.');
            } finally {
                setIsLoading(false);
            }
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
                    disabled={isLoading}
                />
                <button 
                    onClick={handleAddYoutubeVideo} 
                    className="mt-2 w-full bg-blue-500 text-white px-3 py-2 rounded text-sm font-bold hover:bg-blue-600 transition-colors disabled:bg-blue-300"
                    disabled={isLoading}
                >
                    {isLoading ? 'Adding...' : 'Add Video'}
                </button>
                {error && <p className="text-red-500 text-xs mt-1 text-center">{error}</p>}
            </div>
        </div>
    );
};

export default AddYoutubeVideo;