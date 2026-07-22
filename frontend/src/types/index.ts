export interface Ticket {
  id: number;
  title: string;
  description: string | null;
  status: 'Open' | 'In Progress' | 'Closed';
  priority: 'Low' | 'Medium' | 'High';
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: number;
  content: string;
  ticketId: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}
