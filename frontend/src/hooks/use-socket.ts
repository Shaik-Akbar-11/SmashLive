import { useEffect, useRef } from 'react';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '');

let globalSocket: any = null;
let socketPromise: Promise<any> | null = null;

function getSocketAsync(): Promise<any> {
  if (globalSocket && !globalSocket.disconnected) return Promise.resolve(globalSocket);
  if (socketPromise) return socketPromise;
  socketPromise = import('socket.io-client').then(({ io }) => {
    globalSocket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    return globalSocket;
  }).catch(() => null);
  return socketPromise;
}

// Sync getter — returns null if not yet loaded (used by LiveBroadcast)
export function getSocket(): any {
  return globalSocket;
}

/**
 * Subscribes to a socket event and cleans up on unmount.
 * No-ops gracefully when backend is offline.
 */
export function useSocketEvent(event: string, handler: (data: any) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    let socket: any = null;
    const fn = (data: any) => handlerRef.current(data);
    getSocketAsync().then((s) => {
      if (!s) return;
      socket = s;
      socket.on(event, fn);
    });
    return () => {
      if (socket) socket.off(event, fn);
    };
  }, [event]);
}

/**
 * Join a match room and leave on unmount.
 */
export function useMatchRoom(matchId: string | undefined) {
  useEffect(() => {
    if (!matchId) return;
    getSocketAsync().then((s) => {
      if (s) s.emit('match:join', matchId);
    });
    return () => {
      if (globalSocket) globalSocket.emit('match:leave', matchId);
    };
  }, [matchId]);
}
