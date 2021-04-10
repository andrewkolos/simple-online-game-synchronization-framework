export interface KeycodeNameMapping {
  [name: string]: number;
}

export type KeyDownStates<M extends KeycodeNameMapping> = { [P in keyof M]: boolean };

export class KeyStateTracker<M extends KeycodeNameMapping> {

  private readonly downMapping = new Map<keyof M, boolean>();
  private readonly keyNameLookupMap = new Map<number, keyof M>();

  private downListener = ((e: KeyboardEvent) => {
    this.setKeyState(e.keyCode, true);
  });

  private upListener = ((e: KeyboardEvent) => {
    this.setKeyState(e.keyCode, false);
  });

  public constructor(private readonly keyNameMap: M) {
    Object.keys(keyNameMap).forEach((key: keyof M) => {
      this.keyNameLookupMap.set(keyNameMap[key], key);
    });

    window.addEventListener('keydown', this.downListener);
    window.addEventListener('keyup', this.upListener);
  }

  public isKeyDown(key: keyof M): boolean {
    const mapEntry = this.downMapping.get(key);
    return mapEntry == null ? false : mapEntry;
  }

  public isKeyUp(key: keyof M): boolean {
    return !this.isKeyDown(key);
  }

  public consumeKey(key: keyof M): boolean {
    const keyIsDown = this.isKeyDown(key);
    this.downMapping.set(key, false);
    return keyIsDown;
  }

  public getAllKeyDownStates(): { [P in keyof M]: boolean } {
    const keyDownStates: { [P in keyof M]: boolean } = {} as any;

    for (const key in this.keyNameMap) {
      if (this.keyNameMap.hasOwnProperty(key)) {
        keyDownStates[key] = this.isKeyDown(key);
      }
    }

    return keyDownStates;
  }

  public destroy() {
    window.removeEventListener('keydown', this.downListener);
    window.removeEventListener('keyup', this.upListener);
  }

  private getKeyName(keyCode: number): keyof M | undefined{
    const name = this.keyNameLookupMap.get(keyCode);

    if (name == null) return undefined;

    return name as M[keyof M];
  }

  private setKeyState(keyCode: number, value: boolean) {
    const keyname = this.getKeyName(keyCode);
    if (keyname == null) return;
    this.downMapping.set(keyname, value);
  }
}
