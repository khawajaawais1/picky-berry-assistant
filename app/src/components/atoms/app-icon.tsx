import {
  Feather as FeatherIcon,
  MaterialCommunityIcons as MaterialCommunityIcon,
  MaterialIcons as MaterialIcon,
} from '@expo/vector-icons';
import { useSyncExternalStore, type ComponentProps, type ComponentType } from 'react';
import { View } from 'react-native';

/**
 * The icon fonts are loaded in a mounted effect, so the library renders an empty `Text` until the
 * font is ready — but only on the server, where that effect never runs. On the web the first client
 * pass sometimes had the font already, so the icon appeared where the server had drawn nothing and
 * React reported a hydration mismatch (frontend review, 2026-10-25).
 *
 * This wrapper defers every icon to **after hydration** on the web with `useSyncExternalStore`:
 * the server snapshot is false (the empty box the server draws), the client snapshot is true, and
 * React swaps them after hydrating. A device has no hydration and renders the icon immediately.
 */
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

function deferIcon<P extends { size?: number }>(Icon: ComponentType<P>) {
  return function DeferredIcon(props: P) {
    const ready = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    if (!ready) {
      // The space the icon will take, so nothing moves when it arrives.
      const size = typeof props.size === 'number' ? props.size : 24;

      return <View style={{ height: size, width: size }} />;
    }

    return <Icon {...props} />;
  };
}

export const Feather = deferIcon(FeatherIcon);
export const MaterialCommunityIcons = deferIcon(MaterialCommunityIcon);
export const MaterialIcons = deferIcon(MaterialIcon);

export type FeatherProps = ComponentProps<typeof Feather>;
export type MaterialCommunityIconsProps = ComponentProps<typeof MaterialCommunityIcons>;
