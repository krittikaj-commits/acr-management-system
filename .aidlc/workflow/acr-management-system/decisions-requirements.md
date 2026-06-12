# Requirements Decisions

## Context Summary
- **Type**: Greenfield
- **Stack**: TypeScript / React + Tailwind + MUI / Node.js / Microsoft SQL Server Express
- **Architecture**: Web SPA + backend API on AWS (ECS, S3/CloudFront, RDS)
- **Feature**: ACR Management System — end-to-end change request management supporting Normal and Emergency Change
- **Complexity**: High — ~28 functional requirements, 8 user types, 4 integrations
- **Source of Truth**: initial-requirements/Usecase-APP-02-ACR Management System.md

---

## Decision Questions

### D1-1: Feature Scope
**Question**: ขอบเขตของระบบ ACR Management System ที่จะพัฒนาในรอบนี้ ครอบคลุมอะไรบ้าง?
- 1) Full product — ทุก FR/NFR ตาม source-of-truth document (FR-001 ถึง FR-028, NFR-001 ถึง NFR-014) **(Recommended)**
- 2) MVP — เฉพาะ core workflow: สร้าง CR, IT Review, Approval, Implementation, Verification, Close (ตัด Report, Export, Admin บางส่วน)
- 3) Phase 1 — เฉพาะ Normal Change flow + basic admin; Emergency Change และ advanced features รอ Phase 2
- 4) Other (please specify): _______

**Answer**: 1

---

### D1-2: User Types
**Question**: user types ทั้ง 8 ที่ระบุในเอกสาร (Requester, Approver Request, Call Center, IT Reviewer, Approver, Implementer, Auditor, Admin) จะรองรับทั้งหมดตั้งแต่ต้นหรือไม่?
- 1) ทั้ง 8 roles ตั้งแต่ต้น **(Recommended)**
- 2) เริ่มจาก core roles ก่อน (Requester, IT Reviewer, Approver, Implementer, Admin) แล้วเพิ่ม Call Center, Auditor, Approver Request ทีหลัง
- 3) เริ่มจาก simplified model — Requester + IT + Approver + Admin เท่านั้น
- 4) Other (please specify): _______

**Answer**: 1

---

### D1-3: Authentication Mode
**Question**: ระบบมี 2 mode การเข้าใช้งาน (ไม่ login / login ด้วย email บริษัท) จะจัดการอย่างไร?
- 1) ตามเอกสาร — Requester สร้าง CR ไม่ต้อง login; Approver Request อนุมัติผ่าน email link ไม่ต้อง login; ส่วน IT/Admin ต้อง login **(Recommended)**
- 2) ทุกคนต้อง login (ง่ายกว่าในเรื่อง security) แต่ใช้ magic link สำหรับ Approver Request
- 3) Anonymous สำหรับ requester + token-based link สำหรับ approval + full login สำหรับ IT/Admin
- 4) Other (please specify): _______

**Answer**: 1

---

### D1-4: Change Types
**Question**: ประเภทของ Change Request ที่จะรองรับ?
- 1) ตามเอกสาร — Normal Change + Emergency Change (Emergency ทำก่อนได้ ขออนุมัติย้อนหลัง) **(Recommended)**
- 2) Normal Change เท่านั้น (Emergency เป็น phase 2)
- 3) Normal + Emergency + Scheduled/Standard Change (ITIL model)
- 4) Other (please specify): _______

**Answer**: 1

---

### D1-5: Workflow Complexity
**Question**: workflow ของ Change Request จะ configurable หรือ fixed?
- 1) Fixed workflow ตามเอกสาร: Draft → Submitted → IT Review → Approval → Implementation → Verification → Closed **(Recommended)**
- 2) Semi-configurable — fixed flow แต่ Approver/IT assignment ปรับได้จาก admin
- 3) Fully configurable workflow engine — admin สร้าง/แก้ไข step ได้เอง (ตรงกับ NFR-012 แต่ซับซ้อน)
- 4) Other (please specify): _______

**Answer**: 3

---

### D1-6: Integration Priority
**Question**: ระบบเชื่อมต่อภายนอก 4 จุด (Email MS365, Active Directory, Ticketing System, File Storage) จะ implement ทั้งหมดพร้อมกันหรือแบ่ง phase?
- 1) Email MS365 + File Storage ก่อน (core ที่ต้องมี); Active Directory เป็น Phase 2; Ticketing ตาม roadmap **(Recommended)**
- 2) ทั้ง 4 จุดพร้อมกัน
- 3) Email MS365 อย่างเดียวก่อน ที่เหลือเป็น mock/stub
- 4) Other (please specify): _______

**Answer**: 1

---

### D1-7: Audit & Compliance
**Question**: ระดับ audit log ที่ต้องการ?
- 1) Full immutable audit — ทุก action (create, update, status change, view sensitive data) บันทึก user, timestamp, old/new value ลบ/แก้ไม่ได้ **(Recommended)**
- 2) Action-level audit — บันทึก status changes และ key actions เท่านั้น
- 3) Basic logging — เฉพาะ errors และ critical events
- 4) Other (please specify): _______

**Answer**: 1

---

### D1-8: Personas
**Question**: ต้องการสร้าง Personas (โปรไฟล์ผู้ใช้โดยละเอียด) สำหรับ user types ทั้งหมดหรือไม่?
- 1) Yes — สร้าง personas สำหรับทุก user type (8 roles) เพื่อให้ requirements ชัดเจนขึ้น **(Recommended)**
- 2) Yes — เฉพาะ core roles (Requester, IT Reviewer, Approver, Admin)
- 3) No — user types ใน source document ชัดเจนพอแล้ว ไม่ต้องมี personas
- 4) Other (please specify): _______

**Answer**: 2

---

### D1-9: Notification Channels
**Question**: ช่องทางแจ้งเตือนที่ต้องรองรับ?
- 1) Email เท่านั้น (ส่ง link + status update ผ่าน MS365) **(Recommended)**
- 2) Email + In-app notifications
- 3) Email + In-app + LINE/Teams webhook
- 4) Other (please specify): _______

**Answer**: 2

---

### D1-10: Reporting & Export
**Question**: ขอบเขตของ reporting/export?
- 1) Basic — Export list เป็น Excel/PDF + Search/filter ตาม ID, Status, Service, Date, Requester **(Recommended)**
- 2) Dashboard — เพิ่ม chart/statistics (จำนวน CR ต่อเดือน, average time to close, ฯลฯ)
- 3) Advanced BI — Dashboard + scheduled reports + drill-down analytics
- 4) Other (please specify): _______

**Answer**: 1,2

---

### D1-11: Mobile Support
**Question**: เอกสารระบุว่ารองรับ Mobile App (iOS/Android) — ต้อง mobile app จริงหรือ responsive web เพียงพอ?
- 1) Responsive web only — ใช้งานผ่าน mobile browser ได้ ไม่ต้องมี native app **(Recommended)**
- 2) Responsive web + PWA (Progressive Web App) — installable, push notification
- 3) Native mobile app (React Native) แยกจาก web
- 4) Other (please specify): _______

**Answer**: 1

---

### D1-12: Data Retention & Archival
**Question**: นโยบายเก็บข้อมูล Change Request?
- 1) เก็บถาวรทั้งหมด (ไม่ลบ) — เพื่อ audit ย้อนหลัง **(Recommended)**
- 2) Active + Archived — หลัง close ย้ายเป็น archived หลัง 1 ปี
- 3) Soft delete + configurable retention period
- 4) Other (please specify): _______

**Answer**: 1 (เก็บถาวรทั้งหมด — แก้ไขตาม validation conflict 2)

---

## Decisions Summary
<!-- Machine-readable compact summary. Downstream phases: read ONLY this section. -->
- D1-1 Scope: Full product — all FR-001 to FR-028, NFR-001 to NFR-014
- D1-2 User Types: All 8 roles (Requester, Approver Request, Call Center, IT Reviewer, Approver, Implementer, Auditor, Admin)
- D1-3 Auth Mode: Anonymous for Requester/Approver Request (email link); Login required for IT/Admin roles
- D1-4 Change Types: Normal Change + Emergency Change (post-approval)
- D1-5 Workflow: Fully configurable workflow engine — admin can create/modify steps
- D1-6 Integration Priority: Email MS365 + File Storage first; Active Directory Phase 2; Ticketing per roadmap
- D1-7 Audit Level: Full immutable audit — all actions, user, timestamp, old/new value, cannot delete/edit
- D1-8 Personas: Yes — core roles only (Requester, IT Reviewer, Approver, Admin)
- D1-9 Notification Channels: Email + In-app notifications
- D1-10 Reporting: Basic export (Excel/PDF) + Dashboard (charts/statistics)
- D1-11 Mobile: Responsive web only
- D1-12 Data Retention: เก็บถาวรทั้งหมด (ทั้ง CR data และ audit log ไม่ลบ)
- D1-V1 Workflow Scope: Keep — full scope + fully configurable workflow engine (workflow engine เป็น unit แยก)
- D1-V2 Audit vs Retention: เก็บถาวรทั้งหมด — ทั้ง CR data และ audit log ไม่มี purge

---

**Instructions**: Fill in your answers above and respond with "done"
