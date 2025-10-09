
import React, { useState } from 'react';
import { FmChannel } from '../types';

interface AddFmChannelProps {
  onAddFmChannel: (channel: FmChannel) => void;
  goBack: () => void;
}

const AddFmChannel: React.FC<AddFmChannelProps> = ({ onAddFmChannel, goBack }) => {
    const [fmName, setFmName] = useState('');
    const [fmUrl, setFmUrl] = useState('');
    const [error, setError] = useState('');

    const handleAdd = () => {
        if (!fmUrl || !fmName) {
            setError('Please enter a name and a URL.');
            return;
        }
        if (!fmUrl.toLowerCase().startsWith('http')) {
            setError('Please enter a valid URL.');
            return;
        }
        const newChannel: FmChannel = {
            id: `fm-${Date.now()}`,
            name: fmName,
            url: fmUrl,
        };
        onAddFmChannel(newChannel);
        goBack();
    };

    return (
        <div className="flex-grow flex flex-col items-center justify-center relative">
            <h2 className="bg-gradient-to-b from-gray-200 to-gray-300 text-black text-center font-bold py-1 border-b-2 border-gray-400 w-full flex-shrink-0 absolute top-0">Add FM Channel</h2>
            <div className="w-full px-4">
                <input
                    type="text"
                    value={fmName}
                    onChange={(e) => setFmName(e.target.value)}
                    placeholder="Channel Name"
                    className="w-full p-2 border border-gray-400 rounded text-sm text-black placeholder-gray-500 mb-2"
                    aria-label="Channel Name Input"
                />
                <input
                    type="text"
                    value={fmUrl}
                    onChange={(e) => setFmUrl(e.target.value)}
                    placeholder="Paste Stream URL here"
                    className="w-full p-2 border border-gray-400 rounded text-sm text-black placeholder-gray-500"
                    aria-label="FM URL Input"
                />
                <button onClick={handleAdd} className="mt-2 w-full bg-blue-500 text-white px-3 py-2 rounded text-sm font-bold hover:bg-blue-600 transition-colors">
                    Add Channel
                </button>
                {error && <p className="text-red-500 text-xs mt-1 text-center">{error}</p>}
            </div>
        </div>
    );
};

export default AddFmChannel;
