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
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const brushRef = useRef<HTMLImageElement | null>(null);
  const brushSoundRef = useRef<HTMLAudioElement | null>(null);
  const eraserSoundRef = useRef<HTMLAudioElement | null>(null);
  const fillSoundRef = useRef<HTMLAudioElement | null>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const historyRef = useRef<ImageData[]>([]); // Store canvas state history
  const historyIndexRef = useRef<number>(-1); // Track current history position
  const [historyVersion, setHistoryVersion] = useState(0); // Track history changes

  const [isDrawing, setIsDrawing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [isFilling, setIsFilling] = useState(false);
  const [brushSize, setBrushSize] = useState(15);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [scaledHeight, setScaledHeight] = useState(400);

  // Save canvas state to history
  const saveCanvasState = () => {
    const drawCanvas = drawCanvasRef.current;
    const drawCtx = drawCanvas?.getContext('2d');
    if (!drawCanvas || !drawCtx) return;

    // Truncate history after current index to prevent redo after new action
    historyRef.current = historyRef.current.slice(
      0,
      historyIndexRef.current + 1
    );
    const imageData = drawCtx.getImageData(
      0,
      0,
      drawCanvas.width,
      drawCanvas.height
    );
    historyRef.current.push(imageData);
    historyIndexRef.current = historyRef.current.length - 1;

    // Limit history size to prevent memory issues (e.g., max 50 steps)
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }

    // Trigger re-render to update Undo button state
    setHistoryVersion((prev) => prev + 1);
  };

  // Undo to previous canvas state
  const handleUndo = () => {
    if (historyIndexRef.current <= 0) return; // No more states to undo
    const drawCanvas = drawCanvasRef.current;
    const drawCtx = drawCanvas?.getContext('2d');
    if (!drawCanvas || !drawCtx) return;

    historyIndexRef.current--;
    const previousState = historyRef.current[historyIndexRef.current];
    drawCtx.putImageData(previousState, 0, 0);
    setHistoryVersion((prev) => prev + 1); // Update to reflect Undo
  };

  useEffect(() => {
    brushSoundRef.current = new Audio('/sounds/brush.mp3');
    eraserSoundRef.current = new Audio('/sounds/eraser.mp3');
    fillSoundRef.current = new Audio('/sounds/fill.mp3');

    if (brushSoundRef.current) {
      brushSoundRef.current.loop = true;
      brushSoundRef.current.volume = 1;
    }
    if (eraserSoundRef.current) {
      eraserSoundRef.current.loop = true;
      eraserSoundRef.current.volume = 0.3;
    }
  }, []);

  useEffect(() => {
    if (!imageUrl) return;

    const baseImage = new Image();
    baseImage.crossOrigin = 'Anonymous';
    baseImage.src = imageUrl;
    baseImage.onload = () => {
      baseImageRef.current = baseImage;
      const aspectRatio = baseImage.height / baseImage.width;
      setImageSize({ width: baseImage.width, height: baseImage.height });
      setScaledHeight((containerRef.current?.offsetWidth || 600) * aspectRatio);
      setImageLoaded(true);

      const baseCanvas = baseCanvasRef.current;
      const drawCanvas = drawCanvasRef.current;
      if (baseCanvas && drawCanvas && containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = width * aspectRatio;
        baseCanvas.width = width;
        baseCanvas.height = height;
        drawCanvas.width = width;
        drawCanvas.height = height;

        const baseCtx = baseCanvas.getContext('2d');
        if (baseCtx) {
          baseCtx.clearRect(0, 0, baseCanvas.width, baseCanvas.height);
          baseCtx.drawImage(
            baseImage,
            0,
            0,
            baseCanvas.width,
            baseCanvas.height
          );
        }

        const drawCtx = drawCanvas.getContext('2d');
        if (drawCtx) {
          drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
          // Initialize history with empty canvas
          historyRef.current = [];
          historyIndexRef.current = -1;
          saveCanvasState();
        }
      }
    };

    const brush = new Image();
    brush.src = brushImageUrl;
    brush.onload = () => {
      brushRef.current = brush;
    };
  }, [imageUrl, brushImageUrl]);

  const handleReset = () => {
    const drawCanvas = drawCanvasRef.current;
    const drawCtx = drawCanvas?.getContext('2d');
    if (drawCanvas && drawCtx) {
      drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
      historyRef.current = [
        drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height),
      ];
      historyIndexRef.current = 0;
      setHistoryVersion((prev) => prev + 1); // Update to reflect Reset
    }
  };

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

  const getPixelColor = (
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number
  ): number[] => {
    if (
      x < 0 ||
      x >= width ||
      y < 0 ||
      y >= Math.floor(data.length / (width * 4))
    ) {
      return [0, 0, 0, 0];
    }
    const index = (y * width + x) * 4;
    return [data[index], data[index + 1], data[index + 2], data[index + 3]];
  };

  const setPixelColor = (
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    color: number[]
  ) => {
    if (
      x < 0 ||
      x >= width ||
      y < 0 ||
      y >= Math.floor(data.length / (width * 4))
    )
      return;
    const index = (y * width + x) * 4;
    for (let i = 0; i < 4; i++) {
      data[index + i] = color[i];
    }
  };

  const colorsMatch = (
    a: number[],
    b: number[],
    tolerance: number = 50
  ): boolean => {
    return (
      Math.abs(a[0] - b[0]) <= tolerance &&
      Math.abs(a[1] - b[1]) <= tolerance &&
      Math.abs(a[2] - b[2]) <= tolerance &&
      Math.abs(a[3] - b[3]) <= tolerance
    );
  };

  const floodFill = (
    drawData: Uint8ClampedArray,
    baseData: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number,
    targetColor: number[],
    fillColor: number[]
  ) => {
    const stack = [[x, y]];
    const visited = new Uint8Array(width * height);
    const getIndex = (x: number, y: number) => y * width + x;

    while (stack.length) {
      const [cx, cy] = stack.pop()!;
      if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;

      const idx = getIndex(cx, cy);
      if (visited[idx]) continue;
      visited[idx] = 1;

      const drawColor = getPixelColor(drawData, cx, cy, width);
      const baseColor = getPixelColor(baseData, cx, cy, width);
      const currentColor = drawColor[3] === 0 ? baseColor : drawColor;

      if (!colorsMatch(currentColor, targetColor)) continue;

      setPixelColor(drawData, cx, cy, width, fillColor);

      stack.push([cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]);
    }
  };

  const hexToRgba = (hex: string): number[] => {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return [r, g, b, 255];
  };

  const handleFill = (x: number, y: number) => {
    const drawCanvas = drawCanvasRef.current;
    const baseCanvas = baseCanvasRef.current;
    const drawCtx = drawCanvas?.getContext('2d');
    const baseCtx = baseCanvas?.getContext('2d');
    if (!drawCanvas || !baseCanvas || !drawCtx || !baseCtx) return;

    const drawImageData = drawCtx.getImageData(
      0,
      0,
      drawCanvas.width,
      drawCanvas.height
    );
    const baseImageData = baseCtx.getImageData(
      0,
      0,
      baseCanvas.width,
      baseCanvas.height
    );
    const drawData = drawImageData.data;
    const baseData = baseImageData.data;

    const drawColor = getPixelColor(drawData, x, y, drawCanvas.width);
    const baseColor = getPixelColor(baseData, x, y, baseCanvas.width);
    const targetColor = drawColor[3] === 0 ? baseColor : drawColor;
    const fillColor = hexToRgba(selectedColor);

    if (!targetColor || !fillColor || colorsMatch(targetColor, fillColor))
      return;

    floodFill(
      drawData,
      baseData,
      x,
      y,
      drawCanvas.width,
      drawCanvas.height,
      targetColor,
      fillColor
    );
    drawCtx.putImageData(drawImageData, 0, 0);
    fillSoundRef.current?.play().catch(() => {});
    saveCanvasState(); // Save state after fill
  };

  const drawBrush = (x: number, y: number) => {
    const drawCtx = drawCanvasRef.current?.getContext('2d');
    const brush = brushRef.current;
    if (!drawCtx || !brush) return;

    drawCtx.globalAlpha = isErasing ? 1 : 0.2;
    drawCtx.globalCompositeOperation = isErasing
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

        drawCtx.drawImage(
          tempCanvas,
          x - brushSize / 2,
          y - brushSize / 2,
          brushSize,
          brushSize
        );
      }
    } else {
      drawCtx.drawImage(
        brush,
        x - brushSize / 2,
        y - brushSize / 2,
        brushSize,
        brushSize
      );
    }
  };

  const drawInterpolatedBrush = (
    from: { x: number; y: number },
    to: { x: number; y: number }
  ) => {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(Math.floor(distance / 1.5), 1);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t;
      drawBrush(x, y);
    }
  };

  const playSound = () => {
    if (isFilling) {
      fillSoundRef.current?.play().catch(() => {});
      return;
    }
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
    if (isFilling) {
      handleFill(Math.floor(pos.x), Math.floor(pos.y));
      return;
    }
    drawBrush(pos.x, pos.y);
    lastPoint.current = pos;
    setIsDrawing(true);
    playSound();
  };

  const draw = (e: MouseEvent | TouchEvent) => {
    if (!isDrawing || isFilling) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    if (lastPoint.current) {
      drawInterpolatedBrush(lastPoint.current, pos);
    } else {
      drawBrush(pos.x, pos.y);
    }
    lastPoint.current = pos;
  };

  const stopDraw = () => {
    if (isDrawing) {
      saveCanvasState(); // Save state after drawing or erasing
    }
    setIsDrawing(false);
    lastPoint.current = null;
    stopSound();
  };

  const handleDownload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = baseCanvasRef.current?.width || 600;
    canvas.height = baseCanvasRef.current?.height || 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const baseCanvas = baseCanvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    if (baseCanvas && drawCanvas) {
      ctx.drawImage(baseCanvas, 0, 0, canvas.width, canvas.height);
      ctx.drawImage(drawCanvas, 0, 0, canvas.width, canvas.height);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'painted-image.png';
      a.click();
    }
  };

  useEffect(() => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;

    drawCanvas.addEventListener('mousedown', startDraw as any);
    drawCanvas.addEventListener('mousemove', draw as any);
    drawCanvas.addEventListener('mouseup', stopDraw);
    drawCanvas.addEventListener('mouseleave', stopDraw);
    drawCanvas.addEventListener('touchstart', startDraw as any, {
      passive: false,
    });
    drawCanvas.addEventListener('touchmove', draw as any, { passive: false });
    drawCanvas.addEventListener('touchend', stopDraw);

    return () => {
      drawCanvas.removeEventListener('mousedown', startDraw as any);
      drawCanvas.removeEventListener('mousemove', draw as any);
      drawCanvas.removeEventListener('mouseup', stopDraw);
      drawCanvas.removeEventListener('mouseleave', stopDraw);
      drawCanvas.removeEventListener('touchstart', startDraw as any);
      drawCanvas.removeEventListener('touchmove', draw as any);
      drawCanvas.removeEventListener('touchend', stopDraw);
    };
  }, [isDrawing, selectedColor, isErasing, brushSize, isFilling]);

  return (
    <div className='flex flex-col items-center gap-4'>
      <div
        ref={containerRef}
        className='relative shadow-lg self-center rounded-2xl overflow-hidden w-[90vw] max-w-[800px]'
        style={{ height: scaledHeight }}
      >
        <canvas
          ref={baseCanvasRef}
          className='absolute top-0 left-0 w-full h-full'
        />
        <canvas
          ref={drawCanvasRef}
          className='absolute top-0 left-0 w-full h-full z-10 touch-none'
        />
      </div>

      <div className='flex gap-4 flex-wrap justify-center'>
        <button
          onClick={() => {
            setIsErasing(false);
            setIsFilling(false);
          }}
          className={`px-4 py-2 rounded ${
            !isErasing && !isFilling ? 'bg-blue-600' : 'bg-gray-700'
          }`}
        >
          🎨 Brush
        </button>
        <button
          onClick={() => {
            setIsErasing(true);
            setIsFilling(false);
          }}
          className={`px-4 py-2 rounded ${
            isErasing ? 'bg-red-600' : 'bg-gray-700'
          }`}
        >
          🧽 Eraser
        </button>
        <button
          onClick={() => {
            setIsFilling(true);
            setIsErasing(false);
          }}
          className={`px-4 py-2 rounded ${
            isFilling ? 'bg-yellow-600' : 'bg-gray-700'
          }`}
        >
          🪣 Fill
        </button>
        <button
          onClick={handleUndo}
          className='px-4 py-2 bg-purple-600 rounded disabled:bg-gray-700'
          disabled={historyIndexRef.current <= 0}
        >
          ⬅️ Undo
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
          💾 Save
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
