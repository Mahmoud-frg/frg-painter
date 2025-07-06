'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  imageUrl: string;
  selectedColor: string;
  brushImageUrl: string;
  isFullscreen: boolean;
}

export default function LineDrawingCanvas({
  imageUrl,
  selectedColor,
  brushImageUrl,
  isFullscreen,
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
  const [isLocalFullscreen, setIsLocalFullscreen] = useState(false); // Track fullscreen state
  const [zoomLevel, setZoomLevel] = useState(1); // Track zoom level (1 = 100%)
  const [isDrawing, setIsDrawing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [isFilling, setIsFilling] = useState(false);
  const [brushSize, setBrushSize] = useState(15);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const CANVAS_WIDTH = 1340;
  const CANVAS_HEIGHT = 750;

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

  // Toggle fullscreen mode
  const handleFullscreen = async () => {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    if (!isLocalFullscreen) {
      try {
        await container.requestFullscreen();
        setIsLocalFullscreen(true);
      } catch (err) {
        console.error('Failed to enter fullscreen:', err);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsLocalFullscreen(false);
      } catch (err) {
        console.error('Failed to exit fullscreen:', err);
      }
    }
  };

  // Handle zoom in/out
  const handleZoom = (direction: 'in' | 'out') => {
    setZoomLevel((prev) => {
      const newZoom = direction === 'in' ? prev + 0.25 : prev - 0.25;
      return Math.max(0.5, Math.min(2, newZoom)); // Limit zoom between 50% and 200%
    });
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsLocalFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

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

  // Handle image loading and initial canvas setup
  useEffect(() => {
    if (!imageUrl) return;

    const baseImage = new Image();
    baseImage.crossOrigin = 'Anonymous';
    baseImage.src = imageUrl;
    baseImage.onload = () => {
      baseImageRef.current = baseImage;
      setImageSize({ width: baseImage.width, height: baseImage.height });

      const baseCanvas = baseCanvasRef.current;
      const drawCanvas = drawCanvasRef.current;
      if (!baseCanvas || !drawCanvas) return;

      // Fixed canvas size
      baseCanvas.width = CANVAS_WIDTH;
      baseCanvas.height = CANVAS_HEIGHT;
      drawCanvas.width = CANVAS_WIDTH;
      drawCanvas.height = CANVAS_HEIGHT;

      const baseCtx = baseCanvas.getContext('2d');
      const drawCtx = drawCanvas.getContext('2d');
      if (!baseCtx || !drawCtx) return;

      // Clear with white background (important for contain behavior)
      baseCtx.fillStyle = 'white';
      baseCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const imgAspect = baseImage.width / baseImage.height;
      const canvasAspect = CANVAS_WIDTH / CANVAS_HEIGHT;

      let drawWidth = CANVAS_WIDTH;
      let drawHeight = CANVAS_HEIGHT;
      if (imgAspect > canvasAspect) {
        drawWidth = CANVAS_WIDTH;
        drawHeight = CANVAS_WIDTH / imgAspect;
      } else {
        drawHeight = CANVAS_HEIGHT;
        drawWidth = CANVAS_HEIGHT * imgAspect;
      }
      const offsetX = (CANVAS_WIDTH - drawWidth) / 2;
      const offsetY = (CANVAS_HEIGHT - drawHeight) / 2;

      baseCtx.drawImage(baseImage, offsetX, offsetY, drawWidth, drawHeight);

      drawCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      historyRef.current = [];
      historyIndexRef.current = -1;
      saveCanvasState();
      setImageLoaded(true);
    };

    const brush = new Image();
    brush.src = brushImageUrl;
    brush.onload = () => {
      brushRef.current = brush;
    };
  }, [imageUrl, brushImageUrl]);

  // Handle canvas resize and state preservation on fullscreen change
  useEffect(() => {
    if (!imageLoaded) return;

    const baseCanvas = baseCanvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    const baseImage = baseImageRef.current;
    if (!baseCanvas || !drawCanvas || !baseImage) return;

    const baseCtx = baseCanvas.getContext('2d');
    const drawCtx = drawCanvas.getContext('2d');
    if (!baseCtx || !drawCtx) return;

    // Save current drawing state
    const currentDrawState =
      historyRef.current[historyIndexRef.current] ||
      drawCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = CANVAS_WIDTH;
    tempCanvas.height = CANVAS_HEIGHT;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    tempCtx.putImageData(currentDrawState, 0, 0);

    // Re-apply canvas dimensions (same size)
    baseCanvas.width = CANVAS_WIDTH;
    baseCanvas.height = CANVAS_HEIGHT;
    drawCanvas.width = CANVAS_WIDTH;
    drawCanvas.height = CANVAS_HEIGHT;

    // Redraw image (same aspect ratio handling as above)
    baseCtx.fillStyle = 'white';
    baseCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const imgAspect = baseImage.width / baseImage.height;
    const canvasAspect = CANVAS_WIDTH / CANVAS_HEIGHT;

    let drawWidth = CANVAS_WIDTH;
    let drawHeight = CANVAS_HEIGHT;
    if (imgAspect > canvasAspect) {
      drawWidth = CANVAS_WIDTH;
      drawHeight = CANVAS_WIDTH / imgAspect;
    } else {
      drawHeight = CANVAS_HEIGHT;
      drawWidth = CANVAS_HEIGHT * imgAspect;
    }
    const offsetX = (CANVAS_WIDTH - drawWidth) / 2;
    const offsetY = (CANVAS_HEIGHT - drawHeight) / 2;

    baseCtx.drawImage(baseImage, offsetX, offsetY, drawWidth, drawHeight);

    drawCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawCtx.drawImage(tempCanvas, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Update history
    const scaledImageData = drawCtx.getImageData(
      0,
      0,
      CANVAS_WIDTH,
      CANVAS_HEIGHT
    );
    historyRef.current[historyIndexRef.current] = scaledImageData;
  }, [isLocalFullscreen, imageLoaded]);

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
    let clientX = 0,
      clientY = 0;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // 🔥 Adjust for canvas resolution vs displayed size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
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

  useEffect(() => {
    if (!imageLoaded) return;

    const handleResize = () => {
      setImageSize((prev) => ({ ...prev }));
    };

    const debounced = setTimeout(handleResize, 100);
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(debounced);
      window.removeEventListener('resize', handleResize);
    };
  }, [isLocalFullscreen, imageLoaded]);

  // Add keyboard shortcuts (e.g., B = brush, E = eraser, F = fill, Ctrl+Z = undo, Ctrl+S = save)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') handleUndo();
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleDownload();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div
      id='canvas-container'
      className={`flex ${
        isFullscreen ? 'flex-col items-center h-full' : 'flex-col items-center'
      } gap-4`}
    >
      {/* Canvas */}
      <div
        ref={containerRef}
        className='relative shadow-lg rounded-2xl overflow-hidden bg-white'
        style={{
          aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
          width: isFullscreen ? 'calc(100vw - 100px)' : '90vw',
          maxWidth: isFullscreen ? '1340px' : '750px',
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'top center',
          transition: 'transform 0.2s ease',
        }}
      >
        <canvas
          ref={baseCanvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className='absolute top-0 left-0 w-full h-full z-0 pointer-events-none'
        />
        <canvas
          ref={drawCanvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className='absolute top-0 left-0 w-full h-full z-10 touch-none'
        />
      </div>

      {/* Controls (Top in Fullscreen) */}
      <div
        className={` ${
          isFullscreen
            ? 'flex flex-col gap-4 absolute items-center top-35 -right-10'
            : ' flex flex-row gap-4 z-20'
        }`}
      >
        <button
          onClick={() => handleZoom('in')}
          className={`px-4 py-2 bg-indigo-600 rounded disabled:bg-gray-700 ${
            isFullscreen ? 'hidden' : 'hidden'
          }`}
          disabled={zoomLevel >= 2}
        >
          {isFullscreen ? '🔎+' : '🔎 Zoom In'}
        </button>
        <button
          onClick={() => handleZoom('out')}
          className={`px-4 py-2 bg-indigo-600 rounded disabled:bg-gray-700 ${
            isFullscreen ? 'hidden' : 'hidden'
          }`}
          disabled={zoomLevel <= 0.5}
        >
          {isFullscreen ? '🔍-' : '🔍 Zoom Out'}
        </button>
        <button
          onClick={() => {
            setIsErasing(false);
            setIsFilling(false);
          }}
          className={`px-4 py-2 rounded ${
            !isErasing && !isFilling ? 'bg-blue-600' : 'bg-gray-700'
          } ${isFullscreen ? '' : ''}`}
        >
          {isFullscreen ? '🖌️' : '🖌️ Brush'}
        </button>
        <button
          onClick={() => {
            setIsErasing(true);
            setIsFilling(false);
          }}
          className={`px-4 py-2 rounded ${
            isErasing ? 'bg-red-600' : 'bg-gray-700'
          } ${isFullscreen ? '' : ''}`}
        >
          {isFullscreen ? '🩹' : '🩹 Eraser'}
        </button>
        <button
          onClick={() => {
            setIsFilling(true);
            setIsErasing(false);
          }}
          className={`px-4 py-2 rounded ${
            isFilling ? 'bg-yellow-600' : 'bg-gray-700'
          } ${isFullscreen ? '' : ''}`}
        >
          {isFullscreen ? '🫗' : '🫗 Fill'}
        </button>
        <button
          onClick={handleUndo}
          className={`px-4 py-2 bg-purple-600 rounded disabled:bg-gray-700 ${
            isFullscreen ? '' : ''
          }`}
          disabled={historyIndexRef.current <= 0}
        >
          {isFullscreen ? '↪️' : '↪️ Undo'}
        </button>
        <button
          onClick={handleReset}
          className={`px-4 py-2 bg-yellow-600 rounded ${
            isFullscreen ? '' : ''
          }`}
        >
          {isFullscreen ? '♻️' : '♻️ Reset'}
        </button>
        <button
          onClick={handleDownload}
          className={`px-4 py-2 bg-green-600 rounded ${isFullscreen ? '' : ''}`}
        >
          {isFullscreen ? '💾' : '💾 Save'}
        </button>

        <button
          onClick={handleFullscreen}
          className={`px-4 py-2 bg-teal-600 rounded ${isFullscreen ? '' : ''}`}
        >
          {isLocalFullscreen ? '🖥️' : '🖥️ Fullscreen'}
        </button>
      </div>

      {/* sliders */}
      <div
        className={`w-full ${
          isFullscreen ? 'flex flex-row items-center justify-between z-20' : ''
        }`}
      >
        <div
          className={`w-full max-w-xl flex flex-row gap-4 ${
            isFullscreen ? 'z-20' : ''
          }`}
        >
          <label
            htmlFor='brushSize'
            className={`text-sm block mb-1 ${
              isLocalFullscreen ? 'text-[#ffffff]' : 'text-[#123458]'
            }`}
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
            className='w-96'
          />
        </div>

        <div className={`w-full max-w-sm hidden ${isFullscreen ? 'z-20' : ''}`}>
          <label
            htmlFor='zoomLevel'
            className='text-sm block text-white'
          >
            Zoom: {(zoomLevel * 100).toFixed(0)}%
          </label>
          <input
            id='zoomLevel'
            type='range'
            min={0.5}
            max={2}
            step={0.1}
            value={zoomLevel}
            onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
            className='w-full'
          />
        </div>
      </div>
    </div>
  );
}
