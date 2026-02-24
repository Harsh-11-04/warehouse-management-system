import { useEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';

interface BarcodeScannerProps {
    onScan: (value: string) => void;
    onClose: () => void;
}

const BarcodeScanner = ({ onScan, onClose }: BarcodeScannerProps) => {
    const [code, setCode] = useState('');
    const [cameraError, setCameraError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        let stream: MediaStream | null = null;
        let cancelled = false;

        const startCamera = async () => {
            try {
                if (!navigator.mediaDevices?.getUserMedia) {
                    setCameraError('Camera not supported in this browser');
                    return;
                }

                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' },
                });

                if (!videoRef.current) return;

                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setIsScanning(true);

                const Detector = (window as any).BarcodeDetector;
                if (!Detector) {
                    setCameraError('BarcodeDetector API not available; use manual entry.');
                    return;
                }

                const detector = new Detector({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13'] });

                const scanFrame = async () => {
                    if (cancelled || !videoRef.current) return;
                    try {
                        const barcodes = await detector.detect(videoRef.current);
                        if (barcodes && barcodes.length > 0) {
                            const value = barcodes[0].rawValue || barcodes[0].rawValue || barcodes[0].rawValue;
                            if (value) {
                                onScan(value);
                                return;
                            }
                        }
                    } catch (err) {
                        // swallow detection errors and keep trying
                    }
                    requestAnimationFrame(scanFrame);
                };

                requestAnimationFrame(scanFrame);
            } catch (err: any) {
                setCameraError(err?.message || 'Unable to access camera');
            }
        };

        startCamera();

        return () => {
            cancelled = true;
            setIsScanning(false);
            if (stream) {
                stream.getTracks().forEach((t) => t.stop());
            }
        };
    }, [onScan]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (code.trim()) {
            onScan(code.trim());
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-700">Scan Location</h3>
                    <Button icon="pi pi-times" onClick={onClose} className="p-button-text p-button-rounded p-button-secondary" />
                </div>

                <div className="p-4 grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                        <p className="text-xs text-gray-500 mb-1">
                            Point your camera at the rack/bin QR or barcode. When a code is detected,
                            the location will be looked up automatically.
                        </p>
                        <div className="rounded-lg overflow-hidden border bg-black/80 flex items-center justify-center h-[220px]">
                            <video
                                ref={videoRef}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                            />
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
