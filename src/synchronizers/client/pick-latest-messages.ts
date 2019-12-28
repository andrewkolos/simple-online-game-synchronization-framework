import { StateMessage } from '../../networking';
import { EntityId } from '../../entity';
import { DefaultMap } from '../../util';

export function pickLatestMessages<M extends StateMessage<unknown>>(stateMessages: M[]): M[] {
  const grouped = groupByEntityId(stateMessages, (sm) => sm.entity.id);
  const latest = grouped.map((messages) => findLatestMessage(messages));
  return latest;
}

function groupByEntityId<T>(collection: Iterable<T>, entityIdPicker: (item: T) => EntityId): T[][] {
  return Array.from(indexByEntityId(collection, entityIdPicker).values());
}

function indexByEntityId<T>(collection: Iterable<T>, entityIdPicker: (item: T) => EntityId): Map<EntityId, T[]> {
  const map = new DefaultMap<EntityId, T[]>(() => []);
  for (const item of collection) {
    map.get(entityIdPicker(item)).push(item);
  }
  return map;
}

export function findLatestMessage<State, Message extends StateMessage<State>>(stateMessages: Message[]): Message {
  return stateMessages.reduce((acc: Message, current: Message) => (
    acc == null || current.sentAt > acc.sentAt) ? current : acc);
}
