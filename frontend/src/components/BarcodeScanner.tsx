import { useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';

interface BarcodeScannerProps {
    onScan: (value: string) => void;
    onClose: () => void;
}

const BarcodeScanner = ({ onScan, onClose }: BarcodeScannerProps) => {
    const [code, setCode] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (code.trim()) {
            onScan(code.trim());
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-700">Scan Location</h3>
                    <Button icon="pi pi-times" onClick={onClose} className="p-button-text p-button-rounded p-button-secondary" />
                </div>
                <div className="p-6">
                    <p className="text-sm text-gray-500 mb-4 text-center">
                        Simulate a barcode scan by entering the location code below.
                        <br />
                        <span className="text-xs italic">(Example: LOC-001)</span>
                    </p>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <InputText
                            autoFocus
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="Enter location code..."
                            className="w-full text-center text-lg py-3 font-mono"
                        />
                        <Button
                            type="submit"
                            label="Simulate Scan"
                            icon="pi pi-qrcode"
                            className="w-full"
                            disabled={!code.trim()}
                        />
                    </form>
                </div>
                <div className="p-4 bg-gray-50 border-t flex justify-center text-xs text-gray-400">
                    Powered by WMS Scanner Simulator
                </div>
            </div>
        </div>
    );
};

export default BarcodeScanner;
