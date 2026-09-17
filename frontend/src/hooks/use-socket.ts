import { useEffect, useRef } from 'react';

// Socket.IO is only available when the backend (Render) is live.
// When offline / frontend-only, all calls are silent no-ops.

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '');

let globalSocket: any = null;

function initSocket() {
  if (globalSocket) return globalSocket;
  // Dynamically require socket.io-client at runtime only
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { io } = require('socket.io-client');
    globalSocket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  } catch {
    // Backend not available — silent no-op
    globalSocket = {
      on: () => {},
      off: () => {},
      emit: () => {},
      connected: false,
      disconnected: true,
    };
  }
  return globalSocket;
}

export function getSocket() {
  return globalSocket || initSocket();
}

export function useSocketEvent(event: string, handler: (data: any) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const fn = (data: any) => handlerRef.current(data);
    const socket = getSocket();
    socket.on(event, fn);
    return () => socket.off(event, fn);
  }, [event]);
}

export function useMatchRoom(matchId: string | undefined) {
  useEffect(() => {
    if (!matchId) return;
    const socket = getSocket();
    socket.emit('match:join', matchId);
    return () => socket.emit('match:leave', matchId);
  }, [matchId]);
}
