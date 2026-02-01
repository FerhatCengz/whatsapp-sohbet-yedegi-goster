import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Message, ChatParticipant } from '../types';
import ChatBubble from './ChatBubble';
import { Search, MoreVertical, Paperclip, Smile, Mic, ArrowLeft, Phone, Video, X, Calendar, CalendarDays } from 'lucide-react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import JSZip from 'jszip';
import { DayPicker, DateRange } from 'react-day-picker';
import { tr } from 'date-fns/locale';
import { format, isSameDay, startOfDay, endOfDay } from 'date-fns';

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
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const calendarContainerRef = useRef<HTMLDivElement>(null);
  
  const otherParticipants = participants.filter(p => p.name !== currentUserName);
  const chatTitle = otherParticipants.length === 1 
    ? otherParticipants[0].name 
    : otherParticipants.length > 1 
        ? otherParticipants.map(p => p.name).join(', ').substring(0, 30) + '...'
        : 'Sohbet';
  
  const avatarColor = otherParticipants.length > 0 ? otherParticipants[0].avatarColor : 'bg-gray-400';

  // Calculate Min and Max dates from messages for the Calendar constraints
  const { minDate, maxDate } = useMemo(() => {
      if (messages.length === 0) return { minDate: new Date(), maxDate: new Date() };
      return {
          minDate: messages[0].timestamp,
          maxDate: messages[messages.length - 1].timestamp
      };
  }, [messages]);

  // Filter messages based on Search AND Date Range
  const filteredMessages = useMemo(() => {
    let filtered = messages;

    // 1. Date Filter
    if (dateRange?.from) {
        const from = startOfDay(dateRange.from);
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);

        filtered = filtered.filter(m => m.timestamp >= from && m.timestamp <= to);
    }

    // 2. Text Search Filter
    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        filtered = filtered.filter(m => 
            m.content && m.content.toLowerCase().includes(lowerTerm)
        );
    }

    return filtered;
  }, [messages, searchTerm, dateRange]);

  // Handle outside click to close calendar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarContainerRef.current && !calendarContainerRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
        searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Close calendar if search opens
  useEffect(() => {
      if (isSearchOpen) setIsCalendarOpen(false);
  }, [isSearchOpen]);

  const handleDaySelect = (range: DateRange | undefined) => {
      setDateRange(range);
      // Don't close immediately to allow range selection
  };

  const clearDateFilter = () => {
      setDateRange(undefined);
      setIsCalendarOpen(false);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#d1d7db] md:p-5">
      <div className="flex h-full w-full max-w-[1200px] mx-auto bg-white shadow-lg overflow-hidden md:rounded-lg">
        
        <div className="flex-1 flex flex-col bg-[#efeae2] relative w-full">
            
            <div className="absolute inset-0 opacity-40 pointer-events-none" 
                 style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}>
            </div>

            {/* Header */}
            <div className="h-[60px] bg-[#f0f2f5] px-4 flex items-center justify-between shrink-0 z-20 border-b border-gray-200 relative">
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
                            {dateRange?.from ? (
                                <span className="text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-md">
                                    {format(dateRange.from, 'd MMM yyyy', { locale: tr })} 
                                    {dateRange.to ? ` - ${format(dateRange.to, 'd MMM yyyy', { locale: tr })}` : ''}
                                </span>
                            ) : (
                                otherParticipants.length > 0 ? 'tıkla ve kişi bilgisi gör' : 'Kişisel Notlar'
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 text-[#54656f]">
                        
                        {/* Search Bar */}
                        <div className={`flex items-center bg-white rounded-full transition-all duration-300 shadow-sm z-30 ${isSearchOpen ? 'absolute right-4 w-64 px-3 py-1.5' : 'w-10 h-10 justify-center hover:bg-gray-200 cursor-pointer relative'}`}>
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
                                <button onClick={() => setIsSearchOpen(true)} className="w-full h-full flex items-center justify-center" title="Ara">
                                    <Search size={20} />
                                </button>
                            )}
                        </div>

                        {/* Calendar Button & Popover */}
                        <div className="relative" ref={calendarContainerRef}>
                            <button 
                                onClick={() => setIsCalendarOpen(!isCalendarOpen)} 
                                className={`w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors ${isCalendarOpen || dateRange ? 'text-[#00a884] bg-green-100 shadow-inner' : ''}`}
                                title="Tarihe Göre Filtrele"
                            >
                                <CalendarDays size={20} strokeWidth={isCalendarOpen || dateRange ? 2.5 : 2} />
                            </button>

                            {/* Enhanced Calendar Popover */}
                            {isCalendarOpen && (
                                <div className="absolute top-14 right-[-10px] md:right-0 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-2xl p-5 z-50 border border-gray-100 animate-in fade-in zoom-in-95 duration-100 origin-top-right min-w-[340px]">
                                    
                                    {/* Popover Header */}
                                    <div className="flex items-center justify-between mb-2 pb-3 border-b border-gray-100">
                                        <div className="flex items-center gap-2 text-[#00a884]">
                                            <CalendarDays size={20} />
                                            <span className="font-bold text-lg">Tarih Seçimi</span>
                                        </div>
                                        <button 
                                            onClick={() => setIsCalendarOpen(false)}
                                            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    <DayPicker
                                        mode="range"
                                        selected={dateRange}
                                        onSelect={handleDaySelect}
                                        locale={tr}
                                        fromDate={minDate}
                                        toDate={maxDate}
                                        disabled={{ after: maxDate, before: minDate }}
                                        captionLayout="dropdown"
                                        showOutsideDays={false}
                                    />
                                    
                                    {/* Popover Footer */}
                                    <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col gap-2">
                                        <div className="text-xs text-gray-500 text-center">
                                            {format(minDate, 'd MMM yyyy', {locale: tr})} ile {format(maxDate, 'd MMM yyyy', {locale: tr})} arası kayıtlı.
                                        </div>
                                        {dateRange && (
                                            <button 
                                                onClick={clearDateFilter}
                                                className="w-full py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-semibold text-sm flex items-center justify-center gap-2"
                                            >
                                                <X size={16} />
                                                Filtreyi Temizle
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button className="hidden sm:block hover:bg-gray-200 p-2 rounded-full"><Video size={20} /></button>
                        <button className="hidden sm:block hover:bg-gray-200 p-2 rounded-full"><Phone size={20} /></button>
                        <button className="hover:bg-gray-200 p-2 rounded-full"><MoreVertical size={20} /></button>
                </div>
            </div>

            {/* Virtualized Messages Area */}
            <div className="flex-1 z-10 w-full relative">
                {filteredMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white/50 backdrop-blur-sm m-4 rounded-xl">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                            <Search size={32} />
                        </div>
                        <p className="text-[#111b21] font-semibold text-lg mb-2">Mesaj Bulunamadı</p>
                        <p className="text-[#54656f] text-sm max-w-xs">
                            {dateRange 
                                ? "Seçilen tarih aralığında herhangi bir mesaj bulunmuyor." 
                                : searchTerm ? `"${searchTerm}" aramasıyla eşleşen mesaj yok.` : "Sohbet geçmişi boş."}
                        </p>
                        {dateRange && (
                            <button 
                                onClick={clearDateFilter} 
                                className="mt-6 px-6 py-2 bg-[#00a884] text-white rounded-full font-semibold shadow-md hover:bg-[#008f6f] transition-all"
                            >
                                Tüm Mesajları Göster
                            </button>
                        )}
                    </div>
                ) : (
                    <Virtuoso
                        ref={virtuosoRef}
                        data={filteredMessages}
                        initialTopMostItemIndex={filteredMessages.length - 1} // Start at bottom
                        followOutput="auto" 
                        alignToBottom 
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
                                         <div className="bg-[#FFFFFF] shadow-[0_1px_2px_rgba(11,20,26,0.1)] text-[#54656f] text-[12.5px] px-3 py-1.5 rounded-lg uppercase font-medium tracking-wide">
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