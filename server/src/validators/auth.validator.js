import { z } from 'zod';

export const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8).max(120),
  role: z.enum(['admin', 'employee']),
  companyCode: z.string().trim().min(4).max(20).optional(),
  departmentCode: z.string().trim().min(4).max(20).optional()
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'employee']),
  companyCode: z.string().trim().min(4).max(20).optional(),
  departmentCode: z.string().trim().min(4).max(20).optional()
});

export const createDepartmentCodeSchema = z.object({
  departmentName: z.string().trim().min(2).max(80)
});

