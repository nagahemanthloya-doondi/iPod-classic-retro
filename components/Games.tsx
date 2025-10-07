
import React from 'react';
import { ScreenView, MenuItem } from '../types';
import MenuList from './MenuList';

interface GamesProps {
    activeIndex: number;
    setActiveIndex: (index: number) => void;
    onSelect: (id: any) => void;
}

const Games: React.FC<GamesProps> = ({ activeIndex, setActiveIndex, onSelect }) => {
    
  const gamesMenu: MenuItem[] = [
    { id: ScreenView.BRICK_BREAKER, name: 'Brick Breaker' },
    { id: ScreenView.SNAKE, name: 'Snake' },
    { id: ScreenView.ACTION, name: 'Solitaire' },
    { id: ScreenView.ACTION, name: 'Minesweeper' },
    { id: ScreenView.ACTION, name: 'Pac-Man' },
    { id: ScreenView.ACTION, name: 'Tetris' },
    { id: ScreenView.ACTION, name: 'Pong' },
    { id: ScreenView.ACTION, name: 'Space Invaders' },
    { id: ScreenView.ACTION, name: 'Asteroids' },
    { id: ScreenView.ACTION, name: 'Frogger' },
    { id: ScreenView.ACTION, name: 'Galaga' },
  ];
  
  return (
    <MenuList 
        items={gamesMenu} 
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
        onSelect={onSelect}
    />
  );
};

export default Games;