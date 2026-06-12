# Requirements

## Summary
<!-- 10-line max. Downstream phases read ONLY this section. -->
- **Total Stories**: 35 across 10 functional areas
- **Priority**: 14 High, 14 Medium, 7 Low
- **User Types**: Requester, Approver Request, Call Center, IT Reviewer, Approver, Implementer, Auditor, Admin
- **Key Entities**: ChangeRequest, WorkflowStep, User/Role, AuditLog, Attachment, MasterData
- **Integrations**: Email MS365 (core), File Storage (core), Active Directory (Phase 2), Ticketing (roadmap)
- **Core Flows**: 
  - Requester creates CR → Approver Request approves via email → Submit to IT
  - Call Center assigns → IT reviews (impact, risk, plan, test) → Approver approves
  - Implementer deploys → Verification → Close
  - Emergency Change: implement first → post-approval
  - Admin configures workflow steps, approvers, master data

## Overview
User stories organized by functional area with EARS notation acceptance criteria. ครอบคลุม full product scope ตาม source-of-truth document (FR-001 ถึง FR-028, NFR-001 ถึง NFR-014) รวมถึง fully configurable workflow engine.

---

## Functional Area 1: Change Request Authoring

### US-001: Create Change Request
**As a** Requester
**I want** สร้างคำขอ Change Request ผ่านเว็บฟอร์มโดยไม่ต้อง login
**So that** สามารถแจ้งความต้องการเปลี่ยนแปลงระบบ IT ได้สะดวกและรวดเร็ว

**Priority**: High

**Acceptance Criteria**:
1. **WHEN** Requester เปิดหน้าสร้าง CR, **THEN** ระบบแสดงฟอร์มที่แยกส่วน Requester ชัดเจน โดยไม่ต้อง login
2. **WHEN** Requester กรอกข้อมูลและบันทึก, **THEN** ระบบสร้าง CR ในสถานะ Draft พร้อม CR ID อัตโนมัติ (format: CR-YYYY-NNNN)
3. **WHEN** Requester บันทึก CR สำเร็จ, **THEN** ระบบบันทึก audit log (ชื่อผู้สร้าง, timestamp, action: created)

**Dependencies**: None
**Source**: FR-001, Assumptions Detail #1

---

### US-002: Edit Draft Request
**As a** Requester
**I want** แก้ไขคำขอ CR ที่อยู่ในสถานะ Draft หรือ Returned
**So that** สามารถแก้ไขข้อมูลให้ถูกต้องก่อนส่งอนุมัติ

**Priority**: High

**Acceptance Criteria**:
1. **WHILE** CR อยู่ในสถานะ Draft หรือ Returned, **WHEN** Requester เปิด CR, **THEN** ระบบอนุญาตให้แก้ไขข้อมูลได้
2. **IF** CR อยู่ในสถานะอื่นที่ไม่ใช่ Draft หรือ Returned, **THEN** ระบบแสดงข้อมูลแบบ read-only
3. **WHEN** Requester แก้ไขและบันทึก, **THEN** ระบบบันทึก audit log ที่แสดง old value และ new value ของทุก field ที่เปลี่ยน

**Dependencies**: US-001
**Source**: FR-002

---

### US-003: Select Change Type and Impact
**As a** Requester
**I want** เลือก Change Type (Normal/Emergency) และ Impact Level
**So that** ระบบสามารถกำหนด workflow และ approval requirement ที่เหมาะสมได้

**Priority**: High

**Acceptance Criteria**:
1. **WHEN** Requester สร้างหรือแก้ไข CR, **THEN** ระบบแสดงตัวเลือก Change Type: Normal Change, Emergency Change (required field)
2. **WHEN** Requester สร้างหรือแก้ไข CR, **THEN** ระบบแสดงตัวเลือก Impact Level: Major, High, Medium, Low, Very Low (required field)
3. **WHEN** Requester เลือก Change Type = Emergency, **THEN** ระบบแสดง field ให้ระบุเหตุผลความเร่งด่วน (required)

**Dependencies**: US-001
**Source**: FR-004, FR-005, BR-003

---

### US-004: Input Affected Service
**As a** Requester
**I want** ระบุ Service/กลุ่มงานที่ได้รับผลกระทบจาก Change
**So that** IT สามารถวิเคราะห์ขอบเขตผลกระทบได้ถูกต้อง

**Priority**: High

**Acceptance Criteria**:
1. **WHEN** Requester กรอก CR, **THEN** ระบบแสดง dropdown/autocomplete ของ Service จาก Master Data (required field)
2. **WHEN** Requester เลือก Service, **THEN** ระบบแสดง description ของ Service ที่เลือก
3. **IF** Requester ไม่เลือก Service, **THEN** ระบบแสดงข้อความเตือนว่า field นี้ required

**Dependencies**: US-001, US-028 (Master Data)
**Source**: FR-006

---

### US-005: Submit Change Request with Pre-Approval
**As a** Requester
**I want** ส่งคำขอให้หัวหน้างานอนุมัติก่อน แล้ว Submit ไปยัง IT
**So that** คำขอผ่านการอนุมัติเบื้องต้นก่อนเข้าสู่กระบวนการ IT

**Priority**: High

**Acceptance Criteria**:
1. **WHEN** Requester กรอกข้อมูลครบและกด "ส่งขออนุมัติหัวหน้า", **THEN** ระบบส่ง email พร้อม link ให้ Approver Request (หัวหน้าของผู้ร้องขอ)
2. **WHEN** Approver Request คลิก link ใน email, **THEN** ระบบแสดงหน้า approval โดยไม่ต้อง login พร้อมแสดงข้อมูล CR ที่ต้อง review
3. **WHEN** Approver Request กด "อนุมัติ", **THEN** ระบบบันทึก log ชื่อ ตำแหน่ง และเวลาที่อนุมัติ (ดูจาก Role ที่ผูกกับ Email MS365)
4. **WHEN** Approver Request อนุมัติเรียบร้อย, **THEN** Requester สามารถกด Submit → Sent to IT → ระบบส่ง email เข้า email กลาง IT (Service@dits.co.th)
5. **IF** กรอกข้อมูลไม่ครบ required fields, **THEN** ระบบไม่อนุญาตให้ Submit และแสดงข้อความแจ้งเตือน

**Dependencies**: US-001, US-003, US-004
**Source**: FR-003, Assumptions Detail #2-4, EX-001

---

## Functional Area 2: Call Center Triage

### US-006: Assign CR to IT Reviewer
**As a** Call Center
**I want** ตรวจสอบ CR ที่ submit เข้ามาและ assign ให้ IT ผู้รับผิดชอบ
**So that** CR ถูกส่งต่อให้คนที่เหมาะสมดำเนินการต่อ

**Priority**: High

**Acceptance Criteria**:
1. **WHEN** Call Center login เข้าระบบ, **THEN** แสดง list ของ CR ที่อยู่ในสถานะ Submitted (ยังไม่ assign)
2. **WHEN** Call Center เลือก CR และกด assign, **THEN** ระบบแสดงรายชื่อ IT Reviewer ที่สามารถ assign ได้ (ตาม role/service)
3. **WHEN** Call Center กด confirm assignment, **THEN** ระบบเปลี่ยนสถานะ CR เป็น "IT Review" และส่ง notification ให้ IT Reviewer ที่ถูก assign
4. **WHEN** assignment สำเร็จ, **THEN** ระบบบันทึก audit log (who assigned, to whom, timestamp)

**Dependencies**: US-005
**Source**: Assumptions Detail #5

---

## Functional Area 3: IT Review & Planning

### US-007: Impact Analysis
**As a** IT Reviewer
**I want** วิเคราะห์และบันทึกผลกระทบของ Change
**So that** ผู้อนุมัติมีข้อมูลประกอบการตัดสินใจ

**Priority**: High

**Acceptance Criteria**:
1. **WHEN** IT Reviewer เปิด CR ที่ assign ให้ตัวเอง, **THEN** ระบบแสดงข้อมูล Requester section (read-only) + IT Review section (editable)
2. **WHEN** IT Reviewer กรอก Impact Analysis, **THEN** ระบบบังคับ required fields: ระบุระบบที่ได้รับผลกระทบ, ขอบเขตผลกระทบ, ระยะเวลาที่คาดว่าจะกระทบ
3. **WHEN** IT Reviewer บันทึก, **THEN** ระบบบันทึก audit log (field changes, timestamp)

**Dependencies**: US-006
**Source**: FR-007

---

### US-008: Risk Assessment
**As a** IT Reviewer
**I want** ประเมินความเสี่ยงของ Change
**So that** องค์กรเข้าใจ risk ที่อาจเกิดขึ้นก่อนอนุมัติ

**Priority**: High

**Acceptance Criteria**:
1. **WHEN** IT Reviewer กรอก Risk Assessment, **THEN** ระบบบังคับระบุ: ระดับความเสี่ยง, สาเหตุของความเสี่ยง, แนวทางลดความเสี่ยง
2. **IF** Impact Level = High หรือ Major, **THEN** ระบบบังคับ Risk Assessment ต้องละเอียดมากขึ้น (มี field เพิ่มเติม)

**Dependencies**: US-007
**Source**: FR-008, BR-004

---

### US-009: Implementation Plan, Rollout Plan, Rollback Plan
**As a** IT Reviewer
**I want** จัดทำ Implementation Plan, Rollout Plan และ Rollback Plan
**So that** มีแผนดำเนินการ/ย้อนกลับที่ชัดเจนก่อนขึ้น Production

**Priority**: High

**Acceptance Criteria**:
1. **WHEN** IT Reviewer กรอกแผน, **THEN** ระบบบังคับ Implementation Plan (required), Rollout Plan (required สำหรับ Production change)
2. **IF** Impact Level = High หรือ Major, **THEN** Rollback Plan เป็น required field
3. **IF** Impact Level = Medium หรือต่ำกว่า, **THEN** Rollback Plan เป็น optional แต่ระบบแสดง recommendation ให้กรอก
4. **WHEN** IT Reviewer บันทึกแผน, **THEN** ระบบบันทึก version history ของแผน (old/new value)

**Dependencies**: US-007, US-008
**Source**: FR-009, FR-010, FR-011, BR-005

---

## Functional Area 4: Testing

### US-010: Record Test Result
**As a** IT Reviewer
**I want** บันทึกผลการทดสอบระบบ (ผ่าน/ไม่ผ่าน)
**So that** มีหลักฐานว่าทดสอบแล้วก่อนส่งอนุมัติ

**Priority**: High

**Acceptance Criteria**:
1. **WHEN** IT Reviewer บันทึกผลทดสอบ, **THEN** ระบบบังคับเลือก: ผ่าน (Pass) หรือ ไม่ผ่าน (Failed) พร้อม description
2. **IF** ผลทดสอบ = Failed, **THEN** ระบบบังคับเลือก Action: Restore, Contact Vendor, Retest, Other (required)
3. **IF** ผลทดสอบ = Failed และไม่มี special approval, **THEN** ระบบไม่อนุญาตให้ส่งขออนุมัติขึ้น Production
4. **WHEN** บันทึกผลทดสอบสำเร็จ, **THEN** ระบบบันทึก audit log

**Dependencies**: US-009
**Source**: FR-012, FR-013, BR-006, BR-007

---

## Functional Area 5: Approval Workflow

### US-011: Submit for Approval
**As a** IT Reviewer
**I want** ส่ง CR ที่ review ครบให้ Approver พิจารณา
**So that** Change ได้รับการอนุมัติก่อนดำเนินการ

**Priority**: High

**Acceptance Criteria**:
1. **WHEN** IT Reviewer กด "Submit for Approval", **THEN** ระบบตรวจสอบว่า required fields ครบ (Impact Analysis, Risk, Plans, Test Result = Pass)
2. **IF** ข้อมูลไม่ครบ, **THEN** ระบบแสดง validation error ระบุ field ที่ต้องกรอก
3. **WHEN** Submit สำเร็จ, **THEN** ระบบเปลี่ยนสถานะ CR เป็น "Pending Approval" และส่ง notification ให้ Approver ตาม workflow config
4. **IF** Change Type = Emergency, **THEN** ระบบ flag ว่า "Emergency — post-approval required" แต่ยังอนุญาตให้ดำเนินการก่อนได้

**Dependencies**: US-010
**Source**: FR-014, BR-002, BR-003

---

### US-012: Approve Change
**As a** Approver
**I want** อนุมัติ Change Request ที่ผ่านการ review แล้ว
**So that** Implementation สามารถดำเนินการได้

**Priority**: High

**Acceptance Criteria**:
1. **WHEN** Approver เปิดหน้า approval, **THEN** ระบบแสดง summary: Impact Level, Risk, Plans, Test Results, attachments
2. **WHEN** Approver กด "Approve", **THEN** ระบบเปลี่ยนสถานะ CR เป็น "Approved" และส่ง notification ให้ IT Reviewer/Implementer
3. **IF** Approver เป็นคนเดียวกับ Implementer ที่ถูก assign, **THEN** ระบบแจ้งเตือน warning (BR-010) — ไม่ block แต่ log ไว้
4. **WHEN** Approve สำเร็จ, **THEN** ระบบบันทึก audit log (approver name, timestamp, action)

**Dependencies**: US-011
**Source**: FR-015, BR-010

---

### US-013: Reject Change
**As a** Approver
**I want** ปฏิเสธ CR พร้อมระบุเหตุผล
**So that** ผู้เกี่ยวข้องรู้ว่าต้องแก้ไขอะไร

**Priority**: High

**Acceptance Criteria**:
1. **WHEN** Approver กด "Reject", **THEN** ระบบบังคับระบุเหตุผล (required textarea)
2. **WHEN** Reject สำเร็จ, **THEN** ระบบเปลี่ยนสถานะ CR เป็น "Returned" และส่ง notification กลับ IT Reviewer
3. **WHEN** Reject สำเร็จ, **THEN** ระบบบันทึก audit log (reject reason, approver, timestamp)

**Dependencies**: US-011
**Source**: FR-016, EX-002

---

## Functional Area 6: Implementation & Verification

### US-014: Assign Implementer
**As a** IT Reviewer / Approver
**I want** ระบุผู้ดำเนินการขึ้น Production
**So that** มีผู้รับผิดชอบชัดเจนในการ deploy

**Priority**: Medium

**Acceptance Criteria**:
1. **WHEN** CR ได้รับ approval, **THEN** ระบบอนุญาตให้ assign Implementer จากรายชื่อ users ที่มี role Implementer
2. **IF** Implementer ที่ assign คือ Approver คนเดียวกัน, **THEN** ระบบแสดง warning (BR-010)
3. **WHEN** assign สำเร็จ, **THEN** ส่ง notification ให้ Implementer และบันทึก audit log

**Dependencies**: US-012
**Source**: FR-017, BR-010

---

### US-015: Record Production Deployment
**As a** Implementer
**I want** บันทึกผลการ deploy บน Production
**So that** มีหลักฐานการดำเนินการครบถ้วน

**Priority**: High

**Acceptance Criteria**:
1. **WHEN** Implementer บันทึก deployment, **THEN** ระบบบังคับ required fields: Version ก่อนเปลี่ยน, Version หลังเปลี่ยน, วันเวลาที่ deploy, ผลลัพธ์ (Success/Failed)
2. **IF** มี downtime, **THEN** ระบบบังคับระบุ: เวลาเริ่มหยุดบริการ, เวลาสิ้นสุดหยุดบริการ, ระยะเวลารวม
3. **IF** ผลลัพธ์ = Failed, **THEN** ระบบบังคับระบุสาเหตุและแสดง option: Rollback, Retry, Escalate
4. **WHEN** บันทึกสำเร็จ, **THEN** ระบบบันทึก audit log

**Dependencies**: US-014
**Source**: FR-018, FR-019, FR-020, BR-008, BR-009, EX-005

---

### US-016: Post Implementation Review
**As a** IT Reviewer / Implementer
**I want** ตรวจสอบผลหลังดำเนินการและ mark สถานะสำเร็จ/ไม่สำเร็จ
**So that** มีการ verify ว่า Change ทำงานถูกต้อง

**Priority**: Medium

**Acceptance Criteria**:
1. **WHEN** Implementer/IT Reviewer เปิด Verification form, **THEN** ระบบแสดงข้อมูล deployment + checklist การตรวจสอบ
2. **WHEN** กด "Mark Success", **THEN** ระบบเปลี่ยนสถานะ CR เป็น "Verified — Success" → พร้อม Close
3. **WHEN** กด "Mark Failed", **THEN** ระบบบังคับระบุสาเหตุและแสดง option: Rollback, Escalate, Retry
4. **WHEN** Verification สำเร็จ/ไม่สำเร็จ, **THEN** ระบบบันทึก audit log

**Dependencies**: US-015
**Source**: FR-021, FR-022, BR-013

---

### US-017: Close Change Request
**As a** IT Reviewer
**I want** ปิด CR เมื่อ Verification สำเร็จ
**So that** CR workflow เสร็จสมบูรณ์

**Priority**: Medium

**Acceptance Criteria**:
1. **IF** Verification = Success, **THEN** ระบบอนุญาตให้ปิด CR → สถานะ "Closed"
2. **IF** Verification = Failed แต่มีเหตุผลครบถ้วน, **THEN** ระบบอนุญาตให้ปิดพร้อม reason
3. **WHEN** Close สำเร็จ, **THEN** ระบบบันทึก audit log และส่ง notification summary ให้ทุกฝ่ายที่เกี่ยวข้อง

**Dependencies**: US-016
**Source**: BR-013

---

## Functional Area 7: Emergency Change

### US-018: Emergency Change — Implement First, Approve Later
**As a** IT Reviewer / Implementer
**I want** ดำเนินการ Emergency Change ก่อนได้ แล้วขออนุมัติย้อนหลัง
**So that** ปัญหาเร่งด่วนได้รับการแก้ไขทันที

**Priority**: Medium

**Acceptance Criteria**:
1. **WHEN** CR มี Change Type = Emergency, **THEN** ระบบอนุญาตให้ข้าม step Approval ไปดำเนินการ Implementation ได้เลย
2. **WHILE** Emergency CR อยู่ในสถานะ Implementation/Verification, **THEN** ระบบแสดง banner "Post-Approval Required" เตือนตลอด
3. **WHEN** Emergency CR เสร็จ Implementation, **THEN** ระบบบังคับให้ส่งขออนุมัติย้อนหลัง (post-approval) ก่อน Close
4. **IF** Post-approval ถูก reject, **THEN** ระบบบันทึก incident record แต่ไม่ rollback อัตโนมัติ (ให้ IT ตัดสินใจ)

**Dependencies**: US-003, US-011
**Source**: BR-003, EX-003

---

## Functional Area 8: Attachments & Evidence

### US-019: Upload Evidence/Attachments
**As a** Requester / IT Reviewer / Implementer
**I want** แนบหลักฐาน (Screenshot, Log, Approval File) ในขั้นตอนต่าง ๆ
**So that** มีหลักฐานประกอบครบถ้วนสำหรับ audit

**Priority**: Medium

**Acceptance Criteria**:
1. **WHEN** user upload ไฟล์, **THEN** ระบบรองรับ: PDF, JPG, PNG, DOCX, XLSX, TXT, LOG
2. **IF** ขนาดไฟล์เกิน 10 MB (configurable), **THEN** ระบบแสดง error และไม่อนุญาตให้ upload
3. **IF** upload ล้มเหลว, **THEN** ระบบแสดง error message ชัดเจนพร้อม retry option
4. **WHEN** upload สำเร็จ, **THEN** ระบบบันทึก audit log (who uploaded, filename, timestamp, size)
5. **WHILE** CR อยู่ในขั้นตอน Implementation หรือ Verification, **THEN** ระบบแสดง recommendation ให้แนบหลักฐาน (BR-012)

**Dependencies**: US-001
**Source**: FR-023, NFR-010, NFR-011, BR-012, EX-007

---

## Functional Area 9: Notifications

### US-020: Email Notifications
**As a** ทุก user ที่เกี่ยวข้อง
**I want** ได้รับ email แจ้งเตือนเมื่อ CR เปลี่ยนสถานะ
**So that** ทราบว่าต้องดำเนินการอะไรต่อ

**Priority**: Medium

**Acceptance Criteria**:
1. **WHEN** CR เปลี่ยนสถานะ, **THEN** ระบบส่ง email ไปยังผู้ที่เกี่ยวข้องตาม workflow config (Requester, Approver, IT Reviewer, Implementer)
2. **WHEN** ส่ง email, **THEN** email ต้องมี link กลับไปยัง CR ในระบบ + summary ของสถานะ
3. The system shall ส่ง email ผ่าน MS365 integration

**Dependencies**: US-005, US-006, US-011, US-012, US-013
**Source**: FR-024

---

### US-021: In-App Notifications
**As a** IT Reviewer / Approver / Admin
**I want** เห็น notification ภายในระบบเมื่อมี CR ที่ต้องดำเนินการ
**So that** ไม่พลาดงานที่รอดำเนินการ

**Priority**: Medium

**Acceptance Criteria**:
1. **WHEN** user login เข้าระบบ, **THEN** แสดง notification badge จำนวน items ที่ต้อง action
2. **WHEN** user คลิก notification, **THEN** ระบบ navigate ไปยัง CR ที่เกี่ยวข้อง
3. **WHEN** มี CR ใหม่ assign/pending approval, **THEN** ระบบแสดง real-time notification (ไม่ต้อง refresh)

**Dependencies**: US-006, US-011
**Source**: D1-9 (Email + In-app)

---

## Functional Area 10: Audit, Search & Reporting

### US-022: View Change History
**As a** Auditor / IT Reviewer / Admin
**I want** ดูประวัติการแก้ไขและเปลี่ยนสถานะของ CR
**So that** ตรวจสอบย้อนหลังได้ว่าใครทำอะไรเมื่อไร

**Priority**: Medium

**Acceptance Criteria**:
1. **WHEN** user เปิด history ของ CR, **THEN** ระบบแสดง timeline: ทุก action (create, update, status change, upload) พร้อม user, timestamp, old/new value
2. The system shall เก็บ audit log แบบ immutable — ลบหรือแก้ไขไม่ได้
3. **IF** user ไม่มีสิทธิ์ดู history, **THEN** ระบบ return 403 Forbidden

**Dependencies**: US-001
**Source**: FR-025, NFR-004, BR-011

---

### US-023: Search Change Request
**As a** ทุก role ที่มีสิทธิ์
**I want** ค้นหา CR ตามเงื่อนไขต่าง ๆ
**So that** หา CR ที่ต้องการได้อย่างรวดเร็ว

**Priority**: Medium

**Acceptance Criteria**:
1. **WHEN** user กรอก search criteria, **THEN** ระบบรองรับค้นหาตาม: CR ID, Status, Service, Date range, Requester name, Change Type, Impact Level
2. **WHEN** แสดงผล search, **THEN** ระบบแสดง list พร้อม pagination และ sorting
3. **IF** user เป็น Requester (ไม่ login), **THEN** ระบบแสดงเฉพาะ CR ที่ตนเองสร้าง (track by email/token)

**Dependencies**: US-001
**Source**: FR-026

---

### US-024: Export Change Report
**As a** Auditor / Admin
**I want** Export รายงาน CR เป็น Excel/PDF
**So that** ใช้สำหรับ audit ภายนอกหรือ management report

**Priority**: Low

**Acceptance Criteria**:
1. **WHEN** user กด Export, **THEN** ระบบ generate file ตาม format ที่เลือก (Excel หรือ PDF)
2. **IF** user เลือก filter ก่อน export, **THEN** ระบบ export เฉพาะ data ที่ filter ไว้
3. The system shall export ได้ตามสิทธิ์ — user เห็นข้อมูลแค่ไหนก็ export ได้แค่นั้น

**Dependencies**: US-023
**Source**: FR-027, NFR-014

---

### US-025: Dashboard & Statistics
**As a** Admin / Auditor
**I want** เห็น Dashboard แสดง chart/statistics ภาพรวมของ CR
**So that** วิเคราะห์ workload, bottleneck และแนวโน้มได้

**Priority**: Low

**Acceptance Criteria**:
1. **WHEN** Admin/Auditor เปิด Dashboard, **THEN** ระบบแสดง: จำนวน CR ต่อเดือน, CR by status, average time to close, CR by change type, CR by impact level
2. **WHEN** user คลิก chart segment, **THEN** ระบบ drill down แสดง list ของ CR ในกลุ่มนั้น
3. The system shall แสดง dashboard data ตาม permission — Admin เห็นทั้งหมด, Auditor เห็นทั้งหมด, IT เห็นเฉพาะที่ assign

**Dependencies**: US-023
**Source**: D1-10 (Basic + Dashboard)

---

## Functional Area 11: Admin & Master Data

### US-026: Manage Users and Roles
**As a** Admin
**I want** จัดการ user accounts และกำหนด roles
**So that** ผู้ใช้แต่ละคนมีสิทธิ์ที่เหมาะสม

**Priority**: Medium

**Acceptance Criteria**:
1. **WHEN** Admin เปิดหน้า User Management, **THEN** แสดง list users พร้อม roles ที่กำหนดไว้
2. **WHEN** Admin สร้าง/แก้ไข user, **THEN** สามารถ assign roles ได้ (multiple roles per user)
3. **WHEN** Admin เปลี่ยน role, **THEN** ระบบ apply permission ทันทีเมื่อ user login ครั้งถัดไป
4. **WHEN** Admin แก้ไข user/role, **THEN** ระบบบันทึก audit log

**Dependencies**: None
**Source**: FR-028, NFR-002

---

### US-027: RBAC Authorization
**As a** ระบบ
**I want** บังคับ permission ตาม Role-Based Access Control
**So that** ผู้ไม่มีสิทธิ์ไม่สามารถเข้าถึงข้อมูลที่ไม่ควรเห็น

**Priority**: High

**Acceptance Criteria**:
1. The system shall ตรวจสอบ permission ทุก request — ทั้ง API level และ UI level
2. **IF** user ไม่มีสิทธิ์เข้าถึง resource, **THEN** ระบบ return 403 Forbidden และแสดง "ไม่มีสิทธิ์เข้าถึง"
3. The system shall รองรับ 8 roles: Requester, Approver Request, Call Center, IT Reviewer, Approver, Implementer, Auditor, Admin
4. **WHEN** Admin เปลี่ยน role ของ user, **THEN** permission เปลี่ยนทันทีในรอบ session ถัดไป

**Dependencies**: US-026
**Source**: NFR-002, NFR-003, EX-008

---

### US-028: Manage Master Data
**As a** Admin
**I want** จัดการ Master Data: Services, Impact Levels, Change Types
**So that** dropdown/options ในระบบตรงกับข้อมูลจริงขององค์กร

**Priority**: Medium

**Acceptance Criteria**:
1. **WHEN** Admin เปิดหน้า Master Data, **THEN** ระบบแสดง CRUD interface สำหรับ: Service List, Impact Level, Change Type categories
2. **WHEN** Admin เพิ่ม/แก้ไข/ลบ item, **THEN** ระบบ reflect ในทุก form ที่ใช้ master data ทันที
3. **IF** Admin ลบ item ที่มี CR อ้างอิงอยู่, **THEN** ระบบ soft-disable (ไม่แสดงในตัวเลือกใหม่ แต่ CR เดิมยังแสดงค่าเก่า)
4. **WHEN** แก้ไข Master Data, **THEN** ระบบบันทึก audit log

**Dependencies**: None
**Source**: FR-028

---

## Functional Area 12: Configurable Workflow Engine

### US-029: Configure Workflow Steps
**As a** Admin
**I want** กำหนด/แก้ไข steps ใน workflow ของ Change Request
**So that** กระบวนการ CR ปรับตามนโยบายองค์กรได้โดยไม่ต้องแก้ code

**Priority**: Medium

**Acceptance Criteria**:
1. **WHEN** Admin เปิด Workflow Configuration, **THEN** ระบบแสดง list ของ workflow steps ที่กำหนดไว้ในรูป visual (list หรือ diagram)
2. **WHEN** Admin เพิ่ม step ใหม่, **THEN** สามารถระบุ: step name, step type (review/approval/implementation/verification), assigned role, required fields, position ใน flow
3. **WHEN** Admin ลบ step, **THEN** ระบบตรวจสอบว่าไม่มี CR ที่ active อยู่ใน step นั้น — ถ้ามีให้แจ้ง warning
4. **WHEN** Admin save workflow config, **THEN** ระบบ validate ว่า flow ถูกต้อง (มี start, มี end, ไม่มี orphan step)
5. **WHEN** workflow config เปลี่ยน, **THEN** CR ที่อยู่ระหว่างดำเนินการใช้ workflow version เดิม; CR ใหม่ใช้ version ใหม่

**Dependencies**: US-026
**Source**: D1-5 (Fully configurable), NFR-012

---

### US-030: Configure Workflow Conditions
**As a** Admin
**I want** กำหนดเงื่อนไข (conditions) ในการ route CR ไปยัง step ต่าง ๆ
**So that** workflow สามารถ branch ตาม impact level, change type หรือ criteria อื่น ๆ

**Priority**: Medium

**Acceptance Criteria**:
1. **WHEN** Admin สร้าง condition, **THEN** สามารถระบุ: trigger field (เช่น Impact Level, Change Type), operator (equals, greater than), value, target step
2. **WHEN** CR เข้า step ที่มี condition, **THEN** ระบบ evaluate conditions ตามลำดับ priority และ route ไป step ที่ match
3. **IF** ไม่มี condition match, **THEN** ระบบ route ไป default next step

**Dependencies**: US-029
**Source**: D1-5 (Fully configurable), NFR-012

---

### US-031: Assign Approvers per Workflow Step
**As a** Admin
**I want** กำหนดว่า step ไหนต้อง approve โดยใคร (roles หรือ specific users)
**So that** approval routing ถูกต้องตามโครงสร้างองค์กร

**Priority**: Medium

**Acceptance Criteria**:
1. **WHEN** Admin กำหนด approver สำหรับ step, **THEN** สามารถเลือกได้: by role (ทุกคนที่มี role นั้น), by specific user, by hierarchy (หัวหน้าของ requester)
2. **IF** Impact Level = High/Major, **THEN** Admin สามารถ config ว่าต้อง approval จาก higher-level approver
3. **WHEN** CR เข้า approval step, **THEN** ระบบส่ง notification ไปยัง approver ตาม config

**Dependencies**: US-029
**Source**: D1-5, BR-004

---

## Functional Area 13: Authentication & Session

### US-032: Login with Company Email (MS365)
**As a** IT Reviewer / Approver / Implementer / Call Center / Auditor / Admin
**I want** Login ด้วย company email ผ่าน Microsoft authentication
**So that** เข้าระบบได้อย่างปลอดภัยโดยใช้ credentials ที่มีอยู่แล้ว

**Priority**: High

**Acceptance Criteria**:
1. **WHEN** user คลิก Login, **THEN** ระบบ redirect ไปหน้า Microsoft login (OAuth2/OIDC)
2. **WHEN** login สำเร็จ, **THEN** ระบบ map user กับ role ที่กำหนดไว้ในระบบ แล้ว redirect กลับ
3. **IF** user ยังไม่มี account ในระบบ, **THEN** ระบบแสดง "ไม่มีสิทธิ์เข้าใช้ กรุณาติดต่อ Admin"
4. **IF** Session หมดอายุ, **THEN** ระบบ redirect กลับไปหน้า login

**Dependencies**: US-026
**Source**: NFR-001, Assumptions #1, EX-010

---

### US-033: Anonymous Access for Requester
**As a** Requester
**I want** สร้าง CR และติดตามสถานะได้โดยไม่ต้อง login
**So that** ไม่ต้องมี account ก็ใช้บริการได้

**Priority**: High

**Acceptance Criteria**:
1. **WHEN** Requester เปิดหน้าสร้าง CR, **THEN** ระบบไม่ require login — ใช้ email + name ที่กรอกในฟอร์มเป็น identifier
2. **WHEN** Requester สร้าง CR สำเร็จ, **THEN** ระบบ generate unique tracking link ส่ง email ให้ Requester
3. **WHEN** Requester เปิด tracking link, **THEN** ระบบแสดงสถานะ CR โดยไม่ต้อง login
4. The system shall เก็บ log ว่า email ไหนสร้าง CR + IP address + timestamp สำหรับ audit

**Dependencies**: US-001
**Source**: Assumptions #1, Detail #1

---

## Functional Area 14: Data Integrity & Concurrency

### US-034: Version History
**As a** ระบบ
**I want** เก็บ version history ของ CR ทุกครั้งที่มีการแก้ไข
**So that** สามารถ trace การเปลี่ยนแปลงย้อนหลังได้

**Priority**: Low

**Acceptance Criteria**:
1. **WHEN** field ใด ๆ ของ CR ถูกแก้ไขและ save, **THEN** ระบบบันทึก: field name, old value, new value, modified by, timestamp
2. The system shall เก็บ history ถาวร (ไม่ลบ)
3. **WHEN** user ดู history, **THEN** แสดงเป็น timeline สามารถ compare version ได้

**Dependencies**: US-001
**Source**: Assumptions #7, NFR-004

---

### US-035: Optimistic Locking (Concurrency Control)
**As a** ระบบ
**I want** ป้องกันข้อมูลทับกันเมื่อหลายคนแก้ไข CR เดียวกันพร้อมกัน
**So that** ข้อมูลไม่สูญหายจากการ overwrite

**Priority**: Low

**Acceptance Criteria**:
1. **WHEN** user เปิด CR เพื่อแก้ไข, **THEN** ระบบ load version number ปัจจุบัน
2. **WHEN** user save, **IF** version number ไม่ตรงกับ DB (มีคนอื่นแก้ไปแล้ว), **THEN** ระบบแจ้ง conflict พร้อมแสดงข้อมูลที่ถูกเปลี่ยนไป
3. **WHEN** เกิด conflict, **THEN** user สามารถเลือก: overwrite, merge, หรือ discard changes

**Dependencies**: US-002
**Source**: EX-011

---

## Story Summary

| ID | Title | Area | Priority | Dependencies |
|----|-------|------|----------|--------------|
| US-001 | Create Change Request | Request Authoring | High | None |
| US-002 | Edit Draft Request | Request Authoring | High | US-001 |
| US-003 | Select Change Type and Impact | Request Authoring | High | US-001 |
| US-004 | Input Affected Service | Request Authoring | High | US-001, US-028 |
| US-005 | Submit CR with Pre-Approval | Request Authoring | High | US-001, US-003, US-004 |
| US-006 | Assign CR to IT Reviewer | Call Center Triage | High | US-005 |
| US-007 | Impact Analysis | IT Review | High | US-006 |
| US-008 | Risk Assessment | IT Review | High | US-007 |
| US-009 | Implementation/Rollout/Rollback Plan | IT Review | High | US-007, US-008 |
| US-010 | Record Test Result | Testing | High | US-009 |
| US-011 | Submit for Approval | Approval Workflow | High | US-010 |
| US-012 | Approve Change | Approval Workflow | High | US-011 |
| US-013 | Reject Change | Approval Workflow | High | US-011 |
| US-014 | Assign Implementer | Implementation | Medium | US-012 |
| US-015 | Record Production Deployment | Implementation | High | US-014 |
| US-016 | Post Implementation Review | Verification | Medium | US-015 |
| US-017 | Close Change Request | Verification | Medium | US-016 |
| US-018 | Emergency Change Flow | Emergency | Medium | US-003, US-011 |
| US-019 | Upload Evidence/Attachments | Attachments | Medium | US-001 |
| US-020 | Email Notifications | Notifications | Medium | US-005, US-006 |
| US-021 | In-App Notifications | Notifications | Medium | US-006, US-011 |
| US-022 | View Change History | Audit | Medium | US-001 |
| US-023 | Search Change Request | Search | Medium | US-001 |
| US-024 | Export Change Report | Reporting | Low | US-023 |
| US-025 | Dashboard & Statistics | Reporting | Low | US-023 |
| US-026 | Manage Users and Roles | Admin | Medium | None |
| US-027 | RBAC Authorization | Admin | High | US-026 |
| US-028 | Manage Master Data | Admin | Medium | None |
| US-029 | Configure Workflow Steps | Workflow Engine | Medium | US-026 |
| US-030 | Configure Workflow Conditions | Workflow Engine | Medium | US-029 |
| US-031 | Assign Approvers per Step | Workflow Engine | Medium | US-029 |
| US-032 | Login with Company Email | Auth | High | US-026 |
| US-033 | Anonymous Access for Requester | Auth | High | US-001 |
| US-034 | Version History | Data Integrity | Low | US-001 |
| US-035 | Optimistic Locking | Data Integrity | Low | US-002 |

---

## Story-Persona Matrix

| Story | สมชาย (Requester) | อรทัย (Approver Request) | วิภา (IT Reviewer) | ประภาส (Approver) | มนัส (Admin) |
|-------|---|---|---|---|---|
| US-001 | ✓ Primary | — | — | — | — |
| US-002 | ✓ Primary | — | — | — | — |
| US-003 | ✓ Primary | — | — | — | — |
| US-004 | ✓ Primary | — | — | — | — |
| US-005 | ✓ Primary | ✓ Primary | — | — | — |
| US-006 | — | — | — | — | — |
| US-007 | — | — | ✓ Primary | — | — |
| US-008 | — | — | ✓ Primary | — | — |
| US-009 | — | — | ✓ Primary | — | — |
| US-010 | — | — | ✓ Primary | — | — |
| US-011 | — | — | ✓ Primary | — | — |
| US-012 | — | — | — | ✓ Primary | — |
| US-013 | — | — | — | ✓ Primary | — |
| US-014 | — | — | ✓ Secondary | ✓ Secondary | — |
| US-015 | — | — | — | — | — |
| US-016 | — | — | ✓ Secondary | — | — |
| US-017 | — | — | ✓ Primary | — | — |
| US-018 | — | — | ✓ Primary | — | — |
| US-019 | ✓ Secondary | — | ✓ Primary | — | — |
| US-020 | ✓ Secondary | ✓ Secondary | ✓ Secondary | ✓ Secondary | — |
| US-021 | — | — | ✓ Primary | ✓ Primary | ✓ Secondary |
| US-022 | — | — | ✓ Secondary | — | ✓ Secondary |
| US-023 | ✓ Secondary | — | ✓ Primary | ✓ Secondary | ✓ Secondary |
| US-024 | — | — | — | — | ✓ Primary |
| US-025 | — | — | — | — | ✓ Primary |
| US-026 | — | — | — | — | ✓ Primary |
| US-027 | — | — | — | — | ✓ Primary |
| US-028 | — | — | — | — | ✓ Primary |
| US-029 | — | — | — | — | ✓ Primary |
| US-030 | — | — | — | — | ✓ Primary |
| US-031 | — | — | — | — | ✓ Primary |
| US-032 | — | — | ✓ Primary | ✓ Primary | ✓ Primary |
| US-033 | ✓ Primary | — | — | — | — |
| US-034 | — | — | — | — | — |
| US-035 | — | — | — | — | — |

---

## Non-Functional Considerations

- **Performance**: หน้าจอทั่วไปตอบสนองภายใน 3 วินาที (NFR-005); Report ขนาดใหญ่อาจช้ากว่า
- **Security**: RBAC (NFR-002), data protection (NFR-003), immutable audit log (NFR-004)
- **Availability**: Uptime ≥ 99% (NFR-006)
- **Backup**: Database backup อย่างน้อยวันละ 1 ครั้ง (NFR-007)
- **Compatibility**: Chrome + Edge เวอร์ชันปัจจุบัน (NFR-009)
- **Traceability**: End-to-end tracking — ตรวจสอบได้ว่า CR อยู่ step ไหน (NFR-013)

---

## External References

| Source | Stories Derived | What was used |
|--------|----------------|---------------|
| initial-requirements/Usecase-APP-02-ACR Management System.md | All (US-001 to US-035) | FR-001 to FR-028, NFR-001 to NFR-014, BR-001 to BR-013, EX-001 to EX-011 |
