import { useEffect, useRef, useState } from 'react';
import { X, Camera, CameraOff } from 'lucide-react';

interface BarcodeDetectorOptions {
  formats?: string[];
}

interface Barcode {
  format: string;
  rawValue: string;
}

// Since we're using the experimental BarcodeDetector API, we need to handle types carefully

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [detectorSupported, setDetectorSupported] = useState(false);

  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        // Check if BarcodeDetector API is available
        const hasBarcodeDetector = 'BarcodeDetector' in window;
        if (!hasBarcodeDetector) {
          setError('BarcodeDetector non supporté par ce navigateur. Utilisez la recherche manuelle.');
          return;
        }

        // Try to create detector instance
        try {
          const DetectorClass = (window as any).BarcodeDetector;
          if (typeof DetectorClass === 'function') {
            await new DetectorClass();
            setDetectorSupported(true);
          } else {
            setError('API BarcodeDetector non disponible.');
            return;
          }
        } catch {
          setError('Impossible d\'initialiser le scanner.');
          return;
        }

        streamRef.current = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });

        if (mounted && videoRef.current) {
          videoRef.current.srcObject = streamRef.current;
          await videoRef.current.play();
          scanLoop();
        }
      } catch (err: any) {
        setError(err?.message || 'Impossible d\'accéder à la caméra.');
      }
    };

    const scanLoop = async () => {
      if (!mounted) return;

      try {
        const DetectorClass = (window as any).BarcodeDetector;
        if (typeof DetectorClass === 'function' && videoRef.current) {
          const detector = new DetectorClass();
          const barcodes = await detector.detect(videoRef.current);
          detector.close();
          if (barcodes.length > 0 && barcodes[0].rawValue) {
            onScan(barcodes[0].rawValue);
            return;
          }
        }
      } catch {
        // Ignore scan errors, retry
      }

      if (mounted) {
        requestAnimationFrame(scanLoop);
      }
    };

    const stopCamera = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };

    startCamera();

    return () => {
      mounted = false;
      stopCamera();
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 bg-black/50">
        <h3 className="text-white font-bold">Scanner un code-barres</h3>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 relative bg-black">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
            <CameraOff size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-semibold mb-2">Caméra indisponible</p>
            <p className="text-gray-300 text-sm mb-6">{error}</p>
            <button
              onClick={onClose}
              className="btn btn-primary btn-md"
            >
              Retour à la recherche
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-32 border-2 border-emerald-400 rounded-lg relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6 text-center">
              <p className="text-white text-sm">Positionnez le code-barres dans le cadre</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}