// participant roles shown in a developer or under-the-hood conversation
export type IConversationRole = 'agent' | 'developer' | 'skill';

// one plain-text or inline-code segment in a conversation message
export type IConversationMessageSegment =
  { kind: 'code'; text: string } | { kind: 'text'; text: string };

// one static conversation turn
export interface IConversationTurn {
  message: string | IConversationMessageSegment[];
  role: IConversationRole;
}
