# Personas

## Overview
ระบบ ACR Management System รองรับผู้ใช้งาน 8 roles — Personas ด้านล่างครอบคลุม 5 core roles ที่มีปฏิสัมพันธ์กับระบบมากที่สุด

---

## สมชาย — Requester

**Role**: พนักงานทั่วไป / หัวหน้าทีมที่ต้องการเปลี่ยนแปลงระบบ IT

**Goals**:
- สร้างคำขอ Change Request ได้ง่ายและรวดเร็ว โดยไม่ต้อง login
- ติดตามสถานะคำขอได้ตลอดเวลา
- ได้รับแจ้งเตือนเมื่อคำขอเปลี่ยนสถานะ

**Pain Points**:
- กรอกแบบฟอร์ม Word/Excel ยุ่งยาก ไม่รู้ว่าต้องกรอกอะไรบ้าง
- ไม่ทราบว่าคำขอไปถึงไหนแล้ว ต้องโทรถาม IT
- หัวหน้าอนุมัติช้าเพราะเอกสารเข้าทาง email ไม่มีระบบเตือน

**User Journey**: เปิด web form → กรอกข้อมูล → ส่ง link ให้หัวหน้าอนุมัติ → Submit to IT → รอแจ้งผล

**Implications**: UI ต้องเรียบง่าย ไม่ต้อง login, ฟอร์มแยกส่วน Requester ชัดเจน, แสดงเฉพาะ field ที่ต้องกรอก, มี tracking page

---

## อรทัย — Approver Request (หัวหน้าฝ่ายของผู้ร้องขอ)

**Role**: หัวหน้าฝ่าย / ผู้อนุมัติเบื้องต้นของผู้ร้องขอ Change

**Goals**:
- อนุมัติ/ไม่อนุมัติคำขอของลูกทีมได้รวดเร็วผ่าน email link
- เข้าใจเนื้อหา CR ที่ต้องอนุมัติโดยไม่ต้อง login เข้าระบบ
- มีหลักฐานว่าตนเองอนุมัติแล้ว

**Pain Points**:
- ได้รับเอกสารขออนุมัติหลายช่องทาง (email, chat, เดินมาถามตรง) ติดตามไม่ได้
- ต้อง login เข้าหลายระบบ ทำให้ล่าช้า
- ไม่มีข้อมูลสรุปชัดเจนว่า CR นี้เกี่ยวกับอะไร ต้องอ่านเอกสารยาว

**User Journey**: รับ email notification → คลิก link → ดูสรุป CR → กด Approve/Reject → จบ (ไม่ต้อง login)

**Implications**: หน้า approval ผ่าน link ต้องแสดงข้อมูลสรุปกระชับ, ปุ่ม approve/reject เด่นชัด, ไม่ต้อง login, ระบบเก็บ log ชื่อ/ตำแหน่ง/เวลาอัตโนมัติจาก email ที่ผูกกับ MS365

---

## วิภา — IT Reviewer

**Role**: เจ้าหน้าที่ IT ที่รับผิดชอบวิเคราะห์ impact/risk และจัดทำแผนดำเนินการ

**Goals**:
- เห็นรายการ CR ที่ assign มาให้ตัวเองชัดเจน
- กรอก Impact Analysis, Risk, Implementation Plan, Rollout/Rollback Plan ได้ครบในที่เดียว
- ส่งต่อ approval ได้ทันทีเมื่อข้อมูลครบ

**Pain Points**:
- ข้อมูลจาก requester ไม่ครบ ต้องถามกลับหลายรอบ
- ไม่มี template สำหรับ Implementation Plan ทำให้แต่ละคนเขียนไม่เหมือนกัน
- ต้อง track manually ว่า CR ไหนรอ approval อยู่

**User Journey**: Login → ดู assigned CRs → กรอก IT Review (Impact, Risk, Plans) → บันทึกผลทดสอบ → ส่งอนุมัติ

**Implications**: Dashboard แสดง workload, ฟอร์ม IT Review มี template/guide, validation บังคับกรอกให้ครบก่อนส่งอนุมัติ, แยกส่วนจาก Requester form ชัดเจน

---

## ประภาส — Approver (IT)

**Role**: หัวหน้าฝ่าย IT / ผู้มีอำนาจอนุมัติ Change ก่อนขึ้น Production

**Goals**:
- เห็น CR ที่รออนุมัติพร้อม impact/risk summary ชัดเจน
- อนุมัติ/ไม่อนุมัติได้รวดเร็ว (ภายใน 1-2 clicks)
- มีข้อมูลประกอบการตัดสินใจครบ (test results, rollback plan)

**Pain Points**:
- ได้รับ email เยอะ ไม่รู้ว่า CR ไหนเร่งด่วน
- ต้องอ่านเอกสาร PDF หลายหน้าเพื่อตัดสินใจ
- ไม่มี history ว่าเคยอนุมัติ CR คล้าย ๆ กันไปแล้วหรือยัง

**User Journey**: รับ notification → Login/เปิด link → Review summary + test results → Approve/Reject พร้อมเหตุผล

**Implications**: Approval view แสดง summary กระชับ, highlight impact level + risk, ปุ่ม approve/reject เด่นชัด, แยก Emergency Change ให้เห็น priority

---

## มนัส — Admin

**Role**: ผู้ดูแลระบบ — กำหนดสิทธิ์ ผู้ใช้งาน Master Data และ Workflow configuration

**Goals**:
- จัดการ users/roles ได้ง่ายและรวดเร็ว
- ตั้งค่า Master Data (Services, Impact Levels, Change Types) ให้ตรงกับองค์กร
- Configure workflow steps, approvers, routing rules
- ดู reports/statistics ภาพรวมของระบบ

**Pain Points**:
- เมื่อมีพนักงานใหม่/ลาออก ต้องปรับ role ทีละคนหลายที่
- ไม่มี dashboard ภาพรวมว่าระบบมี workload เท่าไร
- Workflow เปลี่ยนตามนโยบาย ต้องรอ developer แก้ code

**User Journey**: Login → Admin panel → จัดการ Users/Roles/Master Data / Workflow config → ดู Dashboard/Reports

**Implications**: Admin panel แยกจาก user ทั่วไป, CRUD สำหรับ master data, workflow designer/config UI, role assignment bulk actions, dashboard stats

---

## Design Implications

- **Architecture**: RBAC ที่ยืดหยุ่น รองรับ 8 roles + permission granularity, workflow engine ที่ configurable
- **UI/UX**: แยก view ชัดเจนตาม role — Requester เห็นแค่ form + tracking; IT เห็น review tools; Approver เห็น approval queue; Admin เห็น config panel
- **Data & Privacy**: Requester ไม่ต้อง login แต่ต้องเก็บ log ว่าใครส่ง; Audit log immutable; Data เก็บถาวร
