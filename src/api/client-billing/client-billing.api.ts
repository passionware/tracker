import { Client } from "@/api/clients/clients.api.ts";

export interface ClientBilling {
  id: number;
  createdAt: Date;
  currency: string | null;
  totalNet: number | null;
  totalGross: number | null;
  clientId: number;
  invoiceNumber: string;
  invoiceDate: Date;
  description: string;
  client?: Client;
}
