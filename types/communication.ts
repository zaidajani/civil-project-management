export interface CommunicationMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  discipline: string;
  message: string;
  timestamp: string;
  status: "sent" | "read" | "archived";
  recipients: string[]; // member IDs
}

export interface CommunicationThread {
  id: string;
  subject: string;
  participants: string[];
  messages: CommunicationMessage[];
  createdAt: string;
  updatedAt: string;
  status: "active" | "archived";
}