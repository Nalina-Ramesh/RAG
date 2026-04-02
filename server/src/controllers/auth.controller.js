import bcrypt from 'bcryptjs';

import { User } from '../models/user.model.js';
import { ApiError } from '../utils/api-error.js';
import { signJwt } from '../utils/jwt.js';
import { createDepartmentCodeSchema, loginSchema, signupSchema } from '../validators/auth.validator.js';

const generateCompanyCode = () => Math.random().toString(36).slice(2, 10).toUpperCase();

const isCodeInUse = async (code) => {
  const existingAdmin = await User.exists({
    role: 'admin',
    $or: [{ companyCode: code }, { departmentCodes: { $elemMatch: { code } } }]
  });

  return Boolean(existingAdmin);
};

const generateUniqueCompanyCode = async () => {
  let code = generateCompanyCode();
  let exists = await isCodeInUse(code);
  while (exists) {
    code = generateCompanyCode();
    exists = await isCodeInUse(code);
  }
  return code;
};

const findAdminByAnyCompanyCode = async (companyCode) => User.findOne({
  role: 'admin',
  $or: [{ companyCode }, { departmentCodes: { $elemMatch: { code: companyCode } } }]
});

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  companyCode: user.companyCode,
  companyAdminId: user.companyAdminId,
  departmentCodes: user.departmentCodes || [],
  departmentCode: user.departmentCode || null,
  createdAt: user.createdAt
});

export const signup = async (req, res) => {
  const payload = signupSchema.parse(req.body);
  const existing = await User.findOne({ email: payload.email });
  if (existing) throw new ApiError(409, 'Email already in use');

  const passwordHash = await bcrypt.hash(payload.password, 12);
  let user;

  if (payload.role === 'admin') {
    user = await User.create({
      name: payload.name,
      email: payload.email,
      role: payload.role,
      passwordHash,
      companyCode: await generateUniqueCompanyCode()
    });
  } else {
    const companyCode = payload.companyCode?.trim().toUpperCase();
    const departmentCode = payload.departmentCode?.trim().toUpperCase();

    if (!companyCode) throw new ApiError(400, 'Company code is required for employee signup');
    if (!departmentCode) throw new ApiError(400, 'Department code is required for employee signup');

    const admin = await findAdminByAnyCompanyCode(companyCode);
    if (!admin) throw new ApiError(400, 'Invalid company code');

    const departmentExists = (admin.departmentCodes || []).some((d) => d.code === departmentCode);
    if (!departmentExists) throw new ApiError(400, 'Invalid department code for this company');

    user = await User.create({
      name: payload.name,
      email: payload.email,
      role: payload.role,
      passwordHash,
      companyCode: admin.companyCode,
      companyAdminId: admin._id,
      departmentCode
    });
  }

  const token = signJwt({ sub: user._id.toString(), role: user.role });

  return res.status(201).json({
    token,
    user: sanitizeUser(user)
  });
};

export const login = async (req, res) => {
  const payload = loginSchema.parse(req.body);
  const user = await User.findOne({ email: payload.email });
  if (!user) throw new ApiError(401, 'Invalid credentials');

  if (user.role !== payload.role) throw new ApiError(401, 'Role mismatch for account');

  const valid = await bcrypt.compare(payload.password, user.passwordHash);
  if (!valid) throw new ApiError(401, 'Invalid credentials');

  if (payload.role === 'employee') {
    const companyCode = payload.companyCode?.trim().toUpperCase();
    const departmentCode = payload.departmentCode?.trim().toUpperCase();

    if (!companyCode) throw new ApiError(400, 'Company code is required for employee login');
    if (!departmentCode) throw new ApiError(400, 'Department code is required for employee login');

    const admin = await findAdminByAnyCompanyCode(companyCode);
    if (!admin) throw new ApiError(401, 'Invalid company code for this employee');
    if (!user.companyAdminId || user.companyAdminId.toString() !== admin._id.toString()) {
      throw new ApiError(401, 'Invalid company code for this employee');
    }

    const hasDepartment = (admin.departmentCodes || []).some((d) => d.code === departmentCode);
    if (!hasDepartment) {
      throw new ApiError(401, 'Invalid department code for this employee');
    }

    user.departmentCode = departmentCode;
    await user.save();
  } else if (payload.role === 'admin' && !user.companyCode) {
    user.companyCode = await generateUniqueCompanyCode();
    await user.save();
  }

  const token = signJwt({ sub: user._id.toString(), role: user.role });

  return res.json({
    token,
    user: sanitizeUser(user)
  });
};

export const me = async (req, res) => {
  res.json({ user: req.user });
};

export const createDepartmentCode = async (req, res) => {
  if (req.user.role !== 'admin') throw new ApiError(403, 'Forbidden');

  const payload = createDepartmentCodeSchema.parse(req.body);
  const departmentName = payload.departmentName.trim();
  const normalizedDepartmentName = departmentName.toLowerCase();

  const admin = await User.findById(req.user._id);
  if (!admin) throw new ApiError(404, 'Admin not found');

  const existingDepartment = (admin.departmentCodes || []).find(
    (department) => department.name.trim().toLowerCase() === normalizedDepartmentName
  );
  if (existingDepartment) {
    throw new ApiError(409, 'Department code already exists for this department');
  }

  const newCode = await generateUniqueCompanyCode();
  admin.departmentCodes = [...(admin.departmentCodes || []), { name: departmentName, code: newCode }];
  await admin.save();

  const updatedAdmin = await User.findById(req.user._id).select('-passwordHash');
  res.status(201).json({
    message: 'Department code generated',
    department: { name: departmentName, code: newCode },
    user: updatedAdmin
  });
};

export const rotateCompanyCode = async (req, res) => {
  if (req.user.role !== 'admin') throw new ApiError(403, 'Forbidden');
  throw new ApiError(400, 'Base company code can be generated only once per admin and cannot be rotated');
};

