'use client';

import { useState } from 'react';

export default function UploadInput({
  onImageSelect,
}: {
  onImageSelect: (imgUrl: string) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const imageUrl = reader.result as string;
      setPreview(imageUrl);
      onImageSelect(imageUrl); // Pass image to parent
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className='flex flex-col items-center gap-4'>
      <input
        type='file'
        accept='image/*'
        onChange={handleFileChange}
        className='file-input file-input-bordered'
      />
      {preview && (
        <img
          src={preview}
          alt='Preview'
          className='max-w-sm rounded shadow'
        />
      )}
    </div>
  );
}
