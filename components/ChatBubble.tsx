import React, { useEffect, useState } from 'react';
import { Message } from '../types';
import { CheckCheck, FileImage, Mic, Lock, Phone, Play, FileVideo } from 'lucide-react';
import JSZip from 'jszip';

interface ChatBubbleProps {
  message: Message;
  showTail: boolean;
  highlightText?: string;
  zipFile: JSZip | null;
}

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
};

// ... Helper components remain same ...
const HighlightedText = ({ text, highlight }: { text: string; highlight?: string }) => {
  if (!highlight) return <>{text}</>;
  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? 
          <span key={i} className="bg-yellow-200 text-gray-900">{part}</span> : 
          part
      )}
    </>
  );
};

const ContentWithLinks = ({ text, highlight }: { text: string; highlight?: string }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return (
    <span className="whitespace-pre-wrap break-words">
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[#027eb5] hover:underline"><HighlightedText text={part} highlight={highlight} /></a>;
        }
        return <React.Fragment key={i}><HighlightedText text={part} highlight={highlight} /></React.Fragment>;
      })}
    </span>
  );
};

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, showTail, highlightText, zipFile }) => {
  const { isMe, isSystem, content, timestamp, type, attachmentFileName } = message;
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(false);

  // Lazy Load Media
  useEffect(() => {
    let active = true;

    if (attachmentFileName && zipFile && !mediaUrl) {
        setLoadingMedia(true);
        
        // Find file in zip (case insensitive check)
        // ZIP file structure might be flattened or contain folders.
        const files = Object.keys(zipFile.files);
        const match = files.find(f => f.endsWith(attachmentFileName) || f.toLowerCase().endsWith(attachmentFileName.toLowerCase()));

        if (match) {
            zipFile.file(match)?.async('blob').then((blob) => {
                if (active) {
                    const url = URL.createObjectURL(blob);
                    setMediaUrl(url);
                    setLoadingMedia(false);
                }
            }).catch(() => {
                if (active) setLoadingMedia(false);
            });
        } else {
             if (active) setLoadingMedia(false);
        }
    }

    return () => {
        active = false;
        if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    };
  }, [attachmentFileName, zipFile]);

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <div className="bg-[#FFEECD] text-[#54656f] text-xs px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 max-w-[85%] text-center">
            {content.toLowerCase().includes('arama') ? <Phone size={12} /> : <Lock size={12} />}
            <span>{content}</span>
        </div>
      </div>
    );
  }

  // Hide the messy "<file attached>" text if we are displaying the image
  const displayContent = type === 'image' || type === 'video' || type === 'audio' 
    ? content.replace(/<.*eklendi>/, '').replace(/\(file attached\)/, '').trim()
    : content;

  return (
    <div className={`flex flex-col mb-1 ${isMe ? 'items-end' : 'items-start'} group`}>
      <div 
        className={`
          relative px-2 py-1.5 rounded-lg max-w-[85%] sm:max-w-[65%] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]
          ${isMe ? 'bg-[#d9fdd3] rounded-tr-none' : 'bg-white rounded-tl-none'}
          ${!showTail && 'rounded-tr-lg rounded-tl-lg'}
        `}
      >
        {/* Tail SVG */}
        {showTail && (
            <span className={`absolute top-0 ${isMe ? '-right-[8px]' : '-left-[8px]'}`}>
                <svg viewBox="0 0 8 13" height="13" width="8" className="block">
                    <path opacity="0.13" d={isMe ? "M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z" : "M2.812 1h5.188v11.193l-6.467-8.625C.474 2.156 1.042 1 2.812 1z"} fill="#000000"></path>
                    <path fill={isMe ? "#d9fdd3" : "#ffffff"} d={isMe ? "M5.188 0H0v11.193l6.467-8.625C7.526 1.156 6.958 0 5.188 0z" : "M2.812 0h5.188v11.193l-6.467-8.625C.474 1.156 1.042 0 2.812 0z"}></path>
                </svg>
            </span>
        )}

        {/* Media Content */}
        {type === 'image' && (
            <div className="mb-1 rounded-md overflow-hidden min-w-[200px] min-h-[150px] bg-[#f0f2f5] flex items-center justify-center">
                {mediaUrl ? (
                    <img src={mediaUrl} alt="Attachment" className="max-w-full max-h-[400px] object-cover" />
                ) : loadingMedia ? (
                    <div className="animate-pulse text-gray-400 text-xs">Yükleniyor...</div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-gray-500 gap-2 p-4">
                        <FileImage size={24} />
                        <span className="italic text-xs">{attachmentFileName || "Görüntü yok"}</span>
                    </div>
                )}
            </div>
        )}

        {type === 'video' && (
            <div className="mb-1 rounded-md overflow-hidden min-w-[200px] bg-black flex items-center justify-center relative">
                 {mediaUrl ? (
                     <video controls src={mediaUrl} className="max-w-full max-h-[400px]" />
                 ) : (
                     <div className="p-8 text-white flex flex-col items-center">
                         <FileVideo size={32} />
                         <span className="text-xs mt-2">{loadingMedia ? "Yükleniyor..." : "Video"}</span>
                     </div>
                 )}
            </div>
        )}
        
        {type === 'audio' && (
             <div className="flex items-center gap-3 bg-gray-100 p-2 rounded mb-1 min-w-[240px]">
                <div className="bg-gray-400 rounded-full p-2 text-white">
                    <Mic size={16} />
                </div>
                 {mediaUrl ? (
                     <audio controls src={mediaUrl} className="w-full h-8" />
                 ) : (
                    <div className="flex-1 flex flex-col justify-center">
                         <div className="h-1 bg-gray-300 w-full rounded-full overflow-hidden">
                            <div className="h-full bg-gray-400 w-1/2"></div>
                         </div>
                         <span className="text-xs text-gray-500 mt-1">{loadingMedia ? "Ses yükleniyor..." : "Ses dosyası"}</span>
                    </div>
                 )}
             </div>
        )}

        {/* Text Content */}
        {displayContent && (
            <div className={`text-[14.2px] leading-[19px] text-[#111b21] pb-1.5 break-words ${type !== 'text' ? 'mt-1' : ''}`}>
                 <ContentWithLinks text={displayContent} highlight={highlightText} />
            </div>
        )}

        {/* Metadata: Time & Status */}
        <div className="float-right flex items-center gap-1 ml-2 mt-[-10px] relative top-[4px]">
          <span className="text-[11px] text-[#667781] min-w-fit">
            {formatTime(timestamp)}
          </span>
          {isMe && (
            <span className="text-[#53bdeb]">
              <CheckCheck size={16} strokeWidth={1.5} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;