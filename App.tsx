import React, { useState } from 'react';
import { parseChatFile, getRandomColor } from './utils/parser';
import { ChatData } from './types';
import ChatInterface from './components/ChatInterface';
import { FileText, AlertCircle, FileArchive, User, Check } from 'lucide-react';
import JSZip from 'jszip';

type AppStep = 'UPLOAD' | 'SELECT_IDENTITY' | 'CHAT';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('UPLOAD');
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [potentialOwners, setPotentialOwners] = useState<string[]>([]);
  const [currentOwner, setCurrentOwner] = useState<string>("");

  const handleFileProcess = async (file: File) => {
    setLoading(true);
    setError(null);

    // Use a small timeout to allow UI to show loading spinner before main thread freeze
    setTimeout(async () => {
        try {
            let textContent = "";
            let zipInstance: JSZip | null = null;

            if (file.name.endsWith('.zip')) {
                const zip = new JSZip();
                // This might still take time for huge ZIPs, but we can't avoid it entirely in browser.
                const contents = await zip.loadAsync(file);
                const filesArray = Object.values(contents.files) as JSZip.JSZipObject[];
                
                // Find _chat.txt
                const chatFile = filesArray.find(f => f.name.endsWith('_chat.txt'));
                
                if (!chatFile) {
                    throw new Error("ZIP dosyasının içinde '_chat.txt' bulunamadı.");
                }

                textContent = await chatFile.async('string');
                zipInstance = zip;

            } else if (file.name.endsWith('.txt')) {
                textContent = await file.text();
            } else {
                 throw new Error("Lütfen .txt veya .zip uzantılı bir dosya seçin.");
            }

            // Parse Chat - Fast regex pass only
            const data = parseChatFile(textContent, zipInstance, null);
            
            if (data.allSenders.length === 0) {
                 throw new Error("Sohbet dosyasında konuşmacı bulunamadı. Format desteklenmiyor olabilir.");
            }

            setChatData(data);
            setPotentialOwners(data.allSenders);
            setStep('SELECT_IDENTITY');

        } catch (e: any) {
            setError(e.message || "Dosya işlenirken hata oluştu.");
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, 100);
  };

  const handleIdentitySelect = (name: string) => {
      if (!chatData) return;
      setCurrentOwner(name);

      // Re-map the messages with the selected 'Me'
      // This is fast enough for <100k messages usually.
      const updatedMessages = chatData.messages.map(msg => ({
          ...msg,
          isMe: msg.sender === name
      }));
      
      const updatedParticipants = chatData.participants.filter(p => p.name !== name);

      setChatData({
          ...chatData,
          messages: updatedMessages,
          participants: updatedParticipants
      });
      
      setStep('CHAT');
  };

  const resetApp = () => {
      setChatData(null);
      setStep('UPLOAD');
      setPotentialOwners([]);
      setCurrentOwner("");
      setError(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
  };

  if (step === 'CHAT' && chatData) {
    return (
        <ChatInterface 
            messages={chatData.messages} 
            participants={chatData.participants}
            currentUserName={currentOwner}
            onBack={resetApp}
            zipFile={chatData.zipFile}
        />
    );
  }

  if (step === 'SELECT_IDENTITY') {
      return (
        <div className="min-h-screen bg-[#d1d7db] flex items-center justify-center p-4">
             <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg w-full">
                <div className="flex flex-col items-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
                        <User size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Kimsin?</h2>
                    <p className="text-gray-600 text-center mt-2">
                        Sohbetin doğru görüntülenmesi için lütfen bu sohbetteki kendi ismini seç.
                    </p>
                </div>
                
                <div className="grid gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                    {potentialOwners.map((name, idx) => (
                        <button 
                            key={idx}
                            onClick={() => handleIdentitySelect(name)}
                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-left group"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full ${getRandomColor(name)} flex items-center justify-center text-white font-bold`}>
                                    {name.substring(0, 1).toUpperCase()}
                                </div>
                                <span className="font-semibold text-gray-700">{name}</span>
                            </div>
                            <Check className="text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
                        </button>
                    ))}
                </div>
                
                <button onClick={resetApp} className="mt-6 w-full text-gray-500 text-sm hover:underline">
                    Vazgeç ve Dosya Seçimine Dön
                </button>
             </div>
        </div>
      );
  }

  return (
      <div className="min-h-screen bg-[#d1d7db] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center relative overflow-hidden">
            {loading && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 flex-col gap-3">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
                    <span className="text-green-700 font-semibold animate-pulse">Sohbet İşleniyor...</span>
                </div>
            )}

            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">WhatsApp Sohbet Görüntüleyici</h1>
            <p className="text-gray-600 mb-6 text-sm">
                WhatsApp'tan dışa aktardığınız <code>_chat.txt</code> dosyasını veya medya içeren <code>.zip</code> dosyasını yükleyin.
            </p>
            
            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4 flex items-center gap-2 text-left">
                    <AlertCircle size={16} className="shrink-0" />
                    {error}
                </div>
            )}

            <label className="block w-full cursor-pointer group">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-green-500 hover:bg-green-50 transition-colors flex flex-col items-center gap-2">
                        <div className="flex gap-4 mb-2">
                             <FileArchive className="text-gray-400 group-hover:text-green-500" size={32} />
                             <FileText className="text-gray-400 group-hover:text-green-500" size={32} />
                        </div>
                        <span className="text-gray-700 font-semibold text-lg">Dosya Seç</span>
                        <span className="text-gray-500 text-xs">.txt veya .zip</span>
                </div>
                <input type="file" accept=".txt,.zip" className="hidden" onChange={handleFileUpload} />
            </label>
        </div>
      </div>
  );
};

export default App;