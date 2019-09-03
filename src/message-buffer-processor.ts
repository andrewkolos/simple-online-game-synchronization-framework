import { Interval, IntervalTaskRunner } from 'interval-task-runner';
import { RecipientMessageBuffer } from './networking';

/**
 * Periodically retrieves messages from a supplied `RecipientMessageBuffer`, and performs an operation with that message
 * (e.g. mutating the state of a game).
 * @template Message The type of the message that will be received by the `RecipientMessageBuffer`.
 */
export class MessageBufferProcessor<Message> {

  private readonly taskRunner: IntervalTaskRunner;

  /**
   * Creates a MessageBufferProcessor.
   * @param processFn What to do with each message retrieved.
   * @param messageBuffer The buffer to retrieve the messages from.
   * @param processingRateHz How often this processor should retrieve messages and process them.
   */
  public constructor(private readonly processFn: (message: Message) => void,
    private readonly messageBuffer: RecipientMessageBuffer<Message>, processingRateHz: number) {
    this.taskRunner = new IntervalTaskRunner(() => this.processMessages(), Interval.fromHz(processingRateHz));
  }

  /**
   * Starts this processor.
   */
  public start() {
    this.taskRunner.start();
  }

  /**
   * Stops this processor.
   */
  public stop() {
    this.taskRunner.stop();
  }

  private processMessages() {
    for (const message of this.messageBuffer) {
      this.processFn(message);
    }
  }
}
