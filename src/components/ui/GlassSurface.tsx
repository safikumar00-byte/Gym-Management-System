import React from 'react';

export type GlassVariant = 'ultra-thin' | 'thin' | 'regular' | 'thick' | 'chrome' | 'dark';

interface GlassSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GlassVariant;
  floating?: boolean;
  border?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const GlassSurface: React.FC<GlassSurfaceProps> = ({
  variant = 'regular',
  floating = false,
  border = true,
  className = '',
  children,
  ...props
}) => {
  const variantClasses = {
    'ultra-thin': 'glass-ultra-thin',
    'thin': 'glass-thin',
    'regular': 'glass-regular',
    'thick': 'glass-thick',
    'chrome': 'glass-chrome',
    'dark': 'glass-dark',
  };

  const shadowClass = floating ? 'floating-surface' : '';
  const borderClass = border ? '' : 'border-transparent';

  return (
    <div
      className={`${variantClasses[variant]} ${shadowClass} ${borderClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
