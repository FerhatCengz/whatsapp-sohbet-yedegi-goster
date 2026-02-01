import React, { useState, useRef, useMemo } from 'react';
import { Message, ChatParticipant } from '../types';
import ChatBubble from './ChatBubble';
import { Search, MoreVertical, Paperclip, Smile, Mic, ArrowLeft, Phone, Video, X } from 'lucide-react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import JSZip from 'jszip';

interface ChatInterfaceProps {
  messages: Message[];
  participants: ChatParticipant[];
  currentUserName: string;
  onBack: () => void;
  zipFile: JSZip | null;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, participants, currentUserName, onBack, zipFile }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const otherParticipants = participants.filter(p => p.name !== currentUserName);
  const chatTitle = otherParticipants.length === 1 
    ? otherParticipants[0].name 
    : otherParticipants.length > 1 
        ? otherParticipants.map(p => p.name).join(', ').substring(0, 30) + '...'
        : 'Sohbet';
  
  const avatarColor = otherParticipants.length > 0 ? otherParticipants[0].avatarColor : 'bg-gray-400';

  const filteredMessages = useMemo(() => {
    if (!searchTerm) return messages;
    return messages.filter(m => 
        m.content && m.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [messages, searchTerm]);

  // Focus search input when opened
  React.useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
        searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#d1d7db] md:p-5">
      <div className="flex h-full w-full max-w-[1200px] mx-auto bg-white shadow-lg overflow-hidden md:rounded-lg">
        
        <div className="flex-1 flex flex-col bg-[#efeae2] relative w-full">
            
            <div className="absolute inset-0 opacity-40 pointer-events-none" 
                 style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}>
            </div>

            {/* Header */}
            <div className="h-[60px] bg-[#f0f2f5] px-4 flex items-center justify-between shrink-0 z-10 border-b border-gray-200">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="text-[#54656f] hover:bg-gray-200 p-2 rounded-full" title="Geri">
                        <ArrowLeft size={20} />
                    </button>
                    <div className={`w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center text-white text-lg font-semibold cursor-pointer`}>
                        {chatTitle.substring(0, 1).toUpperCase()}
                    </div>
                    <div className="flex flex-col justify-center cursor-pointer min-w-0">
                        <h2 className="text-[#111b21] text-[16px] font-semibold leading-tight truncate max-w-[200px] sm:max-w-md">{chatTitle}</h2>
                        <p className="text-[13px] text-[#667781] leading-tight truncate">
                            {otherParticipants.length > 0 ? 'tıkla ve kişi bilgisi gör' : 'Kişisel Notlar'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 text-[#54656f]">
                        <div className={`flex items-center bg-white rounded-full transition-all duration-300 shadow-sm ${isSearchOpen ? 'w-48 sm:w-64 px-3 py-1.5' : 'w-10 h-10 justify-center hover:bg-gray-200 cursor-pointer'}`}>
                            {isSearchOpen ? (
                                <>
                                    <Search size={18} className="text-gray-500 shrink-0" />
                                    <input 
                                        ref={searchInputRef}
                                        type="text" 
                                        className="ml-2 w-full outline-none text-sm bg-transparent"
                                        placeholder="Ara..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    <button onClick={() => {setSearchTerm(''); setIsSearchOpen(false)}} className="ml-1 text-gray-500 hover:text-red-500">
                                        <X size={16} />
                                    </button>
                                </>
                            ) : (
                                <button onClick={() => setIsSearchOpen(true)} className="w-full h-full flex items-center justify-center">
                                    <Search size={20} />
                                </button>
                            )}
                        </div>

                        <button className="hidden sm:block hover:bg-gray-200 p-2 rounded-full"><Video size={20} /></button>
                        <button className="hidden sm:block hover:bg-gray-200 p-2 rounded-full"><Phone size={20} /></button>
                        <button className="hover:bg-gray-200 p-2 rounded-full"><MoreVertical size={20} /></button>
                </div>
            </div>

            {/* Virtualized Messages Area */}
            <div className="flex-1 z-10 w-full relative">
                {filteredMessages.length === 0 && searchTerm ? (
                    <div className="flex justify-center mt-10">
                        <div className="bg-white px-4 py-2 rounded shadow text-gray-600 text-sm">
                            "{searchTerm}" ile ilgili mesaj bulunamadı.
                        </div>
                    </div>
                ) : (
                    <Virtuoso
                        ref={virtuosoRef}
                        data={filteredMessages}
                        initialTopMostItemIndex={filteredMessages.length - 1} // Start at bottom
                        followOutput="auto" // Auto scroll on new messages or initially
                        alignToBottom // Important for chat
                        className="custom-scrollbar"
                        style={{ height: '100%', width: '100%' }}
                        itemContent={(index, msg) => {
                             // Determine tail logic
                             const prevMsg = filteredMessages[index - 1];
                             const isFirstInSequence = !prevMsg || prevMsg.sender !== msg.sender || prevMsg.isSystem;
                             
                             // Date Separator
                             let dateSeparator = null;
                             const msgDate = new Date(msg.timestamp).setHours(0,0,0,0);
                             const prevDate = prevMsg ? new Date(prevMsg.timestamp).setHours(0,0,0,0) : 0;
                             
                             if (msgDate !== prevDate) {
                                 dateSeparator = (
                                     <div className="flex justify-center my-4 sticky top-2 z-20">
                                         <div className="bg-[#FFFFFF] shadow-sm text-[#54656f] text-[12.5px] px-3 py-1.5 rounded-lg uppercase font-medium">
                                             {msg.timestamp.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                         </div>
                                     </div>
                                 );
                             }

                             return (
                                 <div className="px-4 sm:px-8 py-1">
                                     {dateSeparator}
                                     <ChatBubble 
                                         message={msg} 
                                         showTail={isFirstInSequence} 
                                         highlightText={searchTerm.length > 1 ? searchTerm : undefined}
                                         zipFile={zipFile}
                                     />
                                 </div>
                             );
                        }}
                    />
                )}
            </div>

            {/* Input Area (Visual Only) */}
            <div className="min-h-[62px] bg-[#f0f2f5] px-4 py-2 flex items-end gap-2 shrink-0 z-10">
                <div className="mb-2 flex gap-3 text-[#54656f]">
                    <button><Smile size={24} /></button>
                    <button><Paperclip size={24} /></button>
                </div>
                <div className="flex-1 bg-white rounded-lg min-h-[42px] max-h-[100px] flex items-center px-4 py-2 mb-1">
                    <input 
                        type="text" 
                        placeholder="Bir mesaj yazın" 
                        className="w-full bg-transparent outline-none text-[15px] placeholder-[#54656f]"
                        disabled
                    />
                </div>
                <div className="mb-2 text-[#54656f]">
                        <button><Mic size={24} /></button>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default ChatInterface;