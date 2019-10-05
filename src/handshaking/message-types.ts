export const handshakeMessageKind = 'handshake';

export interface ClientHandshakeRequest {
  kind: typeof handshakeMessageKind;
}

export interface ServerHandshakeResponse {
  kind: typeof handshakeMessageKind;
  entityUpdateRateHz: number;
}
