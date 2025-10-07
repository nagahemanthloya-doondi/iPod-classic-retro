
import React, { useEffect, useRef } from 'react';

export interface CustomMenuItem {
  id: any;
  name: string;
  subtext?: string;
  thumbnail?: string;
}
interface MenuListProps {
  items: CustomMenuItem[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  onSelect: (id: any) => void;
}

const MenuList: React.FC<MenuListProps> = ({ items, activeIndex, setActiveIndex, onSelect }) => {
  const activeItemRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [activeIndex]);

  return (
    <ul className="flex-grow overflow-y-auto" style={{ backgroundColor: 'var(--menu-bg)'}}>
      {items.map((item, index) => {
        const isActive = index === activeIndex;
        const style = {
            color: isActive ? 'var(--menu-active-text-color)' : 'var(--menu-text-color)',
            backgroundImage: isActive ? 'var(--menu-active-bg-gradient)' : 'none',
            borderBottom: `1px solid var(--menu-border-color)`,
        };
        const subtextStyle = {
            color: isActive ? 'var(--menu-active-subtext-color)' : 'var(--menu-subtext-color)',
        }
        
        return (
            <li
              key={item.id + item.name}
              ref={isActive ? activeItemRef : null}
              data-active={isActive}
              onClick={() => {
                  setActiveIndex(index);
                  onSelect(item.id);
              }}
              className="px-2 py-1 text-lg font-bold flex justify-between items-center cursor-pointer transition-colors duration-100"
              style={style}
            >
              <div className="flex items-center flex-grow overflow-hidden">
                {item.thumbnail && <img src={item.thumbnail} alt={item.name} className="w-12 h-9 mr-3 object-cover flex-shrink-0 border border-gray-400" />}
                <div className="flex-grow overflow-hidden">
                  <p className="truncate">{item.name}</p>
                  {item.subtext && <p className="text-xs font-semibold truncate" style={subtextStyle}>{item.subtext}</p>}
                </div>
              </div>
              {isActive && <span className="pl-2">&gt;</span>}
            </li>
        )
      })}
    </ul>
  );
};

export default MenuList;