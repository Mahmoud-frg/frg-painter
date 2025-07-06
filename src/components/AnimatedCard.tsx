'use client';

import { motion, useAnimation } from 'framer-motion';
import { useEffect } from 'react';

const AnimatedCard = () => {
  const controls = useAnimation();

  useEffect(() => {
    controls.start({
      top: ['10%', '10%', '88%', '88%', '10%'],
      right: ['2%', '97%', '97%', '2%', '2%'],
      transition: {
        duration: 6,
        ease: 'linear',
        repeat: Infinity,
        repeatType: 'loop',
      },
    });
  }, [controls]);

  return (
    <div className='relative w-auto h-auto self-center overflow-hidden mt-6'>
      {/* Animated Dot */}
      <motion.div
        animate={controls}
        className='w-2 h-2 bg-[#DDA853] rounded-full shadow-lg absolute z-20'
      />

      {/* Card */}
      <div className='flex flex-col items-center justify-center h-full text-center p-6'>
        <p className='text-3xl font-bold text-[#123458]'>
          #SKECHERSKIDSXKidzania
        </p>
        <p className='text-xs text-slate-700 font-medium'>
          Copyright &copy; 2025 FRG | IT department - App version 1.1
        </p>
      </div>
    </div>
  );
};

export default AnimatedCard;
