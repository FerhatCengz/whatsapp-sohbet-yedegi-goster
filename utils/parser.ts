import { Message, ChatData, ChatParticipant } from '../types';
import JSZip from 'jszip';

export const getRandomColor = (name: string) => {
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500', 
    'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-blue-500', 
    'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Parses the chat text extremely fast by avoiding immediate heavy lifting.
 */
export const parseChatFile = (text: string, zipFile: JSZip | null, myName: string | null = null): ChatData => {
  const lines = text.split('\n');
  const messages: Message[] = [];
  const participantsMap = new Map<string, ChatParticipant>();
  const sendersSet = new Set<string>();

  // [Date Time] Sender: Message
  // Updated Regex: Supports both "/" (6/27/24) and "." (28.11.2024) separators
  const msgStartRegex = /^\[(\d{1,2}[./]\d{1,2}[./]\d{2,4})\s+(ÖÖ|ÖS|AM|PM)?\s*(\d{1,2}:\d{2}:\d{2})\]\s+(.*?):\s+(.*)/;
  
  // Format 1: filename (file attached) or (dosya eklendi) -> iOS/Old
  // Format 2: <filename eklendi> -> Android TR
  // We capture the filename.
  const attachmentRegexOld = /([a-zA-Z0-9_\-\.\s]+\.(jpg|jpeg|png|mp4|opus|mp3|pdf|webp|mov))\s+(\(file attached\)|\(dosya eklendi\))/i;
  const attachmentRegexNew = /<([a-zA-Z0-9_\-\.\s]+\.(jpg|jpeg|png|mp4|opus|mp3|pdf|webp|mov))\s+eklendi>/i;

  let currentMessage: Message | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/[\u200E\u200F]/g, '').trim(); 
    if (!line) continue;

    const match = line.match(msgStartRegex);

    if (match) {
      if (currentMessage) messages.push(currentMessage);

      const [, dateStr, amPm, timeStr, senderNameRaw, contentStart] = match;
      const senderName = senderNameRaw.trim();
      sendersSet.add(senderName);

      // --- Date Parsing Logic Update ---
      let day, month, year;
      
      if (dateStr.includes('.')) {
          // Turkish/European Format: DD.MM.YYYY (e.g., 28.11.2024)
          [day, month, year] = dateStr.split('.').map(Number);
      } else {
          // US Format: MM/DD/YYYY (e.g., 6/27/24)
          [month, day, year] = dateStr.split('/').map(Number);
      }

      // Time Parsing
      const [hoursStr, minutesStr, secondsStr] = timeStr.split(':');
      let hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      const seconds = parseInt(secondsStr, 10);

      if (amPm === 'ÖS' || amPm === 'PM') {
        if (hours !== 12) hours += 12;
      } else if (amPm === 'ÖÖ' || amPm === 'AM') {
        if (hours === 12) hours = 0;
      }

      const fullYear = year < 100 ? 2000 + year : year;
      const timestamp = new Date(fullYear, month - 1, day, hours, minutes, seconds);

      let type: Message['type'] = 'text';
      let attachmentFileName: string | undefined = undefined;

      // Check System Messages
      const lowerContent = contentStart.toLowerCase();
      if (lowerContent.includes('görüntü dahil edilmedi')) type = 'image';
      else if (lowerContent.includes('ses dahil edilmedi')) type = 'audio';
      else if (lowerContent.includes('güvenlik kodu değişti')) type = 'system';
      else if (lowerContent.includes('görüntülü arama')) type = 'system';
      else if (lowerContent.includes('sesli arama')) type = 'system';
      
      // Check Attachments
      const attachMatchNew = contentStart.match(attachmentRegexNew);
      const attachMatchOld = contentStart.match(attachmentRegexOld);

      if (attachMatchNew) {
          attachmentFileName = attachMatchNew[1];
      } else if (attachMatchOld) {
          attachmentFileName = attachMatchOld[1];
      }

      if (attachmentFileName) {
          const ext = attachmentFileName.split('.').pop()?.toLowerCase();
          if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) type = 'image';
          else if (['opus', 'mp3', 'wav', 'aac', 'm4a'].includes(ext || '')) type = 'audio';
          else if (['mp4', 'mov'].includes(ext || '')) type = 'video';
      }

      const isMe = myName ? senderName === myName : false;

      currentMessage = {
        id: `msg-${i}`,
        rawDate: `${dateStr} ${hours}:${minutesStr}`,
        timestamp,
        sender: senderName,
        content: contentStart, 
        isMe,
        isSystem: type === 'system',
        type,
        attachmentFileName
      };

      if (!isMe && type !== 'system') {
         if (!participantsMap.has(senderName)) {
             participantsMap.set(senderName, {
                 name: senderName,
                 lastMessage: contentStart,
                 lastMessageDate: timestamp,
                 avatarColor: getRandomColor(senderName)
             });
         } else {
             const p = participantsMap.get(senderName)!;
             p.lastMessage = contentStart;
             p.lastMessageDate = timestamp;
         }
      }

    } else {
      // Append multi-line messages
      if (currentMessage) {
        currentMessage.content += '\n' + line;
      }
    }
  }

  if (currentMessage) messages.push(currentMessage);

  const participants = Array.from(participantsMap.values()).sort((a, b) => b.lastMessageDate.getTime() - a.lastMessageDate.getTime());
  const allSenders = Array.from(sendersSet);

  return { messages, participants, allSenders, zipFile };
};