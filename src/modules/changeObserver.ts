export type Unsubscribe = () => void;

// Un único observador de cambios en la página, compartido por todos los módulos.
// Agrupa los cambios y avisa como máximo una vez cada `delayMs`, porque YouTube cambia
// la página constantemente. Solo está activo mientras algún módulo lo necesite.
export function createChangeObserver(root: Node, delayMs = 250) {
  const subscribers = new Set<() => void>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const notify = (): void => {
    timer = null;
    for (const subscriber of subscribers) {
      try {
        subscriber();
      } catch (error) {
        console.error('[Dōgara] Error en un módulo al observar la página', error);
      }
    }
  };

  const observer = new MutationObserver(() => {
    timer ??= setTimeout(notify, delayMs);
  });

  return {
    subscribe(callback: () => void): Unsubscribe {
      if (subscribers.size === 0) observer.observe(root, { childList: true, subtree: true });
      subscribers.add(callback);

      return () => {
        subscribers.delete(callback);
        if (subscribers.size > 0) return;
        observer.disconnect();
        if (timer) clearTimeout(timer);
        timer = null;
      };
    },
  };
}
