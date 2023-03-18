import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { oneDark as dark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

// create type message
type Message = {
  role: 'user' | 'assistant';
  content: string;
  sender?: boolean;
};

type Chat = {};

export default function Home() {
  const options = ['with-edge'];
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState();
  const [currentConversationTitle, setCurrentConversationTitle] = useState('');
  const messagesEndRef = useRef(null);
  const [selectedItem, setSelectedItem] = useState(options[0]);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newMessages: Message[] = [
      {
        role: 'user',
        content: message,
        sender: true,
      },
    ];
    if (answer) {
      // add element to the first position of the array
      newMessages.unshift({
        role: 'assistant',
        content: answer,
        sender: false,
      });
    }
    setMessages([...messages, ...newMessages]);
    setMessage('');
    setAnswer('');
  };

  const fetchCompletionStream = async (
    endpoint: string,
    setState: React.Dispatch<React.SetStateAction<string>>,
    state: string,
    isMessage: boolean = false
  ) => {
    setLoading(true);
    console.log('fetching completion stream');
    console.log('endpoint', endpoint);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages.map(({ content, role }) => ({ role, content })),
      }),
    });

    if (!res.ok) {
      throw new Error(res.statusText);
    }

    // This data is a ReadableStream
    const data = res.body;
    if (!data) {
      return;
    }

    const reader = data.getReader();
    const decoder = new TextDecoder();
    let done = false;

    let completion = '';
    const msg = Array.from(messages);

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      const chunkValue = decoder.decode(value);
      completion += chunkValue;
      if (isMessage) {
        setMessages([
          ...msg,
          {
            conversationId: selectedConversationId,
            role: 'assistant',
            content: completion,
            sender: false,
          },
        ]);
      } else {
        setState(completion);
      }
    }
    setLoading(false);
    return new Promise((resolve) => resolve(completion)) as Promise<string>;
  };

  useEffect(() => {
    const fetchConversations = async () => {
      const res = await fetch('api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      setConversations((await res.json()).data);
    };
    fetchConversations();
  }, []);

  useEffect(() => {
    if (messages.length === 1 && !selectedConversationId) {
      // wait for 3sec
      setTimeout(async () => {
        const completion = await fetchCompletionStream(
          'api/conversations/completion',
          setCurrentConversationTitle,
          currentConversationTitle
        );
        const res = await fetch('api/conversations/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: null,
            title: completion,
          }),
        });
        const conversationId = await res.json();
        setConversations([
          ...conversations,
          { id: conversationId, title: completion },
        ]);
        setSelectedConversationId(conversationId);
      }, 1000);
    }
    if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
      fetchCompletionStream(`api/${selectedItem}`, setAnswer, answer, true);
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    return () => {};
  }, [answer]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };

  return (
    <div className='container mx-auto px-8 sm:px-6 lg:px-20'>
      <div className='flex h-screen'>
        <div className='w-1/4 bg-white p-5'>
          <div className='py-3 px-5 h-full relative'>
            <Sidebar
              {...{
                conversations,
                setConversations,
                selectedConversationId,
                setSelectedConversationId,
                currentConversationTitle,
              }}
            />
          </div>
        </div>
        <div className='w-3/4 bg-gray-100'>
          <div className='flex-1 px-8 py-2 sm:p-6 justify-between flex flex-col h-screen'>
            <div className='flex sm:items-center justify-center pb-3 border-b-2 border-gray-200'>
              <div className='relative flex items-center space-x-4'>
                <div className='relative'>
                  <Dropdown
                    options={options}
                    setSelectedItem={setSelectedItem}
                    selectedItem={selectedItem}
                  />
                </div>
              </div>
            </div>
            <div
              id='messages'
              className='flex h-full flex-col space-y-4 p-3 overflow-y-auto scrollbar-thumb-blue scrollbar-thumb-rounded scrollbar-track-blue-lighter scrollbar-w-2 scrolling-touch'
            >
              {messages.map((message, index) => (
                <Message key={index} {...message} />
              ))}
              {/* {answer !== '' && <Message content={answer} sender={false} />} */}
              <div ref={messagesEndRef}></div>
            </div>
            {currentConversationTitle}
            <div className='text-sm border-t border-gray-200 px-4 pt-4 mb-2 sm:mb-0'>
              <div className='relative flex'>
                <input
                  type='text'
                  placeholder='How can I help you?'
                  className='w-full focus:outline-none focus:placeholder-gray-400 text-gray-600 placeholder-gray-600 pl-4 bg-gray-200 rounded-md py-3'
                  onKeyDown={handleKeyDown}
                  onChange={handleInputChange}
                  value={message}
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

type Conversation = { id: string; title: string };

// add component propos
interface SidebarProps {
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  selectedConversationId: string;
  setSelectedConversationId: React.Dispatch<React.SetStateAction<string>>;
  currentConversationTitle: string;
}

function Sidebar({
  conversations,
  setConversations,
  selectedConversationId,
  setSelectedConversationId,
  currentConversationTitle,
}: SidebarProps) {
  useEffect(() => {}, [currentConversationTitle]);

  const handleNewChat = () => {
    // if last conversation title is not empty
    if (
      conversations.length === 0 ||
      conversations[conversations.length - 1].title
    ) {
      setConversations([
        ...conversations,
        { id: `${conversations.length}`, title: '' },
      ]);
    }
  };

  return (
    <>
      <h3 className='text-xs font-semibold uppercase text-gray-400 mb-1'>
        Conversations
      </h3>
      <div className='divide-y divide-gray-200 relative h-full'>
        {conversations.map(
          ({ id, title }) =>
            title && (
              <button
                key={id}
                className='w-full text-left py-4 focus:outline-none focus-visible:bg-indigo-50'
              >
                <div className='flex items-center'>
                  <svg
                    stroke='currentColor'
                    fill='none'
                    strokeWidth='2'
                    viewBox='0 0 24 24'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    className='h-4 w-4 text-gray-400 p-1 mr-3'
                    height='2em'
                    width='2em'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'></path>
                  </svg>
                  <div>
                    <h4 className='text-sm text-gray-900'>
                      {title.length > 20
                        ? title.substring(0, 20) + '...'
                        : title}
                    </h4>
                    {/* <h4 className='text-sm text-gray-900'>{title}</h4> */}
                  </div>
                </div>
              </button>
            )
        )}
        <div className='absolute bottom-0 w-full'>
          <button
            onClick={handleNewChat}
            className='w-full text-left py-3 focus:outline-none focus-visible:bg-indigo-50'
          >
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
                <h4 className='text-sm text-gray-900'>Clear Chats</h4>
              </div>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}

type MessageProps = {
  content: string;
  sender?: boolean;
};

const Message: React.FC<MessageProps> = ({ content, sender = false }) => {
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
              <div>
                <ReactMarkdown
                  children={content}
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          children={String(children).replace(/\n$/, '')}
                          style={dark}
                          language={match[1]}
                          PreTag='div'
                          {...props}
                        />
                      ) : (
                        <SyntaxHighlighter
                          children={children}
                          style={dark}
                          language={'javascript'}
                          PreTag='div'
                          {...props}
                        />
                      );
                    },
                  }}
                />
              </div>
            </span>
          </div>
        </div>
        <img
          src='https://images.unsplash.com/photo-1590031905470-a1a1feacbb0b?ixlib=rb-1.2.1&amp;ixid=eyJhcHBfaWQiOjEyMDd9&amp;auto=format&amp;fit=facearea&amp;facepad=3&amp;w=144&amp;h=144'
          alt='User'
          className={`w-6 h-6 rounded-full order-${sender ? '2' : '1'}`}
        />
      </div>
    </div>
  );
};

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
