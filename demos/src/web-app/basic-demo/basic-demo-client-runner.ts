import { ClientEntitySyncerRunner } from '../../../../src';
import { BasicDemoPlayerState, BasicDemoPlayerInput } from '../../basic-demo-implementation/player';

export type BasicDemoClientEntitySyncerRunner = ClientEntitySyncerRunner<BasicDemoPlayerInput, BasicDemoPlayerState>;
