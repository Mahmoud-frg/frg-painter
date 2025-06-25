'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  imageUrl: string;
  selectedColor: string;
  brushImageUrl: string;
}

export default function LineDrawingCanvas({
  imageUrl,
  selectedColor,
  brushImageUrl,
}: Props) {
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const brushRef = useRef<HTMLImageElement | null>(null);

  const brushSoundRef = useRef<HTMLAudioElement | null>(null);
  const eraserSoundRef = useRef<HTMLAudioElement | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [brushSize, setBrushSize] = useState(25);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [scaledHeight, setScaledHeight] = useState(400);

  useEffect(() => {
    brushSoundRef.current = new Audio('/sounds/brush.mp3');
    eraserSoundRef.current = new Audio('/sounds/eraser.mp3');

    if (brushSoundRef.current) {
      brushSoundRef.current.loop = true;
      brushSoundRef.current.volume = 0.3;
    }
    if (eraserSoundRef.current) {
      eraserSoundRef.current.loop = true;
      eraserSoundRef.current.volume = 0.3;
    }
  }, []);

  useEffect(() => {
    if (!imageUrl) return;

    const baseImage = new Image();
    baseImage.src = imageUrl;
    baseImage.onload = () => {
      const aspectRatio = baseImage.height / baseImage.width;
      setImageSize({ width: baseImage.width, height: baseImage.height });
      setScaledHeight((containerRef.current?.offsetWidth || 600) * aspectRatio);
      setImageLoaded(true);

      const canvas = drawCanvasRef.current;
      if (canvas && containerRef.current) {
        canvas.width = containerRef.current.offsetWidth;
        canvas.height = containerRef.current.offsetWidth * aspectRatio;
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    const brush = new Image();
    brush.src = brushImageUrl;
    brush.onload = () => {
      brushRef.current = brush;
    };
  }, [imageUrl, brushImageUrl]);

  const getCanvasPos = (e: MouseEvent | TouchEvent) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const drawBrush = (x: number, y: number) => {
    const ctx = drawCanvasRef.current?.getContext('2d');
    const brush = brushRef.current;
    if (!ctx || !brush) return;

    ctx.globalAlpha = isErasing ? 1 : 0.2;
    ctx.globalCompositeOperation = isErasing
      ? 'destination-out'
      : 'source-over';

    if (!isErasing) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = brush.width;
      tempCanvas.height = brush.height;
      const tempCtx = tempCanvas.getContext('2d');

      if (tempCtx) {
        tempCtx.clearRect(0, 0, brush.width, brush.height);
        tempCtx.drawImage(brush, 0, 0);
        tempCtx.globalCompositeOperation = 'source-in';
        tempCtx.fillStyle = selectedColor;
        tempCtx.fillRect(0, 0, brush.width, brush.height);

        ctx.drawImage(
          tempCanvas,
          x - brushSize / 2,
          y - brushSize / 2,
          brushSize,
          brushSize
        );
      }
    } else {
      ctx.drawImage(
        brush,
        x - brushSize / 2,
        y - brushSize / 2,
        brushSize,
        brushSize
      );
    }
  };

  const playSound = () => {
    const sound = isErasing ? eraserSoundRef.current : brushSoundRef.current;
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  };

  const stopSound = () => {
    brushSoundRef.current?.pause();
    eraserSoundRef.current?.pause();
  };

  const startDraw = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    const pos = getCanvasPos(e);
    drawBrush(pos.x, pos.y);
    setIsDrawing(true);
    playSound();
  };

  const draw = (e: MouseEvent | TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    drawBrush(pos.x, pos.y);
  };

  const stopDraw = () => {
    setIsDrawing(false);
    stopSound();
  };

  const handleReset = () => {
    const ctx = drawCanvasRef.current?.getContext('2d');
    if (ctx && drawCanvasRef.current) {
      ctx.clearRect(
        0,
        0,
        drawCanvasRef.current.width,
        drawCanvasRef.current.height
      );
    }
  };

  const handleDownload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = drawCanvasRef.current?.width || 600;
    canvas.height = drawCanvasRef.current?.height || 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const baseImage = new Image();
    baseImage.src = imageUrl;
    baseImage.onload = () => {
      ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
      const paintCanvas = drawCanvasRef.current;
      if (paintCanvas) {
        ctx.drawImage(paintCanvas, 0, 0, canvas.width, canvas.height);
      }
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'painted-image.png';
      a.click();
    };
  };

  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', startDraw as any);
    canvas.addEventListener('mousemove', draw as any);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);
    canvas.addEventListener('touchstart', startDraw as any, { passive: false });
    canvas.addEventListener('touchmove', draw as any, { passive: false });
    canvas.addEventListener('touchend', stopDraw);

    return () => {
      canvas.removeEventListener('mousedown', startDraw as any);
      canvas.removeEventListener('mousemove', draw as any);
      canvas.removeEventListener('mouseup', stopDraw);
      canvas.removeEventListener('mouseleave', stopDraw);
      canvas.removeEventListener('touchstart', startDraw as any);
      canvas.removeEventListener('touchmove', draw as any);
      canvas.removeEventListener('touchend', stopDraw);
    };
  }, [isDrawing, selectedColor, isErasing, brushSize]);

  return (
    <div className='flex flex-col items-center gap-4'>
      <div
        ref={containerRef}
        className='relative shadow-lg self-center rounded-2xl overflow-hidden w-[90vw] max-w-[700px]'
        style={{ height: scaledHeight }}
      >
        {imageLoaded && (
          <img
            src={imageUrl}
            alt='Base'
            className='absolute top-0 left-0 w-full h-full object-contain z-0'
          />
        )}
        <canvas
          ref={drawCanvasRef}
          className='absolute top-0 left-0 w-full h-full z-10 touch-none'
        />
      </div>

      <div className='flex gap-4 flex-wrap justify-center'>
        <button
          onClick={() => setIsErasing(false)}
          className={`px-4 py-2 rounded ${
            !isErasing ? 'bg-blue-600' : 'bg-gray-700'
          }`}
        >
          🎨 Brush
        </button>
        <button
          onClick={() => setIsErasing(true)}
          className={`px-4 py-2 rounded ${
            isErasing ? 'bg-red-600' : 'bg-gray-700'
          }`}
        >
          🧽 Eraser
        </button>
        <button
          onClick={handleReset}
          className='px-4 py-2 bg-yellow-600 rounded'
        >
          ♻️ Reset
        </button>
        <button
          onClick={handleDownload}
          className='px-4 py-2 bg-green-600 rounded'
        >
          💾 Save as PNG
        </button>
      </div>

      <div className='w-full max-w-sm mt-2'>
        <label
          htmlFor='brushSize'
          className='text-sm block text-white mb-1'
        >
          Brush Size: {brushSize}px
        </label>
        <input
          id='brushSize'
          type='range'
          min={10}
          max={50}
          value={brushSize}
          onChange={(e) => setBrushSize(parseInt(e.target.value))}
          className='w-full'
        />
      </div>
    </div>
  );
}
