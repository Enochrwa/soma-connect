import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000";

let sharedSocket: Socket | null = null;

function getSocket(): Socket {
  if (!sharedSocket || sharedSocket.disconnected) {
    sharedSocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  }
  return sharedSocket;
}

/** Subscribe to a Socket.IO event. Auto-cleans up on unmount. */
export function useSocketEvent<T = unknown>(event: string, handler: (data: T) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = getSocket();
    const cb = (data: T) => handlerRef.current(data);
    socket.on(event, cb);
    return () => {
      socket.off(event, cb);
    };
  }, [event]);
}

/** Emit a Socket.IO event. */
export function useSocketEmit() {
  return (event: string, data?: unknown) => {
    const socket = getSocket();
    socket.emit(event, data);
  };
}

/** Subscribe to order tracking updates for a specific order ID. */
export function useOrderTracking(
  orderId: string | undefined,
  onUpdate: (payload: unknown) => void,
) {
  const emit = useSocketEmit();

  useEffect(() => {
    if (!orderId) return;
    emit("subscribeOrder", orderId);
  }, [orderId, emit]);

  useSocketEvent("orderUpdate", (payload) => {
    onUpdate(payload);
  });
}
