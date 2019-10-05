// import { SenderMessageBuffer, StateMessage } from '../../networking';
// import { InputCollectionStrategy } from './input-collection-strategy';
// import { Defined } from 'yargs';
// import { Interface } from '../../util';
// import { SyncToServerStrategy } from '../../entity';
// export type PlayerSyncToServerStrategy<EntityState, EntityInput> =
//   (stateMessages: Array<StateMessage<EntityState>>, inputs: EntityInput[]) => EntityState;

// interface LocalPlayerSynchronizerArgs<S, I, PI> {
//   connectionToServer: SenderMessageBuffer<PI>;
//   inputCollectionStrategy: InputCollectionStrategy<I>;
//   syncStrategy: PlayerSyncToServerStrategy<S, I>;
//   inputPacker: (input: I) => PI;
// }

// /**
//  * Given state messages sent by a server and a way to collect inputs from the local player's client,
//  * synchronizes a local player's entity with its representation on the server.
//  * @template S The type of the state of the entity.
//  * @template I The type of an input that can be applied to the entity.
//  * @template PI The type of the input after being packed so it can be sent to the server.
//  */
// export function PlayerServerSyncStrategy<S, I, PI>(args: LocalPlayerSynchronizerArgs<S, I, PI>): SyncToServerStrategy<S> {
//   return (stateMessages: Array<StateMessage<S>>) => {
//     const inputs = args.inputCollectionStrategy();
//     const packagedInputs = inputs.map((input: I) => args.inputPacker(input));
//     args.connectionToServer.send(packagedInputs);
//     return args.syncStrategy(stateMessages, inputs);
//   };
// }

// type PartialLocalPlayerSynchronizerArgs<S, I, PI> = Partial<LocalPlayerSynchronizerArgs<S, I, PI>>;

// export class LocalPlayerSynchronizerBuilder {

//   /** @internal */
//   private _args: LocalPlayerSynchronizerArgs<unknown, unknown, unknown>;

//   public usingPlayerInputsFrom<I>(inputCollectionStrategy: InputCollectionStrategy<I>) {
//     this._args.inputCollectionStrategy = inputCollectionStrategy;
//     return new SyncerStep(this._args as ArgsAtSyncerStep<I>);
//   }
// }

// type ArgsAtSyncerStep<I, S = unknown, PI = unknown> = Defined<PartialLocalPlayerSynchronizerArgs<S, I, PI>, 'inputCollectionStrategy'>;

// export interface ISyncerStep<I> extends Interface<SyncerStep<I>> { }

// class SyncerStep<I> implements ISyncerStep<I> {
//   public constructor(private readonly args: ArgsAtSyncerStep<I>) { }

//   public synchronizeWithServerMessagesBy<S>(strategy: PlayerSyncToServerStrategy<S, I>): IConnectionStep<S, I> {
//     this.args.syncStrategy = strategy;
//     return new ConnectionStep<S, I>(this.args as ArgsAtConnectionStep<S, I>);
//   }
// }

// type ArgsAtConnectionStep<S, I, PI = unknown> = Defined<ArgsAtSyncerStep<I, S, PI>, 'syncStrategy'>;

// export interface IConnectionStep<S, I> extends Interface<ConnectionStep<S, I>> { }

// class ConnectionStep<S, I> {
//   public constructor(private readonly args: ArgsAtConnectionStep<S, I>) { }

//   public thenSendInputsToServerAfterSyncingUsing<PI>(connection: SenderMessageBuffer<PI>): IInputPackingStep<S, I, PI> {
//     this.args.connectionToServer = connection;
//     return new InputPackingStep<S, I, PI>(this.args as ArgsAtInputPackingStep<S, I, PI>);
//   }
// }

// type ArgsAtInputPackingStep<S, I, PI> = Defined<ArgsAtConnectionStep<S, I, PI>, 'connectionToServer'>;

// export interface IInputPackingStep<S, I, PI> extends Interface<InputPackingStep<S, I, PI>> { }

// class InputPackingStep<S, I, PI> {
//   public constructor(private readonly args: ArgsAtInputPackingStep<S, I, PI>) { }

//   public packingInputsWith(inputPacker: (input: I) => PI): IBuildStep<S, I, PI>{
//     this.args.inputPacker = inputPacker;
//     return new BuildStep(this.args as ArgsAtBuildStep<S, I, PI>);
//   }
// }

// type ArgsAtBuildStep<S, I, PI> = Defined<ArgsAtInputPackingStep<S, I, PI>, 'inputPacker'>;

// export interface IBuildStep<S, I, PI> extends Interface<BuildStep<S, I, PI>> { }

// class BuildStep<S, I, PI> {
//   public constructor(private readonly args: ArgsAtBuildStep<S, I, PI>) { }

//   public build(): SyncToServerStrategy<S> {
//     return PlayerServerSyncStrategy(this.args as LocalPlayerSynchronizerArgs<S, I, PI>);
//   }
// }

// // example
// type MyEntityInput = number;
// type MyEntityState = string;
// type PackedEntityInput = MyEntityInput & { someshitaboutsynchronization: 'bar' }; // Input, but in the packet-form the server expects.

// declare const inputCollector: InputCollectionStrategy<MyEntityInput>;
// declare const syncStrategy: PlayerSyncToServerStrategy<MyEntityState, MyEntityInput>;
// declare const connection: SenderMessageBuffer<PackedEntityInput>;
// declare const inputPackager: (input: MyEntityInput) => PackedEntityInput;

// const synchronizer: SyncToServerStrategy<MyEntityState> = new LocalPlayerSynchronizerBuilder()
//   .usingPlayerInputsFrom(inputCollector)
//   .synchronizeWithServerMessagesBy(syncStrategy)
//   .thenSendInputsToServerAfterSyncingUsing(connection)
//   .packingInputsWith(inputPackager).build();

