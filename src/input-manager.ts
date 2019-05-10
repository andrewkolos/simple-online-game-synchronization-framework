import Keyboard from 'keyboardjs';

type InputId = string;
type Predicate = () => boolean;

/**
 * Used to register and detect current activates inputs.
 */
class RawInputManager {
  
  private inputNames: Set<string>;
  private collectors: Map<string, () => number>;

  public registerInput(name: string, collector: () => number): void {
    this.collectors.set(name, collector);
  }

  public unregisterInput(name: string): void {
    this.collectors.delete(name);
  }

  public isInputRegistered(name: string): boolean {
    return this.collectors.has(name);
  }

  public getInputValue(name: string): number {
    const collector = this.collectors.get(name);

    if (collector == undefined) {
      throw new Error(`Attempted to retrieve value for unregistered input "${name}".`);
    } else {
      return collector();
    }
  }

  public clear(): void {
    this.inputNames.clear();
    this.collectors.clear();
  }
}