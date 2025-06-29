'use client';

import { useRef, useState } from 'react';
import LineDrawingCanvas from '@/components/LineDrawingCanvas';
import AnimatedCard from '@/components/AnimatedCard';

type ShoeImage = {
  name: string;
  uncolored: string;
  colored: string | null;
};

const initialShoeImages: ShoeImage[] = [
  {
    name: 'Shoe 1',
    uncolored: '/images/uncolored/shoe1.jpg',
    colored: '/images/colored/shoe1.jpg',
  },
  {
    name: 'Shoe 2',
    uncolored: '/images/uncolored/shoe2.jpg',
    colored: '/images/colored/shoe2.jpg',
  },
  {
    name: 'Shoe 3',
    uncolored: '/images/uncolored/shoe3.jpg',
    colored: '/images/colored/shoe3.jpg',
  },
  {
    name: 'Shoe 4',
    uncolored: '/images/uncolored/shoe4.jpg',
    colored: '/images/colored/shoe4.jpg',
  },
  {
    name: 'Shoe 5',
    uncolored: '/images/uncolored/shoe5.jpg',
    colored: '/images/colored/shoe5.jpg',
  },
  {
    name: 'Shoe 6',
    uncolored: '/images/uncolored/shoe6.jpg',
    colored: '/images/colored/shoe6.jpg',
  },
];

export default function HomePage() {
  const [shoeImages, setShoeImages] = useState(initialShoeImages);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [coloredImageUrl, setColoredImageUrl] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('#ff0000');
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  return (
    <main className='min-h-screen p-6 bg-gray-600 text-white flex flex-col'>
      {/* Header */}
      <div className='flex items-center gap-4 mb-2 self-center'>
        <div className='p-2 w-auto h-auto rounded-full bg-white'>
          <img
            src='/images/frg-bg-white.png'
            alt='FRG'
            className='w-8 h-8'
          />
        </div>
        <h1 className='text-2xl font-bold'>FRG Painter</h1>
      </div>

      <div className='relative w-full h-full'>
        {/* 🔽 Background image */}
        <div
          className='absolute right-0 top-0 h-full z-0'
          style={{
            width: '500px',
            backgroundImage: "url('/images/drawing2.png')",
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain',
            backgroundPosition: 'right bottom',
          }}
        />

        {/* 🔼 Foreground content */}
        <div className='relative z-10'>
          {/* Toggle Sidebar Button */}
          <div className='flex justify-center absolute -top-15 -left-10'>
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              className='absolute w-12 h-12 left-8 z-20 bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-2xl shadow-md'
              aria-label='Toggle Sidebar'
            >
              {sidebarOpen ? '📂' : '📁'}
            </button>
          </div>

          <div className='flex flex-1 w-full'>
            {/* Sidebar */}
            <aside
              className={`transition-all duration-300 ${
                sidebarOpen ? 'w-52 pr-4' : 'w-0 pr-0'
              } overflow-hidden border-r border-gray-700`}
            >
              {sidebarOpen && (
                <div className='flex flex-col gap-4 px-2 pb-4 max-h-[150vh] overflow-y-auto'>
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
                            ? 'border-white scale-105'
                            : 'border-gray-500'
                        }`}
                        onClick={() => {
                          setImageUrl(shoe.uncolored);
                          setColoredImageUrl(shoe.colored || null);
                          setSidebarOpen(false); // Close sidebar on image selection
                        }}
                      />
                      <span className='text-sm text-gray-200 text-center'>
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
                <div className='flex justify-center items-start gap-4 relative w-full'>
                  {/* 🎨 Color Palette - vertical */}
                  <div className='flex flex-col gap-2 items-center'>
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
                        className='absolute -top-12 -right-12 w-40 h-40 object-contain bg-white rounded-xl shadow-md z-20 border border-white'
                      />
                    )}

                    <div className='flex items-center gap-4 mb-2'>
                      <span className='text-xl text-gray-300'>Selected</span>
                      <span
                        className='w-8 h-8 inline-block rounded-full border border-white'
                        style={{ backgroundColor: selectedColor }}
                      ></span>
                    </div>

                    <LineDrawingCanvas
                      imageUrl={imageUrl}
                      selectedColor={selectedColor}
                      brushImageUrl='/images/brushes/brush3-Photoroom.png'
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
