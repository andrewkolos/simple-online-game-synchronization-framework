# The thinking process behind the design of a game synchronization framework

The purpose of this project is to design a small TypeScript/JavaScript framework that can be used to add client/server networking support to existing games with minimal/no required change to existing code, focusing on smooth movement of other players and objects that they may control.

## A naïve approach

### Requirements

Ideally, a framework that allows the client programmer to add multiplayer support to an existing game need only satisfy the following criteria:

1. Provide a synchronization client that
   1. can send player inputs to a server that's running an instance of the game.
   2. emits/raises an event when new information about the game's state arrives from the server so that the local game instance and/or game renderer can be updated.
2. Provide a synchronization server that
   1. has access to the true state of the game running on the server.
   2. updates the state of the game upon receiving player input.
   3. can broadcast the state of the game to connected clients.

### Implementation

#### Boilerplate connection types

Here we define simple types for objects representing a connection between the client and server

```typescript
interface Connection<IncomingMessage, OutgoingMessage> {
    send(message: OutgoingMessage): void;
    onMessageReceived(fn: (incomingMessage: IncomingMessage) => void);
}

type ConnectionToServer<PlayerInput, GameState> = Connection<GameState, PlayerInput>;
type ConnectionToClient<PlayerInput, GameState> = Connection<PlayerInput, GameState>;
```

#### Client Implementation

```typescript
class ClientNetworker<PlayerInput, GameState> {
    private readonly connectionToServer: ConnectionToServer<PlayerInput, GameState>;
    private readonly stateChangeListeners: Array<(updatedState: GameState) => void> = [];

    public constuctor(connectionToServer: ConnectionToServer<PlayerInput, GameState>) {
        this.connectionToServer = connectionToServer;
        connectionToServer.onMessageReceived((gameState) => this.emitState(gameState));
    }
    
    public sendInput(input: PlayerInput) {
        this.connectionToServer.send(input);
    }
    
   	public onStateChange(listener: (updatedState: GameState) => void) {
        this.stateChangeListeners.push(listener);
    }
 
    private emitStateChange(state: GameState) {
        this.stateChangeListeners.forEach((listener) => listener(state));
    }
}
```

#### Server Implementation

```typescript
// Computes the next state of a game given a player input.
type InputApplicationStrategy<PlayerInput, GameState> = 
	(input: PlayerInput, currentState: GameState) => Partial<GameState>;

// Contains strategies for reading from/writing to the game.
interface StateSource<GameState> {
  read(): GameState;
	write(updatedProps: Partial<GameState>); GameState;
}

class ServerNetworker<PlayerInput, GameState> {
    private readonly clients: Array<ConnectionToClient<PlayerInput, GameState>> = [];
 
  	private readonly stateSource: StateSource<GameState>;
  	private readonly inputApplicationStrategy: inputApplicationStrategy<PlayerInput, GameState>;
    
    public constructor(stateSource: StateSource<GameState>, 
                       inputApplicationStrategy: InputApplicationStrategy<PlayerInput, GameState>) {
      this.stateSource = stateSource;
      this.inputApplicationStrategy = inputApplicationStrategy;
    }
    
    public addClient(connectionToClient) {
      // Save connection to client for state broadcasts.
      this.clients.push(connectionToClient);
      
      // Apply inputs received from client.
      connectionToClient.onMessageReceived((input) => {
       	const gameState = this.stateSource.read();
        const changesToGameState = this.inputApplicationStrategy(input, gameState);
        this.stateSource.write(changesToGameState);
      });
    }
 
    public broadcastState() {
      this.clients.forEach((connection) => {
        connection.send(this.stateSource.read());
      });
    }
}
```

### Analysis 

With this implementation, the user just needs to provides some glue code to network their game. That's it, right? It isn't super useful--a programmer could likely have come up with their own implementation in the time it would take them to understand this one, but it gets the job done. Maybe we throw in some factory functions for creating network connections (e.g. createWebSocketConnection('urlhere')`) to add some convenience for the user and we call it a day.

However, an unwary programmer may not recognize all of the pitfalls of such a simple approach.

First let's define some terms:

* Let *I* be the time, in milliseconds, it takes for a player input to reach the server once sent from some client.
* Let *S*  be the time, in milliseconds, it takes for a game state broadcasted from the server to reach the aforementioned client.
* Let *P* equal *I+S*. This is the round-trip latency between the server and the aforementioned client. 

Moving on to some analysis of the above implementation, it seems at first glance that it seems simple-to-use and effective; however, **it does not account for latency between server and clients**, resulting in the following problems.

1. The effects of a player's input won't reach their client until *P* milliseconds have passed. Imagine pressing up/forward on the controller and having to wait--say a tenth of a second--for your character to actually start moving forward or pulling the trigger on a gun and having to wait for it to fire.
2. The server almost certainly won't be able to process client inputs and broadcast game state quickly enough to ensure smooth movement for the clients. Say that our game is designed to advance/step/tick/update sixty times a second. To get smooth movement of game objects, `Server#broadcastState` would have to be called that often and the client's connection `Connection` would need to poll for new messages at the same rate. Applying every client's input and then broadcasting the new state of the game to every client would likely require an unrealistic/impossible amount of CPU and bandwidth.
3. The expected effect of a player's input may not take place, because 1) the player is acting on outdated information (specifically, the state of the game *S* milliseconds ago), and 2) the player's input will take *I* milliseconds to reach the server and actually take effect.
   Thusly, to have an input behave as a player would expect it to, they would need to make their input *P* milliseconds in advance, which many player's would not consider acceptable/playable.

The client programmer would have to account for all this themselves, which is a pretty monumental task. At this point, the above code solves the least of their worries (or even worse, they may not take this into account at all, write an implementation for their game, and then run into all these issues).

Could we try to solve these problems ourselves (or at least provide client programmers tools to solve these problems in their games, as problems will vary game-to-game and may not have universal solutions)? Besides, our framework right now is very light--it does little more than specify that a client is something has a connection to a server and that the server has the means to take and apply inputs from clients and send the state back to them. Perhaps we can add some more code on top of it to help.

## Dealing with networks

Referring to the above list of problems surrounding networking of games, we will look at some common approaches to dealing with them, and then consider how we can bake these into the framework.

*Some terminology: **local objects** are objects being controlled on one player's own client while objects controlled by other players are **remote objects**.*

* Client-side prediction (and server reconciliation) are commonly used to deal with problem 1. Gabriel Gambetta wrote a [great article](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html) explaining these techniques. In short, when a client sends an input to the server it 1) applies the input to the local version of the game immediately without waiting for confirm from the server (i.e. prediction) and 2) saves the input. When an update is received from the server, the client takes this state and reapplies all inputs it knows to have not reached the server yet (i.e. server reconciliation).
* There are multiple methods to deal with problem 2. Regardless of the approach used, we first need to lower the update rate of the server enough to ensure that it can actually perform the updates in time (e.g. 10 times/second). However, the client's now have very sparse information about remote game objects (and local ones, if client-side prediction and server reconciliation are not employed). Continuing with the example server update rate of 10 times per second, clients would only be able to update 10 times per second, which is very choppy--unplayably so. Two common approaches are:
  * [Interpolation](https://www.gabrielgambetta.com/entity-interpolation.html): the client continues to update at a rate much higher than the server; but, for each update, it computes an interpolated (or "in-between") state from two past states it has received from the server. Here's an example. Let's suppose the server has an update rate of 10 times/second, and on the client side, we want to get updates at a rate of 60 times/second. Now suppose the current time is **t = 1016ms** when we call to update the client. We have have server data from **t = 900ms** and **t = 1000ms**. The client will compute a state representing what it believes to have been the state on the server at **t=916ms** by computing a state that's 16% of the way between the former and the latter. One potential problem is that the game state provided by clients is now even further into the past, since we have to wait for a second server update before we can start updating the client. Don't forget latency as well.
  * [Extrapolation/dead-reckoning](http://docs.lance.gg/tutorial-guide_syncextrapolation.html): the client predicts the state of the game on the server using past-data (hence, the name extrapolation). A problem with this approach is that clients have to reconcile between the game state they predicted and the game state that actually occurred on the server, once that arrives to the client.
* [Lag compensation](https://www.gabrielgambetta.com/lag-compensation.html) is the solution to problem 3. Unfortunately, the process can be very CPU-intensive for the server. The link describes the process of lag compensation pretty concisely, so I won't explain the typical process here.

### Implementing Networking Features

#### Client-side prediction

To add client client-side prediction, we could make `ClientNetworker` aware of the local client's game state and the strategy for applying inputs to that state (like we did with the `ServerNetworker`, so that, upon sending an input, it can apply it to the local game client. However, this is a little error-prone. Why? Recall that the goal of the framework is to help users add multiplayer support to existing games. The client programmer's game client

1. May already apply inputs locally as soon as they happen, in which case we would be applying inputs twice.
2. Applied inputs locally; but then may have been reprogrammed so that upon entering "multiplayer mode," it stops applying inputs locally and lets the server do it.

Another problem is that the current name of the method that handles inputs on the client is `sendInput`, which doesn't convey anything about client prediction or applying inputs locally. The programmer could notice the new `stateSource` and `inputApplicationStrategy` parameters and the read the documentation and know to stop applying inputs locally, but this seems like potentially unnecessary overhead for the programmer.

There isn't going to be a perfect solution to this problem, or at least one I can think of. This is because `ClientNetworker` does not have complete ownership of the state of the game on the client, which we don't want anyway--that would be a step towards having the programmer writing a new client game engine specifically for online play. Because of this, we need choose between the following:

* Ask the programmer to have their client stop applying inputs locally and give us the means to do it for them.
* Ask the programmer to specify whether or not they want do this themselves; and, if they don't, ask them for the means to do it for them.

For the former option, I can't think of a way to ask the client programmer to stop predicting inputs themselves through code--it would have to be through the documentation, which isn't ideal. Plus, what if the programmer does not want all inputs to be predicted? Remember that by the time an input reaches the server, it may no longer be a valid input. Given this, imagine an input that results in a dramatic animation playing or causes the game UI to change substantially or suddenly, but the input is too late and turns out to be invalid/impotent on the server. Having the client revert all of that when it gets the news that the input didn't result in the expected outcome can be quite jarring (think brutalities in Mortal Kombat or stage transitions in Injustice).

Looking at the last option on the list and given what was just discussed, we should look at making client prediction an optional feature and try to make it highly discoverable by the client programmer. 

```typescript
class ClientNetworker {
  // ...
  private constructor() { /* ... */ } // hide constructor
  // ...
}
```





#### Server reconciliation

To allow clients to perform server reconciliation, the client-side needs to know which of its sent inputs have been processed by the server whenever it receives an update from the server. To do this:

1. the client needs to be able to apply inputs locally as soon as they are made.
2. the client tags each input with a sequence number, which identifies each input as the *N*th input it has sent.
3. the server tags each state message with the sequence number of the most recently processed input of the recipient client.

Let's consider these one-at-a-time:

##### *The client needs to be able to apply inputs locally as soon as they are made.*

​	We could pass an `inputApplicationStrategy` and a `stateSource` to `Client`'s constructor, like we do with `Server`. When sending an input to the server, `Client` would then read the local game state and update it with the new input. This begs some questions, however:

* Do we really want to bring the `Client` constructor up to three arguments?
* What if the user doesn't want to use prediction/reconciliation? Would this ever happen?
* Do we want to add another responsibility to the `Client` class? This would make it harder to test.

Okay, let's see if we can come up with an approach that requires little-to-no modification of the `Client` class. We could offload the work to `connectionToServer`, and have a `createPredictingConnectionToServer` factory method that takes the `stateSource` and `inputApplicationStrategy` parameters. This would create a `Connection` that keeps track of input sequence numbers (sending them and receiving them) and applies local inputs as needed.  This keeps the `Client` class lightweight and simple, but it seems counter-intuitive to have a `Connection`, which is only meant to represent a means of sending messages to / receiving messages from somewhere, perform synchronization logic as well. This would work, but we probably should continue to look for better approaches.

One thing that seemed okay with the previous approach was having `Connection` tag inputs with sequence numbers before sending them off, so let's keep that for now. We still need to handle applying inputs to the local instance of the game state whenever we send off inputs to the server. Okay, we could add a listener to `Client` that listens for 

```typescript
class Client {
  // ...
  public sendInput(input) {
    this.connectionToServer.send(input);
    this.inputSentListeners.forEach((listener) => listener(input));
  }
  
  public onInputSent(listener) {
    this.inputSentListeners.push(listener);
  }
  // ...
}

function addStateSourceToInputApplicationStrategy(stateSource, inputAppStrategy) {
  return (input) => {
    const gameState = this.stateSource.read();
    const changesToGameState = this.inputApplicationStrategy(input, gameState);
    this.stateSource.write(gameState);
  };
}

function addPredictionToClient(client, inputApplicator) {
  let pendingInputs = [];
  
  client.onInputSent((input) => {
		applyInputToState(input);
    pendingInputs.push(input);
  });
  
  client.onStateChange((state) => {
    pendingInputs = pendingInputs.filter((input) => input.sequenceNumber > state.lastProcessedSequenceNumber);
   	pendingInputs.forEach((input) => {
      applyInputToState(input);
    });
  });
}
```

