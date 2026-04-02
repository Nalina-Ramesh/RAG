import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import { User } from './src/models/user.model.js';
import { Document } from './src/models/document.model.js';
import { Chunk } from './src/models/chunk.model.js';
import { retrieveRelevantChunks } from './src/services/rag.service.js';

(async () => {
  await connectDB();

  const admin = await User.findOne({ role: 'admin' }).lean();
  console.log('admin', admin ? admin.email : 'none');

  const emp = await User.findOne({ role: 'employee' }).lean();
  console.log('employee', emp ? emp.email : 'none', 'dept', emp ? emp.departmentCode : 'none');

  const docs = await Document.find({ companyCode: admin.companyCode }).lean();
  console.log('docs', docs.map(d=>({title:d.title, dept:d.departmentCode}))); 

  const ctxs = await retrieveRelevantChunks('projects', 5, emp.companyCode, emp.departmentCode);
  console.log('retrieveRelevantChunks count', ctxs.length);
  for (let i=0; i<Math.min(5,ctxs.length); i++) {
    console.log('ctx',i,ctxs[i].citation, ctxs[i].content.slice(0,150));
  }

  await mongoose.disconnect();
})();
