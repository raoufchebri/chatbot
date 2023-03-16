import React from 'react';

export default function Conversation({ name }) {
  return (
    <button className='w-full text-left py-4 focus:outline-none focus-visible:bg-indigo-50'>
      <div className='flex items-center'>
        <svg
          stroke='currentColor'
          fill='none'
          strokeWidth='2'
          viewBox='0 0 24 24'
          strokeLinecap='round'
          strokeLinejoin='round'
          className='h-6 w-6 text-gray-400 p-1 mr-3'
          height='2em'
          width='2em'
          xmlns='http://www.w3.org/2000/svg'
        >
          <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'></path>
        </svg>
        <div>
          <h4 className='text-sm text-gray-900'>{name}</h4>
        </div>
      </div>
    </button>
  );
}
