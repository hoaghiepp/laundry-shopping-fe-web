export type WebAlertButton = {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

export type WebAlertPayload = {
  title: string;
  message?: string;
  buttons?: WebAlertButton[];
};
type HostHandler = (payload: WebAlertPayload) => void;

let hostHandler: HostHandler | null = null;

export function registerWebAlertHost(handler: HostHandler | null) {
  hostHandler = handler;
}

/** Returns true if the in-app web dialog host handled the alert. */
export function tryPushWebAlert(payload: WebAlertPayload): boolean {
  if (!hostHandler) return false;
  hostHandler(payload);
  return true;
}
