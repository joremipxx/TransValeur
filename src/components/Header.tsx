import React, { useState, useEffect } from 'react';

const Header: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsVisible(currentScrollY < lastScrollY || currentScrollY < 100);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <div className="sticky top-6 z-50 w-full">
      <nav
        className={`
          bg-[#222222] rounded-full px-4 py-3 w-3/4 mx-auto z-50
          transition-transform duration-300
          ${isVisible ? 'translate-y-0' : '-translate-y-[128px]'}
        `}
      >
        <div className="h-full flex justify-between items-center w-full mx-auto">
          <div className="flex items-center justify-start gap-8">
            <div className="text-white text-xl font-medium">Paradox</div>
          </div>
          <div className="flex items-center justify-end gap-8">
            <div className="flex items-center gap-4">
              <button className="text-white hover:text-gray-300 transition-colors">
                FR
              </button>
              <div className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Header; 