import { useEffect } from 'preact/hooks';
import type { ClarifySettings } from '../../settings/schema';

type Handlers = Partial<Record<'YES' | 'NO' | 'PICK_1' | 'PICK_2' | 'PICK_3' | 'PICK_4' | 'BACK' | 'EXIT', () => void>>;

export const useKeybindings = (settings: ClarifySettings | undefined, handlers: Handlers) => {
  useEffect(() => {
    if (!settings || document.body.classList.contains('is-mobile')) return;
    const onKey = (e: KeyboardEvent) => {
      for (const [event, binding] of Object.entries(settings.keybindings)) {
        if (e.key === binding.key && handlers[event as keyof Handlers]) {
          e.preventDefault();
          handlers[event as keyof Handlers]!();
          return;
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [settings, handlers]);
};
