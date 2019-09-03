import { Interval, IntervalTaskRunner } from 'interval-task-runner';
import { RecipientMessageBuffer } from './networking';

/**
 * Periodically retrieves messages from a supplied `RecipientMessageBuffer`, and performs an operation with that message
 * (e.g. mutating the state of a game).
 * @template Message The type of the message that will be received by the `RecipientMessageBuffer`.
 */
export abstract class MessageBufferProcessor<Message> {

  private readonly IntervalTaskRunner: IntervalTaskRunner;

  public constructor(private readonly messageBuffer: RecipientMessageBuffer<Message>, processingRateHz: number) {
    this.IntervalTaskRunner = new IntervalTaskRunner(() => this.processMessages(), Interval.fromHz(processingRateHz));
  }

  public start() {
    this.IntervalTaskRunner.start();
  }

  public stop() {
    this.IntervalTaskRunner.stop();
  }

  protected abstract processMessage(message: Message): void;

  private processMessages() {
    for (const message of this.messageBuffer) {
      this.processMessage(message);
    }
  }
}
