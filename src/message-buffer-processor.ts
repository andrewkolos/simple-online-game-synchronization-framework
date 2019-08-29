import { RecipientMessageBuffer } from './networking';
import { Interval, IntervalRunner } from './util/interval-runner';

/**
 * Periodically retrieves messages from a supplied `RecipientMessageBuffer`, and performs an operation with that message
 * (e.g. mutating the state of a game).
 * @template Message The type of the message that will be received by the `RecipientMessageBuffer`.
 */
export abstract class MessageBufferProcessor<Message> {

  private readonly intervalRunner: IntervalRunner;

  public constructor(private readonly messageBuffer: RecipientMessageBuffer<Message>, processingRateHz: number) {
    this.intervalRunner = new IntervalRunner(() => this.processMessages(), Interval.fromHz(processingRateHz));
  }

  public start() {
    this.intervalRunner.start();
  }

  public stop() {
    this.intervalRunner.stop();
  }

  protected abstract processMessage(message: Message): void;

  private processMessages() {
    for (const message of this.messageBuffer) {
      this.processMessage(message);
    }
  }
}
