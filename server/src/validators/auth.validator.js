import { z } from 'zod';

export const signupSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(120),
  role: z.enum(['admin', 'employee']),
  companyCode: z.string().min(4).max(20).optional(),
  departmentCode: z.string().min(4).max(20).optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'employee']),
  companyCode: z.string().min(4).max(20).optional(),
  departmentCode: z.string().min(4).max(20).optional()
});

export const createDepartmentCodeSchema = z.object({
  departmentName: z.string().trim().min(2).max(80)
});

