**Under Construction**

# The thinking process behind the design of a game synchronization framework

The purpose of this project is to design a small TypeScript/JavaScript framework that can be used to add client/server networking support to existing games with minimal/no required change to existing code, focusing on smooth movement of other players and objects that they may control.

## Starting out

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
    connectionToServer.onMessageReceived((gameState) => this.emitStateChange(gameState));
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
class ServerNetworker<PlayerInput, GameState> {
  private readonly clientConnections = [];
  private readonly inputListeners = [];

  public addClient(connectionToClient) {
    this.clientConnections.push(connectionToClient);
    connectionToClient.onMessageReceived((input) => {
      this.inputListeners.forEach((listener) => listener(input));
    });
  }

  public broadcastState(gameState: GameState) {
    this.clientConnections.forEach((connection) => {
      connection.send(gameState);
    });
  }

  public onInputReceived(fn) {
    this.inputListeners.push(fn);
  }
}
```

### Analysis 

With this implementation, the user just needs to provides some glue code to network their game--specifically, some code on the client to apply incoming messages onto the local game state and some code on the server to apply inputs received from clients. If the programmer has the code for the `connection` parameters, they more-or-less already have the code they need--the framework just provides named aliases for the `connections` methods. Maybe we could throw in some factory functions for creating network connections (e.g. `createWebSocketConnection('urlhere')`) to add some convenience for the user and we call it a day.

However, many programmers with a lot of experience playing online games or those weary of network latency/instability will know that things aren't so simple.

First let's define some terms:

* Let *I* be the time, in milliseconds, it takes for a player input to reach the server once sent from some client.
* Let *S*  be the time, in milliseconds, it takes for a game state broadcasted from the server to reach the aforementioned client.
* Let *P* equal *I+S*. This is the round-trip latency between the server and the aforementioned client. 

Moving on to some analysis of the above implementation, it seems at first glance that it seems simple-to-use and effective; however, **it does not account for latency between server and clients**, resulting in the following problems.

1. The effects of a player's input won't reach their client until *P* milliseconds have passed. Imagine pressing up/forward on the controller and having to wait--say a tenth of a second--for your character to actually start moving forward; or, pulling the trigger on a gun and having to wait a bit for it to fire.
2. The server almost certainly won't be able to process client inputs and broadcast game state quickly enough to ensure smooth movement for the clients. Say that our game is designed to advance/step/tick/update sixty times a second. To get smooth movement of game objects, `Server#broadcastState` would have to be called that often and the client's `Connection` would need to poll for new messages at the same rate. Applying every client's input and then broadcasting the new state of the game to every client would likely require an unrealistic/impossible amount of CPU and network bandwidth.
3. The expected effect of a player's input may not take place, because 1) the player is acting on outdated information (specifically, the state of the game *S* milliseconds ago) and 2) the player's input will take *I* milliseconds to reach the server and actually take effect.
   Therefore, to have an input behave as a player would expect it to, they would need to make their input *P* milliseconds in advance, which many player's would not consider acceptable/playable.

The client programmer would have to account for all this themselves, which is a pretty monumental task (which is probably why they would be looking a framework/tool to help them out with it). At this point, the above code solves the least of their worries (or even worse, they may be oblivious to all of this, write an implementation for their game, and then run into all these issues).

Could we try to solve these problems ourselves? Could we at least provide client programmers tools to solve these problems in their games, as problems will vary game-to-game and may not have universal solutions? Besides, our framework right now is very light--it does little more than specify that a client is something has a connection to a server and that the server has the means to take and apply inputs from clients and send the state back to them. Perhaps we can add some more code on top of it to help.

## Dealing with networks

Referring to the above list of problems surrounding networking of games, we will look at some common approaches to dealing with them, and then consider how we can bake these into the framework.

*Some terminology: **local objects** are objects being controlled on one player's own client while objects controlled by other players are **remote objects**.*

* Client-side prediction (and server reconciliation) are commonly used to deal with problem number 1. Gabriel Gambetta wrote an [article](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html) explaining these techniques. In short, when a client sends an input to the server it 1) applies the input to the local version of the game immediately without waiting for confirm from the server (i.e. prediction) and 2) saves the input. When an update is received from the server, the client takes this state and reapplies all inputs it knows to have not reached the server yet (i.e. server reconciliation).
* There are multiple methods to deal with problem 2. Regardless of the approach used, we first need to lower the update rate of the server enough to ensure that it can actually perform the updates in time (e.g. 10 times/second). However, the client's now have very sparse information about remote game objects (and local ones, if client-side prediction and server reconciliation are not employed). Continuing with the example server update rate of 10 times per second, clients would only be able to update 10 times per second, which is very choppy--unplayably so. Two common approaches are:
  * [Interpolation](https://www.gabrielgambetta.com/entity-interpolation.html): the client continues to update at a rate much higher than the server; but, for each update, it computes an interpolated (or "in-between") state from two past states it has received from the server. Here's an example. Let's suppose the server has an update rate of 10 times/second, and on the client side, we want to get updates at a rate of 60 times/second. Now suppose the current time is **t = 1016ms** when we call to update the client. We have have server data from **t = 900ms** and **t = 1000ms**. The client will compute a state representing what it believes to have been the state on the server at **t=916ms** by computing a state that's 16% of the way between the former and the latter. One potential problem is that the game state provided by clients is now even further into the past, since we have to wait for a second server update before we can start updating the client. Don't forget latency as well.
  * [Extrapolation/dead-reckoning](http://docs.lance.gg/tutorial-guide_syncextrapolation.html): the client predicts the state of the game on the server using past-data (hence, the name extrapolation). A problem with this approach is that clients have to reconcile between the game state they predicted and the game state that actually occurred on the server, once that arrives to the client.
* [Lag compensation](https://www.gabrielgambetta.com/lag-compensation.html) is the solution to problem 3. Unfortunately, the process can be very CPU-intensive for the server. The link describes the process of lag compensation pretty concisely, so I won't explain the typical process here.

### Implementing Networking Features

#### Client-side prediction

To add client client-side prediction, we could make `ClientNetworker` aware of the local client's game state and the strategy for applying inputs to that state, so that, upon sending an input, it can apply it to the local game client:

```typescript
class ClientNetworker {
  // ...
  public constructor(private connectionToServer, private localGameInputApplicationStrategy) { }
  
  public sendInput(input) {
    this.connectionToServer.send(input);
    this.localGameInputApplicationStrategy(input); // new -- applies the input to the local instance of the game
  }
  // ...
}
```

However, we should consider the varying potential needs of the game programmer. Recall that the goal of the framework is to help users add multiplayer support to existing games. The client programmer's game client

1. May already apply inputs locally as soon as they happen, in which case inputs would be errantly be applied a second time by `ClientNetworker`.
2. May have initially inputs locally; but then may have been reprogrammed so that upon entering "multiplayer mode," it stops applying inputs locally and lets the server do it.

Another problem is that the current name of the method that handles inputs on the client is `sendInput`, which doesn't convey anything about client prediction or applying inputs locally. The programmer could notice the new `localGameInputApplicationStrategy` parameter and the read the documentation and know to stop applying inputs locally, but this seems like potentially unnecessary overhead for the programmer. We could probably make the framework more flexible rather than unnecessary opinionated.

I can think of two ways of approaching the problem:

* Ask the programmer to 1) have their client stop applying inputs locally and 2) give us the means to do it for them; or
* Ask the programmer to specify whether or not they want do this themselves; and, if they don't, ask them for the means to do it for them.

For the former option, I can't think of a way to ask the client programmer to stop predicting inputs themselves through code --it would have to be through the documentation, which isn't ideal. Plus, what if the programmer does not want all inputs to be predicted? Remember that by the time an input reaches the server, it may no longer be a valid input. Given this, imagine an input that results in a dramatic animation playing or causes the game UI to change substantially or suddenly, but the input is too late and turns out to be invalid/impotent on the server. Having the client revert all of that when it gets the news that the input didn't result in the expected outcome can be quite jarring (think about undoing/rolling back brutalities in Mortal Kombat or stage transitions in Injustice--that would be jarring).

Looking at the latter option on the list and given what was just discussed, we should look at making client prediction an optional feature and try to make it highly discoverable to the client programmer. One could argue that in the last implementation, client prediction is already optional. In the case where input prediction is wanted only for certain inputs, the argument could examine the input and perform a no-op if prediction is not desired, but this seems a little smelly to me. We could augment this by making the parameter optional completely. However, this would still fail to address some shortcomings:

1. Recall that this does not fix `sendInput` being not descriptive of what happens when an input is sent.
2. This pollutes the `ClientNetworker` constructor. We haven't gotten to adding server reconciliation or entity interpolation yet which may result in even more parameters.

We could fix number by adding a new method, `sendInputWithPrediction`, that calls `sendInput` and then also applies the input locally, but then we couldn't make `localGameInputApplicationStrategy` an optional paramater, so we are back to problem of forcing the client to pass a no-op if they aren't interested in input-prediction at all. We could make a new class, `InputPredictingClientNetworker`, that extends `ClientNetworker`, adding the `localGameInputApplicationStrategy` parameter to the constructor and the `sendInputWithPrediction` method. The problem is, again, what happens when we add new features down the line. We need more subclasses. What happens when we want multiple features going at the same time? We have have a combinatorial explosion of classes, which is difficult to process for both the client programmer and the framework maintainer.

I honestly can't think a solution that satisfies all dimensions of the problem completely. A trade-off has to be made. One way to make `ClientNetworker` more extensible without subclassing or decorating it is to provide a means to listen for outgoing inputs.

```typescript
class ClientNetworker {
  // ...
  private readonly inputSentListeners = [];
  
  public onInputSent(fn) {
    this.inputSentListeners.push(fn);
  }
  
  public sendInput(input: PlayerInput) {
  	this.connectionToServer.send(input);
    this.inputSentListeners.forEach((fn) => fn(input)); // new
  }
  // ...
}
```

With this, the programmer can implement input prediction themselves by listening for sent inputs and applying it themselves. Let's create a built-in convenience function for them:

```typescript
function addInputPredictionToClient(clientNetworker, localGameInputApplicationStrategy) {
  clientNetworker.onInputSent((input) => localGameInputApplicationStrategy(input));
  return clientNetworker;
}
```

This solution keeps `ClientNetworker` nearly as light as it was before. Plus, the new `onInputSent` method could prove useful for numerous other reasons outside of input prediction, so I'd say it earns its place. However, where this solution falls short is the visibility of input prediction. At the time of use of `ClientNetworker`, we only see the call to `sendInput`. The only way for a code reader to notice input prediction is by having seen the call to `addInputPredictionToClient` in advance. Honestly, I think the tradeoff is worth it. We could always revisit the subclassing approach later.

#### Server reconciliation

To allow clients to perform server reconciliation, the client-side needs to know which of its sent inputs have been processed by the server whenever it receives an update from the server. To do this:

2. the client tags each input with a sequence number, which identifies each input as the *N*th input it has sent.
2. the server tags each state message with the sequence number of the most recently processed input of the recipient client.
3. the client, upon receiving a game state message from the server and updating the local game state to match it, reapplies/predicts local inputs that have not been confirmed to have already reached the server. This is done by examining the latest sequence number that the server sent along with the game state.

Let's consider these one-at-a-time:

##### The client tags each input with a sequence number, which identifies each input as the *N*th input it has sent.

OK, seems simple enough.

```typescript
class ClientNetworker {
  // ...
  public constuctor(connectionToServer: ConnectionToServer<PlayerInput, GameState>) {
    let sequenceNumberOfNextInput = 0;
  	this.connectionToServer = {
      send: (input) => {
        input.sequenceNumber = sequenceNumberOfNextInput;
        connectionToServer.send(input);
        sequenceNumberOfNextInput += 1;
      },
      onMessageReceived: connectionToServer.onMessageReceived,
    };
    this.connectionToServer.onMessageReceived((gameState) => this.emitState(gameState));
  }
  // ...
}
```

Problem: adding `sequenceNumber` pollutes `input`. One could argue that the chance of the programmer having their `input` already contain a `sequenceNumber` field is low and that we wouldn't be overwriting it, but I don't like that it is even possible. We could wrap the input in another object that contains the sequence number.

```typescript
{
  /* ... */
  send: (input) => {
    connectionToServer.send({
      input,
      sequenceNumber: sequenceNumberOfNextInput,
    });
    sequenceNumberOfNextInput += 1;
  }
  /* ... */
}
```

I have a few concerns with this though:

1. If the server is not aware that the client is attempting to perform server reconciliation, then the message won't make sense, and we'll have a runtime error on our hands. I think the server should be responsible for validating input structure anyway, so I think this isn't a real issue (but we'll need to remember that good later, because it's a good idea.)
2. This code modifies what the connection sends. We have no guarantee that the connection supports sending data of our new type.
3. This method makes server reconciliation a mandatory feature.

As mentioned, 1 is fine, but we should fix 2 and 3. Rather than making this a responsibility of `ClientNetworker`, let's move this to the connection itself.

```typescript
function addServerReconciliationSupportToClientConnection(connectionToServer) {
  let sequenceNumberOfNextInput = 0;
  return {
    send: (input) => {
      input.sequenceNumber = sequenceNumberOfNextInput;
      nextInputSequenceNumber += 1;
      connectionToServer.send({
        input,
        sequenceNumber: sequenceNumberOfNextInput,
      });
    },
    onMessageReceived: connectionToServer.onMessageReceived,
  }
}
```

Now, we have to have to support unwrapping the message on the server-side. This makes for a great segue to the next part of supporting server reconciliation on the server side.

##### The server tags each state message with the sequence number of the most recently processed input of the recipient client.

We need a way to save the sequence number of the last input we've seen, per client, so we need to know, when processing an input, which client sent it. Before we can get to that however, we need to implement unwrapping the messages from clients attempting server reconciliation. Since we've yet to extend things on the server end and it's been a while since server code has been examined, here it is again:

```typescript
class ServerNetworker<PlayerInput, GameState> {
  private readonly clientConnections = [];
  private readonly inputListeners = [];

  public addClient(connectionToClient) {
    this.clientConnections.push(connectionToClient);
    connectionToClient.onMessageReceived((input) => {
      this.inputListeners.forEach((listener) => listener(input));
    });
  }

  public broadcastState(state: GameState) {
    this.clientConnections.forEach((connection) => {
      connection.send(this.stateSource.read());
    });
  }

  public onInputReceived(fn) {
    this.inputListeners.push(fn);
  }
}
```

Continuing with how we've been approaching implementation, let's make changes directly in `ServerNetworker`, making the server reconciliation a mandatory feature; and then attempt to hoist them out of the class.

```typescript
class ServerNetworker<PlayerInput, GameState> {
  private readonly clientConnections = [];
  // Maps connections to the sequence number of the latest processed input
  // from that connection. Using functions as keys to a map is a bit silly, but it
  // let's us focus on the problem we are currently trying to solve.
  private readonly lastProcessedInputSequenceNumbers = new Map();
  private readonly inputListeners = [];

  public addClient(connectionToClient) {
    this.clientConnections.push(connectionToClient);
    // rename input to inputMessage, since what's coming over the wire is now more than just the game input
    connectionToClient.onMessageReceived((/*input*/ inputMessage) => {
      const sequenceNumber = inputMessage.sequenceNumber; // new
      const input = inputMessage.input; // new 
      this.lastProcessedInputSequenceNumbers.set(connectionToClient, sequenceNumber); // new
      this.inputListeners.forEach((listener) => listener(input));
    });
  }

  public broadcastState(gameState: GameState) {
    this.clientConnections.forEach((connection) => {
      // Replaces old call to connection.send
      connection.send({
        gameState,
        lastProcessedInputSequenceNumber: this.lastProcessedInputSequenceNumbers.get(connection),
      });
    });
  }

  public onInputReceived(fn) {
    this.inputListeners.push(fn);
  }
}
```

So, we have three changes.

1. A simple data structure to remember the latest input we've seen per client, in the form of a `Map`.
2. We unwrap the new input message type, saving the input sequence number and then calling input reception listeners with just the input.
3. When broadcasting the game state to a client, we also provide the sequence number of the last processed input from that client.

We will handle this in a manner similar to what we did on the client side via the verbosely-named `addServerReconciliationSupportToClientConnection` function.

```typescript
function addServerReconciliationSupportToServerConnection(connectionToClient) {
  let lastProcessedInputSequenceNumber = 0;
  const messageReceivedListeners = [];
  
  connectionToClient.onMessageReceived((inputMessage) => {
    const input = inputMessage.input;
    const inputSequenceNumber = inputMessage.inputSequenceNumber;
    lastProcessedInputSequenceNumber = inputSequenceNumber;
    this.messageReceivedListeners.foreach((fn) => fn(input));
  });
 
  return {
    send: (gameState) => {
    	connection.send({
      	gameState,
        lastProcessedInputSequenceNumber: this.lastProcessedInputSequenceNumbers.get(connection),
      });
		},
		onMessageReceived: (fn) => {
      this.messageReceivedListeners.push(fn);
    }
  };
}
```

##### The client, upon receiving a game state message from the server and updating the local game state to match it, reapplies/predicts local inputs that have not been confirmed to have already reached the server. 

Let's add this to `addServerReconciliationSupportToClientConnection`. Like we did with `addInputPredictionToClient`, we need a new parameter to use to help us apply inputs to the game.

```typescript
function addServerReconciliationSupportToClientConnection(connectionToServer, localGameInputApplicationStrategy) {
  let sequenceNumberOfNextInput = 0;
  let pendingInputMessages = [];

  connectionToServer.onMessageReceived((gameStateMessage) => {
    const gameState = gameStateMessage.gameState;
    const lastProcessedInputSequenceNumber = gameStateMessage.lastProcessedInputSequenceNumber;
    pendingInputMessages = pendingInputMessages.filter((input) => input.sequenceNumber > lastProcessedInputSequenceNumber);
    pendingInputMessages.forEach((pim) => localGameInputApplicationStrategy(pim.input));
  });

  return {
    send: (input) => {
      input.sequenceNumber = sequenceNumberOfNextInput;
      nextInputSequenceNumber += 1;
      // Save this to a variable instead of passing as a literal to .send.
      const inputMessage = {
        input,
        sequenceNumber: sequenceNumberOfNextInput,
      };
      connectionToServer.send(inputMessage);
      pendingInputMessages.push(input); // Save the input along with its sequence number.
    },
    onMessageReceived: connectionToServer.onMessageReceived,
  }
}
```

That should wrap up server reconciliation! Let's review our work by examining what the client programmer would write to add client prediction and server reconciliation support to their game networking strategy.

```typescript

```

