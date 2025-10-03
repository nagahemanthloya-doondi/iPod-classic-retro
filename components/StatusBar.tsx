
import React from 'react';
import { BatteryState } from '../types';

interface StatusBarProps {
  title: string;
  isPlaying: boolean;
  battery: BatteryState;
}

const StatusBar: React.FC<StatusBarProps> = ({ title, isPlaying, battery }) => {
  return (
    <div className="bg-gradient-to-b from-gray-300 to-gray-400 text-black font-bold text-sm px-2 py-0.5 flex justify-between items-center w-full flex-shrink-0 border-b-2 border-gray-500">
      <span className="w-1/3 text-left"></span> {/* Placeholder for left content */}
      <span className="w-1/3 text-center truncate">{title}</span>
      <div className="w-1/3 flex items-center justify-end">
        {isPlaying && <span className="mr-2 text-lg">❚❚</span>}
        {battery.supported && (
          <div className="flex items-center">
            {battery.charging && <span className="mr-1 text-green-500 text-xs">⚡</span>}
            <div className="relative w-7 h-3 border border-black rounded-sm flex items-center p-0.5">
              <div 
                className="h-full bg-green-400 rounded-sm"
                style={{ width: `${battery.level * 100}%` }}
              ></div>
               <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-0.5 h-1.5 bg-black rounded-r-sm"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusBar;