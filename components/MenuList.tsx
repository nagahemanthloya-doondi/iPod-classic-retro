
import React, { useEffect, useRef } from 'react';

interface CustomMenuItem {
  id: any;
  name: string;
  subtext?: string;
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
          <div>
            <p>{item.name}</p>
            {item.subtext && <p className={`text-xs font-semibold ${index === activeIndex ? 'text-gray-200' : 'text-gray-500'}`}>{item.subtext}</p>}
          </div>
          {index === activeIndex && <span>&gt;</span>}
        </li>
      ))}
    </ul>
  );
};

export default MenuList;
