import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react';
import { compressImage } from '../../utils/imageCompressor';

export default function ImageUpload({ value, onImageSelect, disabled }) {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (value) {
      if (typeof value === 'string') {
        setPreview(value);
      } else if (value instanceof File || value instanceof Blob) {
        const objectUrl = URL.createObjectURL(value);
        setPreview(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
      }
    } else {
      setPreview(null);
    }
  }, [value]);
  const [compressing, setCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return;

    // Preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    // Compress
    setCompressing(true);
    setProgress(0);
    const compressed = await compressImage(file, setProgress);
    setCompressing(false);
    setProgress(100);
    onImageSelect(compressed);
  }, [onImageSelect]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const clearImage = useCallback(() => {
    setPreview(null);
    setProgress(0);
    onImageSelect(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }, [onImageSelect]);

  if (preview) {
    return (
      <div className="relative rounded-2xl overflow-hidden border-2 border-primary/30 bg-primary/5">
        <img src={preview} alt="Report preview" className="w-full h-56 object-cover" />
        {compressing && (
          <div className="absolute inset-0 bg-dark/60 flex flex-col items-center justify-center gap-2">
            <div className="w-48 h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-white text-sm font-medium">Compressing... {progress}%</p>
          </div>
        )}
        <button
          type="button"
          onClick={clearImage}
          className="absolute top-3 right-3 p-2 bg-black/70 text-white rounded-full hover:bg-warning transition-colors"
          aria-label="Remove image"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Desktop Dropzone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`hidden sm:flex relative flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 ${
          dragActive
            ? 'border-primary bg-primary/10 scale-[1.02]'
            : 'border-slate-200 hover:border-primary/50 hover:bg-primary/5'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <div className="p-3 rounded-2xl bg-primary/10">
          <Upload size={28} className="text-primary" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700">
            Drop a photo or <span className="text-primary">browse gallery</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">JPG, PNG up to 10MB • Auto-compressed</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-row gap-3">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-4 sm:py-3 bg-primary text-white rounded-xl sm:rounded-2xl font-bold text-sm hover:bg-primary-hover transition-all active:scale-95 shadow-sm shadow-orange-100 disabled:opacity-50"
        >
          <Camera size={18} />
          Take Photo
        </button>
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="flex-1 sm:hidden flex items-center justify-center gap-2 px-4 py-4 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-50"
        >
          <ImageIcon size={18} />
          Gallery
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFile(e.target.files?.[0])}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFile(e.target.files?.[0])}
        className="hidden"
      />
    </div>
  );
}
