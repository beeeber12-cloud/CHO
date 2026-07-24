import React, { createContext, useContext, useState, useEffect } from "react";

export type FontScale = 'small' | 'normal' | 'large' | 'xlarge';

interface FontSizeContextType {
  fontScale: FontScale;
  setFontScale: (scale: FontScale) => void;
  scaleLabel: string;
  scaleClass: string;
}

const FontSizeContext = createContext<FontSizeContextType>({
  fontScale: 'normal',
  setFontScale: () => {},
  scaleLabel: '보통 (기본 유지)',
  scaleClass: 'font-scale-normal',
});

export const FontSizeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fontScale, setFontScaleState] = useState<FontScale>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bible_font_scale_key");
      if (saved && ['small', 'normal', 'large', 'xlarge'].includes(saved)) {
        return saved as FontScale;
      }
    }
    return 'normal';
  });

  const setFontScale = (scale: FontScale) => {
    setFontScaleState(scale);
    if (typeof window !== "undefined") {
      localStorage.setItem("bible_font_scale_key", scale);
    }
  };

  let scaleLabel = '보통 (기본 유지)';
  let scaleClass = 'font-scale-normal';

  switch (fontScale) {
    case 'small':
      scaleLabel = '작게 (11px)';
      scaleClass = 'font-scale-small';
      break;
    case 'large':
      scaleLabel = '크게 (20px)';
      scaleClass = 'font-scale-large';
      break;
    case 'xlarge':
      scaleLabel = '아주 크게 (28px)';
      scaleClass = 'font-scale-xlarge';
      break;
    default:
      scaleLabel = '보통 (기본 유지)';
      scaleClass = 'font-scale-normal';
      break;
  }

  return (
    <FontSizeContext.Provider value={{ fontScale, setFontScale, scaleLabel, scaleClass }}>
      <div className={scaleClass}>
        {children}
      </div>
    </FontSizeContext.Provider>
  );
};

export const useFontSize = () => useContext(FontSizeContext);
