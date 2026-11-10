import { useCallback } from 'react';
import { Platform } from 'react-native';

// Hook que simula un sonido fuerte al recibir solicitudes (chofer/tienda)
export function useSoundAlerta() {
  const reproducir = useCallback((tipo: 'solicitud' | 'oferta' | 'exito' = 'solicitud') => {
    if (Platform.OS === 'web') {
      try {
        const AudioCtx =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        const freqMap = { solicitud: 880, oferta: 660, exito: 990 };
        osc.frequency.value = freqMap[tipo];
        osc.type = 'square';
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } catch {
        // silencio
      }
    }
  }, []);

  return { reproducir };
}
