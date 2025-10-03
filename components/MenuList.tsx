
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
    <ul className="flex-grow overflow-y-auto bg-white">
      {items.map((item, index) => (
        <li
          key={item.id + item.name}
          ref={index === activeIndex ? activeItemRef : null}
          data-active={index === activeIndex}
          onClick={() => {
              setActiveIndex(index);
              onSelect(item.id);
          }}
          className={`px-2 py-1 text-lg font-bold border-b border-gray-200 flex justify-between items-center cursor-pointer transition-colors duration-100 ${
            index === activeIndex ? 'bg-gradient-to-b from-blue-400 to-blue-600 text-white' : 'text-black'
          }`}
        >
          <div className="flex items-center flex-grow overflow-hidden">
            {item.thumbnail && <img src={item.thumbnail} alt={item.name} className="w-12 h-9 mr-3 object-cover flex-shrink-0 border border-gray-400" />}
            <div className="flex-grow overflow-hidden">
              <p className="truncate">{item.name}</p>
              {item.subtext && <p className={`text-xs font-semibold truncate ${index === activeIndex ? 'text-gray-200' : 'text-gray-500'}`}>{item.subtext}</p>}
            </div>
          </div>
          {index === activeIndex && <span className="pl-2">&gt;</span>}
        </li>
      ))}
    </ul>
  );
};

export default MenuList;
