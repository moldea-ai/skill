// participant roles shown in a developer or under-the-hood conversation
export type IConversationRole = 'agent' | 'developer' | 'skill';

// one static conversation turn
export interface IConversationTurn {
  message: string;
  role: IConversationRole;
}
