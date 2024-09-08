import { getContext, setContext } from 'svelte';
import NDK from '@nostr-dev-kit/ndk';

const NDK_CONTEXT_KEY = 'ndk';

export function setNDK(ndk: NDK) {
  setContext(NDK_CONTEXT_KEY, ndk);
}

export function getNDK(): NDK {
  return getContext(NDK_CONTEXT_KEY);
}