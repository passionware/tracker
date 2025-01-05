import { Client } from "@/api/clients/clients.api.ts";

export interface ClientBilling {
  id: number;
  createdAt: string;
  currency: string | null;
  totalNet: number | null;
  totalGross: number | null;
  clientId: number;
  invoiceNumber: string;
  invoiceDate: string;
  description: string;
  client?: Client;
}
