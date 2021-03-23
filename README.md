# TypeScript Game Client and Server Synchronization Server

The goal of this library is to provide a means to add online game synchronization/networking to existing JS games. It focuses purely on smoothing inputs of other players across clients. This project was inspired by a series of articles released by Gabriel Gambetta, [Fast-Paced Multiplayer](https://www.gabrielgambetta.com/client-server-game-architecture.html). The library can be thought of as a production-ready version of the code he uses in the demo. 

*This project is still under development and is not recommended for use.* I initially stopped working on it but may come back to it at a later time.

## Features
  * **Entity interpolation (automatic).** Smooths out movements of other players/objects that come from the server.
  * **Client prediction (supported).** Apply the local players inputs immediately to avoid having to wait for a roundtrip for the inputs to register. Rollback if the inputs end up being invalid by the time they reach the server.
  * **Server reconciliation (automatic).** Buffer inputs locally and reapply them when we get state updates from the server, keeping client prediction accurate.
  * **Lag compensation (supported).** Every client and thus player is acting on outdated information. Reconstruct what their client looked like at the time of their input in order to validate inputs that would otherwise be too late to be valid.

All these concepts are described in the aforementioned series of articles. They are a fantastic read. The demo also demonstrates the impacts of the above features.
