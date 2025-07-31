import { useRef, useEffect } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface TouchPosition {
  x: number;
  y: number;
  time: number;
}

export function useTouchGestures<T extends HTMLElement = HTMLElement>(
  handlers: SwipeHandlers,
  threshold = 50,
  timeLimit = 300
) {
  const ref = useRef<T>(null);
  const touchStart = useRef<TouchPosition | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;

      const touchEnd = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
        time: Date.now(),
      };

      const timeDiff = touchEnd.time - touchStart.current.time;
      if (timeDiff > timeLimit) return;

      const xDiff = touchEnd.x - touchStart.current.x;
      const yDiff = touchEnd.y - touchStart.current.y;

      const absX = Math.abs(xDiff);
      const absY = Math.abs(yDiff);

      if (absX > absY && absX > threshold) {
        // Horizontal swipe
        if (xDiff > 0 && handlers.onSwipeRight) {
          handlers.onSwipeRight();
        } else if (xDiff < 0 && handlers.onSwipeLeft) {
          handlers.onSwipeLeft();
        }
      } else if (absY > absX && absY > threshold) {
        // Vertical swipe
        if (yDiff > 0 && handlers.onSwipeDown) {
          handlers.onSwipeDown();
        } else if (yDiff < 0 && handlers.onSwipeUp) {
          handlers.onSwipeUp();
        }
      }

      touchStart.current = null;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handlers, threshold, timeLimit]);

  return ref;
}

// Hook for pull-to-refresh functionality
export function usePullToRefresh(onRefresh: () => void | Promise<void>, threshold = 100) {
  const ref = useRef<HTMLElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (element.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      if (diff > 0 && element.scrollTop === 0) {
        e.preventDefault();
        // Add visual feedback here if needed
        element.style.transform = `translateY(${Math.min(diff * 0.5, threshold)}px)`;
      }
    };

    const handleTouchEnd = async (e: TouchEvent) => {
      if (!isPulling.current) return;

      const endY = e.changedTouches[0].clientY;
      const diff = endY - startY.current;

      element.style.transform = '';
      element.style.transition = 'transform 0.2s';

      if (diff > threshold) {
        await onRefresh();
      }

      setTimeout(() => {
        element.style.transition = '';
      }, 200);

      isPulling.current = false;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, threshold]);

  return ref;
}