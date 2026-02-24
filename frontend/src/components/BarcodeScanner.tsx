import { useEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
    onScan: (value: string) => void;
    onClose: () => void;
}

const BarcodeScanner = ({ onScan, onClose }: BarcodeScannerProps) => {
    const [code, setCode] = useState('');
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const runningRef = useRef(false);
    const containerId = 'qr-reader-container';

    useEffect(() => {
        let cancelled = false;

        const startScanner = async () => {
            try {
                const scanner = new Html5Qrcode(containerId);
                scannerRef.current = scanner;

                await scanner.start(
                    { facingMode: 'environment' },
                    {
                        fps: 10,
                        qrbox: { width: 200, height: 200 },
                    },
                    (decodedText) => {
                        if (!cancelled) {
                            cancelled = true;
                            runningRef.current = false;
                            scanner.stop().catch(() => { });
                            onScan(decodedText);
                        }
                    },
                    () => {
                        // QR code not found in frame — keep scanning
                    }
                );

                if (!cancelled) {
                    runningRef.current = true;
                    setIsScanning(true);
                }
            } catch (err: any) {
                if (!cancelled) {
                    setCameraError(err?.message || 'Unable to access camera');
                }
            }
        };

        startScanner();

        return () => {
            cancelled = true;
            if (scannerRef.current && runningRef.current) {
                runningRef.current = false;
                scannerRef.current.stop().catch(() => { });
            }
            scannerRef.current = null;
        };
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (code.trim()) {
            if (scannerRef.current && runningRef.current) {
                runningRef.current = false;
                scannerRef.current.stop().catch(() => { });
            }
            onScan(code.trim());
        }
    };

    const handleClose = () => {
        if (scannerRef.current && runningRef.current) {
            runningRef.current = false;
            scannerRef.current.stop().catch(() => { });
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-700">Scan Location</h3>
                    <Button icon="pi pi-times" onClick={handleClose} className="p-button-text p-button-rounded p-button-secondary" />
                </div>

                <div className="p-4 grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                        <p className="text-xs text-gray-500 mb-1">
                            Point your camera at a QR code. When detected,
                            the location will be looked up automatically.
                        </p>
                        <div className="rounded-lg overflow-hidden border bg-black/80 flex items-center justify-center" style={{ minHeight: '220px' }}>
                            <div id={containerId} style={{ width: '100%' }} />
                            {!isScanning && !cameraError && (
                                <span className="absolute text-xs text-gray-200">Starting camera…</span>
                            )}
                        </div>
                        {cameraError && (
                            <p className="text-xs text-red-500 mt-1">
                                Camera error: {cameraError}. You can still use manual entry.
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col gap-3">
                        <p className="text-xs text-gray-500">
                            Or manually enter the location identifier (for example, the MongoDB
                            Location ID encoded in the QR).
                        </p>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                            <InputText
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="Paste / type location id..."
                                className="w-full text-xs py-2 font-mono"
                            />
                            <Button
                                type="submit"
                                label="Lookup Location"
                                icon="pi pi-search"
                                className="w-full"
                                disabled={!code.trim()}
                            />
                        </form>
                    </div>
                </div>

                <div className="p-3 bg-gray-50 border-t flex justify-center text-xs text-gray-400">
                    Camera scan + manual entry supported
                </div>
            </div>
        </div>
    );
};

export default BarcodeScanner;
