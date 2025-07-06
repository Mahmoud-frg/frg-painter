'use client';

import { useRef, useState, useEffect } from 'react';
import LineDrawingCanvas from '@/components/LineDrawingCanvas';
import AnimatedCard from '@/components/AnimatedCard';

type ShoeImage = {
  name: string;
  uncolored: string;
  colored: string | null;
};

const initialShoeImages: ShoeImage[] = [
  {
    name: 'girls 1',
    uncolored: '/images/uncolored/girls1-un.png',
    colored: '/images/colored/girls1.png',
  },
  {
    name: 'girls 2',
    uncolored: '/images/uncolored/girls2-un.png',
    colored: '/images/colored/girls2.png',
  },
  {
    name: 'girls 3',
    uncolored: '/images/uncolored/girls3-un.png',
    colored: '/images/colored/girls3.png',
  },
  {
    name: 'girls 4',
    uncolored: '/images/uncolored/girls4-un.png',
    colored: '/images/colored/girls4.png',
  },
  {
    name: 'boys 1',
    uncolored: '/images/uncolored/boys1-un.png',
    colored: '/images/colored/boys1.png',
  },
  {
    name: 'boys 2',
    uncolored: '/images/uncolored/boys2-un.png',
    colored: '/images/colored/boys2.png',
  },
  {
    name: 'boys 3',
    uncolored: '/images/uncolored/boys3-un.png',
    colored: '/images/colored/boys3.png',
  },
  {
    name: 'boys 4',
    uncolored: '/images/uncolored/boys4-un.png',
    colored: '/images/colored/boys4.png',
  },
];

export default function HomePage() {
  const [shoeImages, setShoeImages] = useState(initialShoeImages);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [coloredImageUrl, setColoredImageUrl] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('#ff0000');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const uploadedDataUrl = reader.result as string;
      const newImage: ShoeImage = {
        name: file.name,
        uncolored: uploadedDataUrl,
        colored: null,
      };

      setShoeImages((prev) => [...prev, newImage]);
      setImageUrl(newImage.uncolored);
      setColoredImageUrl(null);
      setSidebarOpen(false); // Close sidebar on image upload
    };
    reader.readAsDataURL(file);
  };

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <main
      className='min-h-screen px-6 bg-gray-400 text-[#ffffff] flex flex-col'
      style={{
        backgroundImage: "url('/images/bg.jpg')",
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover', // or '100% 100%'
        backgroundPosition: 'right bottom',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className='relative w-full h-full'>
        {/* Header */}
        <div className='flex justify-center items-center py-4'>
          <img
            src='/images/skx-kids.png'
            alt='skechers kids'
            className='w-40 h-25'
          />
        </div>

        {/* 🔽 Background image */}
        {/* <div
          className='absolute right-0 top-0 h-full z-0'
          style={{
            width: '500px',
            backgroundImage: "url('/images/bg.jpg')",
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain',
            backgroundPosition: 'right bottom',
          }}
        /> */}

        {/* 🔼 Foreground content */}
        <div className='relative z-10 h-full'>
          <div className='flex flex-1 w-full h-full'>
            {/* Toggle Sidebar Button */}
            <div className='flex justify-center'>
              <button
                onClick={() => setSidebarOpen((prev) => !prev)}
                className='absolute w-12 h-12 -top-20 left-10 z-20 bg-gray-800 hover:bg-gray-700 text-[#27548A] p-2 rounded-2xl shadow-md'
                aria-label='Toggle Sidebar'
              >
                {sidebarOpen ? '📂' : '📁'}
              </button>
            </div>

            {/* Sidebar */}
            <aside
              className={`transition-all duration-300  ${
                sidebarOpen ? 'w-52 pr-4' : 'w-0 pr-0'
              } overflow-hidden border-r border-gray-700 max-h-[80vh]`}
            >
              {sidebarOpen && (
                <div className='flex flex-col gap-4 max-h-[80vh] overflow-y-auto'>
                  {shoeImages.map((shoe) => (
                    <div
                      key={shoe.name}
                      className='flex flex-col items-center gap-2'
                    >
                      <img
                        src={shoe.uncolored}
                        alt={shoe.name}
                        className={`w-24 h-24 object-contain bg-white p-2 rounded-lg cursor-pointer border-2 transition-transform ${
                          imageUrl === shoe.uncolored
                            ? 'border-gray-500'
                            : 'border-white scale-105'
                        }`}
                        onClick={() => {
                          setImageUrl(shoe.uncolored);
                          setColoredImageUrl(shoe.colored || null);
                          setSidebarOpen(false); // Close sidebar on image selection
                        }}
                      />
                      <span className='text-sm text-[#123458] text-center'>
                        {shoe.name}
                      </span>
                    </div>
                  ))}

                  {/* Upload Button */}
                  <div className='mt-2'>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className='w-full px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded'
                    >
                      ➕ Upload Image
                    </button>
                    <input
                      type='file'
                      accept='image/png, image/jpeg'
                      ref={fileInputRef}
                      className='hidden'
                      onChange={handleUploadImage}
                    />
                  </div>
                </div>
              )}
            </aside>

            {/* Main Content */}
            <section className='flex-1 px-3'>
              {imageUrl && (
                <div
                  className={`flex ${
                    isFullscreen
                      ? 'h-screen flex-col justify-center items-center'
                      : 'justify-center items-start'
                  } gap-4 relative w-full`}
                  id='canvas-container'
                >
                  {/* 🎨 Color Palette - vertical */}
                  <div
                    className={`flex ${
                      isFullscreen
                        ? 'absolute left-4 top-1/2 -translate-y-1/2 flex-col'
                        : 'flex-col'
                    } gap-2 items-center z-20`}
                  >
                    {[
                      '#E52020',
                      '#3ABEF9',
                      '#00cc66',
                      '#7F8CAA',
                      '#F564A9',
                      '#003092',
                      '#FEEC37',
                      '#3B060A',
                      '#F26B0F',
                      '#9933cc',
                      '#ffffff',
                      '#000000',
                    ].map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-8 h-8 rounded-full border-2 ${
                          selectedColor === color
                            ? 'border-white scale-110'
                            : 'border-gray-400'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  {/* Canvas + Overlay */}
                  <div className='relative'>
                    {coloredImageUrl && (
                      <img
                        src={coloredImageUrl}
                        alt='Colored Reference'
                        className={`${
                          isFullscreen
                            ? 'absolute -top-6 -right-10 w-40 h-40'
                            : 'absolute -top-8 -right-8 w-40 h-40'
                        } object-contain bg-white rounded-xl shadow-md z-20 border border-white`}
                      />
                    )}

                    <div
                      className={`flex items-center gap-4 mb-2 ${
                        isFullscreen ? 'hidden' : ''
                      }`}
                    >
                      <span className='text-xl text-[#123458]'>Selected</span>
                      <span
                        className='w-8 h-8 inline-block rounded-full border border-white'
                        style={{ backgroundColor: selectedColor }}
                      ></span>
                    </div>

                    <LineDrawingCanvas
                      imageUrl={imageUrl}
                      selectedColor={selectedColor}
                      brushImageUrl='/images/brushes/brush3-Photoroom.png'
                      isFullscreen={isFullscreen}
                    />
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      <AnimatedCard />
    </main>
  );
}
