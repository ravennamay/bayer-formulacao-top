import { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';

export function useResponsive() {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription.remove();
  }, []);

  const width = dimensions.width;
  const height = dimensions.height;

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isSmallScreen: width < 480,
    isLargeScreen: width >= 1024,
    padding: isMobile ? 16 : isTablet ? 20 : 24,
    gap: isMobile ? 12 : 16,
    buttonHeight: isMobile ? 44 : 48,
  };
}
