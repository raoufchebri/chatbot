import React, { useEffect, useState } from 'react';
import Conversation from '../component/Conversation';
import Message from '../component/Message';

const senderSrcImage =
  'https://images.unsplash.com/photo-1590031905470-a1a1feacbb0b?ixlib=rb-1.2.1&amp;ixid=eyJhcHBfaWQiOjEyMDd9&amp;auto=format&amp;fit=facearea&amp;facepad=3&amp;w=144&amp;h=144';
const receiverSrcImage =
  'https://images.unsplash.com/photo-1549078642-b2ba4bda0cdb?ixlib=rb-1.2.1&amp;ixid=eyJhcHBfaWQiOjEyMDd9&amp;auto=format&amp;fit=facearea&amp;facepad=3&amp;w=144&amp;h=144';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [message, setPrompt] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessages([
      ...messages,
      {
        role: 'user',
        content: message,
        sender: true,
        senderImgSrc: senderSrcImage,
      },
    ]);
  };

  useEffect(() => {
    const fetchAssistantMessage = async () => {
      const res = await fetch('/api/hello', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });
      const { completion } = await res.json();
      setMessages([
        ...messages,
        {
          ...completion.choices[0].message,
          sender: false,
          senderSrcImage: receiverSrcImage,
        },
      ]);
    };
    if (messages.length > 0 && messages[messages.length - 1].role === 'user')
      fetchAssistantMessage();
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setPrompt(e.target.value);
  return (
    <div className='container mx-auto px-8 sm:px-6 lg:px-20'>
      <div className='flex h-screen'>
        <div className='w-1/3 bg-white p-5'>
          <div className='py-3 px-5 h-full relative'>
            <h3 className='text-xs font-semibold uppercase text-gray-400 mb-1'>
              Conversations
            </h3>
            <div className='divide-y divide-gray-200 relative h-full'>
              <Conversation name='What is Postgres?' />
              <div className='absolute bottom-0 w-full'>
                <button className='w-full text-left py-3 focus:outline-none focus-visible:bg-indigo-50'>
                  <div className='flex items-center'>
                    <svg
                      stroke='currentColor'
                      fill='none'
                      strokeWidth='2'
                      viewBox='0 0 24 24'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      className='h-4 w-4 mr-3 text-gray-400'
                      height='1em'
                      width='1em'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <line x1='12' y1='5' x2='12' y2='19'></line>
                      <line x1='5' y1='12' x2='19' y2='12'></line>
                    </svg>
                    <div>
                      <h4 className='text-sm text-gray-900'>New Chat</h4>
                    </div>
                  </div>
                </button>
                <button className='w-full text-left py-3 focus:outline-none focus-visible:bg-indigo-50'>
                  <div className='flex items-center'>
                    <svg
                      stroke='currentColor'
                      fill='none'
                      strokeWidth='2'
                      viewBox='0 0 24 24'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      className='h-4 w-4 mr-3 text-gray-400'
                      height='1em'
                      width='1em'
                      xmlns='http://www.w3.org/2000/svg'
                    >
                      <polyline points='3 6 5 6 21 6'></polyline>
                      <path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'></path>
                      <line x1='10' y1='11' x2='10' y2='17'></line>
                      <line x1='14' y1='11' x2='14' y2='17'></line>
                    </svg>

                    <div>
                      <h4 className='text-sm text-gray-900'>
                        Clear Conversations
                      </h4>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className='w-2/3 bg-gray-100'>
          <div className='flex-1 px-8 py-2 sm:p-6 justify-between flex flex-col h-screen'>
            <div
              id='messages'
              className='flex h-full flex-col space-y-4 p-3 overflow-y-auto scrollbar-thumb-blue scrollbar-thumb-rounded scrollbar-track-blue-lighter scrollbar-w-2 scrolling-touch'
            >
              {messages.map(({ content, senderImgSrc, sender }, index) => (
                <Message
                  key={index}
                  message={content}
                  senderImgSrc='https://images.unsplash.com/photo-1590031905470-a1a1feacbb0b?ixlib=rb-1.2.1&amp;ixid=eyJhcHBfaWQiOjEyMDd9&amp;auto=format&amp;fit=facearea&amp;facepad=3&amp;w=144&amp;h=144'
                  sender={sender}
                />
              ))}
            </div>
            <div className='text-sm border-t border-gray-200 px-4 pt-4 mb-2 sm:mb-0'>
              <div className='relative flex'>
                <input
                  type='text'
                  placeholder='Write your message!'
                  className='w-full focus:outline-none focus:placeholder-gray-400 text-gray-600 placeholder-gray-600 pl-4 bg-gray-200 rounded-md py-3'
                  onKeyDown={handleKeyDown}
                  onChange={handleInputChange}
                />
                <div className='absolute right-0 items-center inset-y-0 hidden sm:flex'>
                  <button
                    type='button'
                    className='inline-flex items-center justify-center rounded-full h-10 w-10 transition duration-500 ease-in-out text-gray-500 hover:bg-gray-300 focus:outline-none'
                    onClick={handleSubmit}
                  >
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      viewBox='0 0 20 20'
                      fill='currentColor'
                      className='h-6 w-6 ml-2 transform text-gray-500 rotate-90'
                    >
                      <path d='M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z'></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
