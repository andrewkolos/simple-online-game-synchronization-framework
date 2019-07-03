import { IntervalRunner } from './interval-runner';
import { MessageBuffer } from './networking';

/**
 * Periodically retrieves messages from a supplied `MessageBuffer`, and performs an operation with that message
 * (e.g. mutating the state of a game).
 * @template Message The type of the message that will be received by the `MessageBuffer`.
 */
export abstract class MessageBufferProcessor<Message> {

  private readonly intervalRunner: IntervalRunner;

  public constructor(private readonly messageBuffer: MessageBuffer<Message, any>, processingRateHz: number) {
    this.intervalRunner = new IntervalRunner(() => this.processMessages(), processingRateHz);
  }

  public start() {
    this.intervalRunner.start();
  }

  public stop() {
    this.intervalRunner.stop();
  }

  protected abstract processMessage(message: Message): void;

  private processMessages() {
    while (this.messageBuffer.hasNext()) {
      this.processMessage(this.messageBuffer.receive());
    }
  }
}