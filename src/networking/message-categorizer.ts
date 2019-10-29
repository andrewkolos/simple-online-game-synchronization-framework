import { ValueOf } from '../util-types';

export interface MessageTypeMap<T> {
  [key: string]: T;
}

export type PickMessageType<T extends MessageTypeMap<unknown>> = ValueOf<T>;
export type PickMessageTypeByKey<T extends MessageTypeMap<unknown>, K extends string> = T[K];

export type MessageCategoryAssigner<TypeMap extends MessageTypeMap<unknown>> = (message: PickMessageType<TypeMap>) => keyof TypeMap;
export interface MessageCategorizer<TypeMap extends MessageTypeMap<unknown>> {
  availableCategories: {[K in keyof TypeMap]: unknown };
  assigner: MessageCategoryAssigner<TypeMap>;
}

export namespace MessageCategoryAssigner {
  export function byStringProperty<TypeMap extends MessageTypeMap<M>, M>(propertyName: keyof M) {
    return (message: PickMessageType<TypeMap>) => message[propertyName];
  }
}
