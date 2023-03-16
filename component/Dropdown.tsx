import React, { useState, useRef, useEffect } from 'react';

function Dropdown({ options, selectedItem, setSelectedItem }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuRef]);

  function toggleMenu() {
    setIsOpen(!isOpen);
  }

  function handleSelectItem(item) {
    setSelectedItem(item);
    setIsOpen(false);
  }

  return (
    <div className='relative inline-block text-left' ref={menuRef}>
      <button
        type='button'
        className='inline-flex justify-center w-full rounded-md px-4 py-2 bg-gray text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
        id='options-menu'
        aria-haspopup='true'
        aria-expanded={isOpen}
        onClick={toggleMenu}
      >
        {selectedItem}
        <svg
          className='-mr-1 ml-2 h-5 w-5'
          xmlns='http://www.w3.org/2000/svg'
          viewBox='0 0 20 20'
          fill='currentColor'
          aria-hidden='true'
        >
          <path
            fillRule='evenodd'
            d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z'
            clipRule='evenodd'
          />
        </svg>
      </button>

      {isOpen && (
        <div
          className='origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-gray-100 ring-1 ring-black ring-opacity-5 focus:outline-none'
          role='menu'
          aria-orientation='vertical'
          aria-labelledby='options-menu'
        >
          <div className='py-1' role='none'>
            {options.map((item) => (
              <a
                href='#'
                key={item}
                className='block px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                role='menuitem'
                onClick={() => handleSelectItem(item)}
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dropdown;
