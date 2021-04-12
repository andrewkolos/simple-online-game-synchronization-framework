import { TwoWayMessageBuffer, InputMessage, StateMessage, Entity, ServerEntitySyncer, ServerEntitySyncerRunner } from '../../../src';
import { BasicDemoPlayerState, demoPlayerInputApplicator, BasicDemoPlayerInput } from './player';
import { EventEmitter } from '@akolos/event-emitter';

export interface DemoPlayerInput {
  pressTime: number;
}

export class DemoPlayerMovementRecord {
  public readonly lastInputTimestamp: number = new Date().getTime();
  public readonly pressTimeDuringLastInput: number = 0;

  public constructor(init: Partial<DemoPlayerMovementRecord> = {}) {
    this.lastInputTimestamp = init.lastInputTimestamp == null ? new Date().getTime() : init.lastInputTimestamp;
    this.pressTimeDuringLastInput = init.pressTimeDuringLastInput == null ? 0 : init.pressTimeDuringLastInput;
  }
}

interface DemoSyncServerEvents {
  synchronized: [ReadonlyArray<Entity<BasicDemoPlayerState>>];
}

export class DemoSyncServer extends EventEmitter<DemoSyncServerEvents> {

  private playerMovementRecords = new Map<string, DemoPlayerMovementRecord>();
  private syncer: ServerEntitySyncer<BasicDemoPlayerInput, BasicDemoPlayerState>;
  private syncerRunner: ServerEntitySyncerRunner<DemoPlayerInput, BasicDemoPlayerState>;

  public constructor() {
    super();

    this.syncer = new ServerEntitySyncer({
      inputApplicator: (entity, input) => this.applyInput(entity, input),
      inputValidator: (entity, input) => this.validateInput(entity, input),
      clientIdAssigner: () => this.getIdForNewClient(),
    });

    this.syncerRunner = new ServerEntitySyncerRunner(this.syncer);
    this.syncerRunner.on('synchronized', (((e) => this.emit('synchronized', e))));
  }

  public addClient(connection: TwoWayMessageBuffer<InputMessage<BasicDemoPlayerInput>, StateMessage<BasicDemoPlayerState>>): string {
    const clientId = this.syncer.connectClient(connection);
    const newEntityid = clientId;

    this.playerMovementRecords.set(newEntityid, new DemoPlayerMovementRecord());
    this.syncer.addPlayerEntity({ id: newEntityid, state: { position: 0 } }, clientId);

    return clientId;
  }

  public start(updateRateHz: number) {
    this.syncerRunner.start(updateRateHz);
  }

  public stop() {
    this.syncerRunner.stop();
  }

  private getIdForNewClient(): string {
    return `c${this.playerMovementRecords.size}`;
  }

  private validateInput(entity: Entity<BasicDemoPlayerState>, input: DemoPlayerInput): boolean {
    const movementRecord = this.playerMovementRecords.get(entity.id);

    if (movementRecord != null && input.pressTime != null) {
      // TODO: devise a scheme that factors in client latency, as below will not work for initial inputs.
      //return movementRecord.lastInputTimestamp + input.pressTime <= new Date().getTime();
    }

    return true;
  }

  private applyInput(playerEntity: Entity<BasicDemoPlayerState>, input: BasicDemoPlayerInput): BasicDemoPlayerState {
    const recordMovementForFutureInputValidation = () => {
      const movementRecord = this.playerMovementRecords.get(playerEntity.id);

      if (movementRecord == null) {
        throw Error(`Player with ID ${playerEntity.id} was not found.`);
      }

      this.playerMovementRecords.set(playerEntity.id, new DemoPlayerMovementRecord({
        pressTimeDuringLastInput: input.pressTime,
      }));
    };

    recordMovementForFutureInputValidation();
    return demoPlayerInputApplicator(playerEntity, input);
  }
}
