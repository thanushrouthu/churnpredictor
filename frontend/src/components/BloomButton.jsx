import React from 'react';
import { motion } from 'framer-motion';

/**
 * BloomButton:
 * Enterprise Framer-Motion interactive button with signature monochrome bloom tap effect.
 * Mandate: whileTap={{ scale: 0.95, boxShadow: "0px 0px 20px 4px rgba(255, 255, 255, 0.4)" }}
 */
export default function BloomButton({
  children,
  className = '',
  onClick,
  type = 'button',
  disabled = false,
  id,
  title,
  variant = 'primary', // 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
  ...props
}) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-white hover:bg-zinc-200 text-zinc-950 font-semibold border border-white/90 shadow-sm';
      case 'secondary':
        return 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 shadow-sm';
      case 'outline':
        return 'bg-transparent hover:bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-700/80';
      case 'ghost':
        return 'bg-transparent hover:bg-zinc-900/60 text-zinc-400 hover:text-white border border-transparent';
      case 'danger':
        return 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80';
      default:
        return 'bg-white text-zinc-950';
    }
  };

  return (
    <motion.button
      id={id}
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      whileTap={
        disabled
          ? undefined
          : {
              scale: 0.95,
              boxShadow: '0px 0px 20px 4px rgba(255, 255, 255, 0.4)',
            }
      }
      whileHover={disabled ? undefined : { scale: 1.01 }}
      transition={{ duration: 0.12 }}
      className={`inline-flex items-center justify-center transition-colors cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${getVariantClasses()} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
