export const handshakeMessageKind = 'handshake';

export interface ServerHandshakeResponse {
  kind: typeof handshakeMessageKind;
  entityUpdateRateHz: number;
}
