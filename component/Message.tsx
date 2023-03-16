import React, { useState } from 'react';

type MessageProps = {
  message: string;
  senderImgSrc: string;
  sender?: boolean;
};

const Message: React.FC<MessageProps> = ({
  message,
  sender = false,
  senderImgSrc,
}) => {
  return (
    <div className='chat-message'>
      <div className={`flex items-end ${sender && 'justify-end'}`}>
        <div
          className={`flex flex-col space-y-2 text-sm max-w-xs mx-2 order-2 items-${
            sender ? 'end' : 'start'
          }`}
        >
          <div>
            <span
              className={`px-4 py-2 rounded-lg inline-block ${
                sender
                  ? 'rounded-br-none bg-blue-600 text-white'
                  : 'rounded-bl-none bg-gray-300 text-gray-600'
              }`}
            >
              {message}
            </span>
          </div>
        </div>
        <img
          src={senderImgSrc}
          alt='User'
          className={`w-6 h-6 rounded-full order-${sender ? '2' : '1'}`}
        />
      </div>
    </div>
  );
};

export default Message;
