// pages/user/MyBarcode.tsx
// The signed-in patient's own, permanent check-in pass. The ID comes from the account
// (get_my_barcode), never from the web address, so it cannot show someone else's ID.
import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, CheckCircle2, Printer, AlertTriangle } from "lucide-react";
import { getMyBarcode } from "@generick/shared";

type Status = "loading" | "ready" | "missing" | "error";

export default function MyBarcode() {
  const [status, setStatus] = useState<Status>("loading");
  const [barcodeId, setBarcodeId] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    getMyBarcode()
      .then((value) => {
        if (cancelled) return;
        if (value) {
          setBarcodeId(value);
          setStatus("ready");
        } else {
          setStatus("missing");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownload = () => {
    const canvas = containerRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    // Generic file name on purpose: never put the ID in a filename.
    link.download = "kiosk-pass.png";
    link.click();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-8 text-gray-800">
      <div className="w-full max-w-sm rounded-3xl border border-gray-100 bg-white p-6 text-center shadow-xl">
        {status === "ready" ? (
          <>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 size={24} />
            </div>
            <h1 className="text-xl font-bold">Kiosk Check-In Pass</h1>
            <p className="mt-1 text-xs text-gray-500">
              User ID: <span className="font-mono font-bold text-gray-700">{barcodeId}</span>
            </p>

            <div ref={containerRef} className="my-6 flex justify-center rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <QRCodeCanvas value={barcodeId} size={220} level="H" />
            </div>

            <div className="flex flex-col gap-3 print:hidden">
              <button
                onClick={handleDownload}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-primary/90 active:scale-95"
              >
                <Download size={18} />
                Save to Photos / Download
              </button>
              <button
                onClick={() => window.print()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 active:scale-95"
              >
                <Printer size={18} />
                Print my pass
              </button>
            </div>

            <p className="mt-4 text-xs text-gray-400 print:hidden">
              This pass does not expire. Keep it private: anyone who scans it at the kiosk can open your check-in.
            </p>
          </>
        ) : status === "loading" ? (
          <p className="text-sm text-gray-500">Loading your pass...</p>
        ) : (
          <div role="alert" className="flex flex-col items-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <AlertTriangle size={24} />
            </div>
            <h1 className="text-xl font-bold">
              {status === "missing" ? "No pass found" : "Could not load your pass"}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {status === "missing"
                ? "Your account has no check-in ID yet. Please ask the front desk."
                : "Please check your connection and try again, or ask the front desk."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
