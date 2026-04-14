import React, { useEffect, useState } from 'react';

const AutoUpdaterUI: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [status, setStatus] = useState('');
    const [progress, setProgress] = useState(0);
    const [isDownloaded, setIsDownloaded] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.updater) {
            return;
        }

        const updater = window.electronAPI.updater;

        updater.onCheckingForUpdate(() => {
            setIsVisible(true);
            setStatus('Checking for updates...');
        });

        updater.onUpdateAvailable(() => {
            setIsVisible(true);
            setStatus('Update available! Downloading...');
        });

        updater.onUpdateNotAvailable(() => {
            // Hide if checking silently in background
            setIsVisible(false);
        });

        updater.onError((err) => {
            setStatus('Update error: ' + err);
            setTimeout(() => setIsVisible(false), 5000);
        });

        updater.onDownloadProgress((progressObj) => {
            setIsVisible(true);
            setStatus(`Downloading update...`);
            setProgress(Math.round(progressObj.percent));
        });

        updater.onUpdateDownloaded(() => {
            setIsVisible(true);
            setStatus('Update ready to install!');
            setIsDownloaded(true);
        });

        return () => {
             updater.removeListeners();
        };
    }, []);

    const handleInstall = () => {
        if (window.electronAPI && window.electronAPI.updater) {
            window.electronAPI.updater.install();
        }
    }

    const handleDismiss = () => {
        setIsVisible(false);
    }

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 p-4 bg-white rounded-lg shadow-xl border border-gray-200 w-80 text-gray-800 transition-all duration-300 transform translate-y-0">
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-sm text-blue-600">App Update</h3>
                <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            
            <div className="mb-4">
                <p className="text-sm text-gray-600">{status}</p>
                {progress > 0 && !isDownloaded && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-3 overflow-hidden">
                      <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                )}
            </div>

            {isDownloaded && (
                <div className="flex gap-2 justify-end mt-4">
                    <button 
                        onClick={handleDismiss} 
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors focus:ring-2 focus:ring-gray-200 outline-none"
                    >
                        Later
                    </button>
                    <button 
                        onClick={handleInstall} 
                        className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        Restart Now
                    </button>
                </div>
            )}
        </div>
    );
};

export default AutoUpdaterUI;
