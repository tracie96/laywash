export interface PaymentRequest {
  id: string;
  washer_id: string;
  admin_id?: string;
  approval_date?: string;
  total_earnings: number;
  material_deductions: number;
  tool_deductions: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  amount: number; // The actual amount requested for withdrawal by the washer
  is_advance?: boolean; // Whether this is an advance payment request
}

export interface WasherInfo {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface PaymentRequestWithWasher extends PaymentRequest {
  washer: WasherInfo;
}

export interface CreatePaymentRequestData {
  washer_id: string;
  amount: number;
  material_deductions: number;
  tool_deductions: number;
  notes?: string;
}

export interface UpdatePaymentRequestData {
  status: 'approved' | 'rejected' | 'paid';
  admin_notes?: string;
  admin_id: string;
}
