// pages/user/MyBarcode.tsx
import { useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { Download, CheckCircle2 } from "lucide-react";

export default function MyBarcode() {
  const [searchParams] = useSearchParams();
  const barcodeId = searchParams.get("id") || "00214"; // Fallback ID if param is missing
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const canvas = containerRef.current?.querySelector("canvas");
    if (!canvas) return;

    const image = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = image;
    link.download = `kiosk-pass-${barcodeId}.png`;
    link.click();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-8 text-gray-800">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl border border-gray-100">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
          <CheckCircle2 size={24} />
        </div>

        <h1 className="text-xl font-bold">Kiosk Check-In Pass</h1>
        <p className="mt-1 text-xs text-gray-500">
          Patient ID: <span className="font-mono font-bold text-gray-700">{barcodeId}</span>
        </p>

        {/* High-Contrast Barcode Canvas for Easy Kiosk Scanning */}
        <div ref={containerRef} className="my-6 flex justify-center rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <QRCodeCanvas value={barcodeId} size={220} level="H" />
        </div>

        <button
          onClick={handleDownload}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white shadow-md hover:bg-primary/90 active:scale-95 transition-all"
        >
          <Download size={18} />
          Save to Photos / Download
        </button>

        <p className="mt-4 text-xs text-gray-400">
          Tip: You can also screenshot or long-press the QR code above to save it.
        </p>
      </div>
    </div>
  );
} 