# APP-02 - ACR Management System

> AIDLC Workshop Training Assessment by MSC

## Company Contact Detail

| Field | Detail |
|-------|--------|
| Company | Dynamic IT Solution (DITS) |

## Introduction App / Usecase

| Field | Detail |
|-------|--------|
| App ID | APP-02 |
| App / Usecase Name | ACR Management System (Access Right Registration / Change Request / Revoke Request Management System) |
| Usecase Type (Greenfield/Brownfield) | Greenfield |
| Related Systems | Email MS365, Ticket, Active Directory |

### Systems Scope

ระบบ ACR Management System (Access Right Registration / Change Request / Revoke Request Management System) ประเภทการเปลี่ยนแปลง/แก้ไข (Application, Hardware, Network, Server, Firewall, ระบบปฏิบัติการ (ลง windows), ขอ VPN, Internet/Wi-Fi, Active Directory (AD), แก้ไขระบบและอื่นๆ) ใช้สำหรับบริหารจัดการกระบวนการเปลี่ยนแปลง/แก้ไขระบบสารสนเทศ ตั้งแต่การสร้างคำขอ การวิเคราะห์ผลกระทบ การวางแผน การทดสอบ การอนุมัติ การนำขึ้น Production การ Rollout/Rollback และการปิดงาน โดยรองรับทั้ง Normal Change และ Emergency Change

ระบบครอบคลุมงานหลักดังนี้:

1. สร้างคำขอเปลี่ยนแปลงโดยผู้ร้องขอ
2. แยกส่วนข้อมูลของ Requester และ IT
3. วิเคราะห์ผลกระทบ ความเสี่ยง และระดับความรุนแรง
4. จัดทำ Implementation Plan, Rollout Plan และ Rollback Plan
5. บันทึกผลการทดสอบระบบ
6. เสนออนุมัติจากผู้มีอำนาจ
7. ดำเนินการเปลี่ยนแปลงบน Production
8. ตรวจสอบผลหลังดำเนินการ
9. แนบหลักฐานและจัดเก็บประวัติการดำเนินการ
10. รองรับ Audit Log และรายงานย้อนหลัง

อ้างอิงแบบฟอร์ม ISO27001 ดังนี้ (มีตัวอย่าง):

- ISMS-FM-027 - แบบฟอร์มลงทะเบียนเปลี่ยนแปลงและยกเลิกสิทธิ
- ISMS-FM-029 - แบบฟอร์มการขอใช้ระบบเครือข่ายอินเตอร์เน็ต VPN (VPN Internet Network System Agreement)
- ISMS-FM-016 - แบบฟอร์มขอเปลี่ยนแปลงแก้ไขระบบสารสนเทศ (Change Request Form)

## Overview Description

### Product Perspective

ระบบนี้เป็น Web Application / Mobile App (iOS/Android) ภายในองค์กร สามารถใช้งานผ่าน Browser และเชื่อมต่อกับระบบอื่นได้ เช่น

- เป็น Web-based Application (Intranet/Internet)
- เชื่อมต่อกับ:
  - User Authentication (Microsoft)
  - Email Notification System
  - File Storage สำหรับแนบหลักฐาน
  - (Optional) Ticketing System / ASD Can Do
- ใช้เป็นระบบกลางแทนการใช้เอกสาร (Word/Excel)
- Reporting / Dashboard

### User Classes

| Role | Description |
|------|-------------|
| Requester | ผู้ร้องขอ Change |
| Approver Request | หัวหน้าฝ่าย / ผู้อนุมัติ ของผู้ร้องขอ Change |
| Call Center | เปิด Ticket Assign case ผู้เกี่ยวข้อง |
| IT Reviewer | เจ้าหน้าที่ IT ที่วิเคราะห์ Impact, Risk และจัดทำแผนดำเนินการ |
| Approver | หัวหน้าฝ่ายหรือผู้มีอำนาจอนุมัติ Change (ส่วนของ IT) |
| Implementer | ผู้ดำเนินการ Change/deploy บนระบบจริง |
| Auditor | ผู้ตรวจสอบประวัติ เอกสาร และ Audit Log |
| Admin | ผู้ดูแลระบบ กำหนดสิทธิ์ ผู้ใช้งาน Master Data และ Workflow |

### Assumptions & Constraints

**Step:**

1. **Authentication** = ผู้ใช้งานสามารถเข้าใช้งานได้ 2 รูปแบบ > 1. ไม่ต้อง login, 2. login ด้วย email บริษัท
2. **Authorization** = สิทธิ์การเข้าถึงต้องแยกตาม Role
3. **Workflow** Normal Change = ต้องได้รับการอนุมัติก่อนขึ้น Production
4. **Emergency Change** = สามารถดำเนินการเร่งด่วนได้ แต่ต้องบันทึกเหตุผลและขออนุมัติย้อนหลัง
5. **Audit** = ทุกการกระทำต้องถูกบันทึกใน Audit Log
6. **Attachment** = ระบบต้องรองรับการแนบหลักฐาน เช่น รูปภาพ เอกสาร Log File
7. **Data Integrity** = ข้อมูลที่ Submit แล้วต้องมี Version History หรือ Change History
8. **Approval Control** = ผู้อนุมัติและผู้ดำเนินการไม่ควรเป็นคนเดียวกัน

**Detail:**

1. การเข้าใช้งานมี 2 รูปแบบ > 1. ไม่ต้อง login, 2. login ด้วย email บริษัท
2. หลังจากกรอกข้อมูลเสร็จ ให้ระบบสามารถส่ง link ไปทาง email ให้หัวหน้างานของผู้ร้องขออนุมัติก่อน โดยหัวหน้างานไม่ต้อง login เหมือนกันแต่ต้องเก็บ log ว่าชื่อและตำแหน่งอะไรเป็นคนอนุมัติโดยดูจาก Role ที่ผูกกับ Email MS365 หรือผู้ร้องขอใส่ email หัวหน้าในการส่งขออนุมัติเอง
3. จำนวน 1 Change Request = 1 workflow
4. หลังจากหัวหน้างานของผู้ร้องขออนุมัติเรียบร้อย ผู้ร้องขอกด Submit > กด Sent to IT > ระบบส่ง email เข้า email กลางของ IT Email: Service@dits.co.th
5. Call Center เข้าระบบจาก link เพื่อตรวจสอบความถูกต้อง > กด assignment ให้ IT ผู้รับผิดชอบเข้ามารับงานต่อ
6. IT ผู้รับผิดชอบดำเนินการกรอกข้อมูลให้ครบ > ส่งให้หัวหน้างานตาม roles ที่กำหนด ทำการอนุมัติก่อนขึ้นเริ่มดำเนินการ
7. ข้อมูลต้องถูกเก็บเพื่อ audit (ย้อนหลังได้)
8. ระบบต้องรองรับ attachment (หลักฐาน)

## Tech Stack

| Layer | Detail |
|-------|--------|
| Frontend | - |
| Backend | - |
| Database | - |
| Infrastructure | - |
| Policies | - |

## Functional Requirements (FR)

| FR# | Topic | Function Name | Function Detail | Note |
|-----|-------|---------------|-----------------|------|
| FR-001 | Request | Create Change Request | Requester สามารถสร้างคำขอ Change ได้ | Draft status |
| FR-002 | Request | Edit Draft Request | Requester แก้ไขคำขอได้ก่อน Submit | เฉพาะสถานะ Draft หรือ Returned |
| FR-003 | Request | Submit Change Request | Requester ส่งคำขอให้ IT ตรวจสอบ | เปลี่ยนสถานะเป็น Submitted |
| FR-004 | Request | Select Change Type | เลือก Normal Change หรือ Emergency Change | Required |
| FR-005 | Request | Define Impact Level | เลือกระดับผลกระทบ Major, High, Medium, Low, Very Low | Required |
| FR-006 | Request | Input Affected Service | ระบุ Service / กลุ่มงานที่ได้รับผลกระทบ | Required |
| FR-007 | IT Review | Impact Analysis | IT วิเคราะห์ผลกระทบของ Change | Required ก่อน Approval |
| FR-008 | IT Review | Risk Assessment | IT ประเมินความเสี่ยง | Required |
| FR-009 | IT Review | Implementation Plan | IT ระบุขั้นตอนการดำเนินการ | Required |
| FR-010 | IT Review | Rollout Plan | IT ระบุแผน Rollout | Required สำหรับ Production |
| FR-011 | IT Review | Rollback Plan | IT ระบุแผน Rollback | Required โดยเฉพาะ High/Major |
| FR-012 | Testing | Record Test Result | IT บันทึกผลการทดสอบ ผ่าน/ไม่ผ่าน | Required ก่อนขออนุมัติ |
| FR-013 | Testing | Failed Test Action | กรณีทดสอบไม่ผ่าน ต้องเลือก Action เช่น Restore, Vendor, Retest | Required เมื่อ Test Failed |
| FR-014 | Approval | Submit for Approval | IT ส่งรายการให้ Approver พิจารณา | |
| FR-015 | Approval | Approve Change | Approver อนุมัติ Change | |
| FR-016 | Approval | Reject Change | Approver ไม่อนุมัติพร้อมระบุเหตุผล | Reject reason required |
| FR-017 | Implementation | Assign Implementer | ระบุผู้ดำเนินการขึ้น Production | |
| FR-018 | Implementation | Record Production Deployment | บันทึกผลการนำขึ้น Production | |
| FR-019 | Implementation | Record Version Before/After | ระบุ Version ก่อนและหลังเปลี่ยนแปลง | Required |
| FR-020 | Implementation | Record Downtime | บันทึกระยะเวลาที่หยุดให้บริการ | Required ถ้ามี downtime |
| FR-021 | Verification | Post Implementation Review | ตรวจสอบผลหลังดำเนินการ | |
| FR-022 | Verification | Mark Success/Failed | ระบุสถานะสำเร็จ/ไม่สำเร็จ | |
| FR-023 | Attachment | Upload Evidence | แนบหลักฐาน เช่น Screenshot, Log, Approval File | |
| FR-024 | Notification | Send Email Notification | แจ้งเตือน Requester, IT, Approver, Implementer ตามสถานะ | |
| FR-025 | Audit | View Change History | ดูประวัติการแก้ไขและเปลี่ยนสถานะ | |
| FR-026 | Search | Search Change Request | ค้นหา Change ตาม ID, Status, Service, Date, Requester | |
| FR-027 | Report | Export Change Report | Export รายงานเป็น Excel/PDF | |
| FR-028 | Admin | Manage Master Data | จัดการ Service, Impact Level, Change Type, Role, User | |

## Non-Functional Requirements (NFR)

| NFR# | Topic | Function Name | Function Detail | Note |
|------|-------|---------------|-----------------|------|
| NFR-001 | Security | Authentication | รองรับ Login, SSO หรือ AD | |
| NFR-002 | Security | Authorization | กำหนดสิทธิ์ตาม Role | RBAC |
| NFR-003 | Security | Data Protection | จำกัดการเข้าถึงข้อมูลตามสิทธิ์ | |
| NFR-004 | Audit | Audit Log | บันทึก User, Action, Timestamp, Old Value, New Value | Immutable |
| NFR-005 | Performance | Response Time | หน้าจอทั่วไปต้องตอบสนองภายใน 3 วินาที | ยกเว้น Report ขนาดใหญ่ |
| NFR-006 | Availability | Uptime | ระบบควรพร้อมใช้งานไม่น้อยกว่า 99% | |
| NFR-007 | Backup | Data Backup | Backup ฐานข้อมูลอย่างน้อยวันละ 1 ครั้ง | |
| NFR-008 | Usability | User Friendly Form | ฟอร์มต้องแยกส่วน Requester และ IT ชัดเจน | |
| NFR-009 | Compatibility | Browser Support | รองรับ Chrome และ Edge เวอร์ชันปัจจุบัน | |
| NFR-010 | File | Attachment Support | รองรับ PDF, JPG, PNG, DOCX, XLSX, TXT, LOG | |
| NFR-011 | File | File Size Limit | ขนาดไฟล์แนบต่อไฟล์ไม่เกิน 10 MB หรือ Config ได้ | |
| NFR-012 | Maintainability | Configurable Workflow | Workflow และ Approver ควรปรับแต่งได้ | Future enhancement |
| NFR-013 | Traceability | End-to-End Tracking | ต้องตรวจสอบได้ว่ารายการอยู่ขั้นตอนไหน | |
| NFR-014 | Reporting | Exportable Data | Export ได้ตามสิทธิ์ | |

## Exception Cases

| EX# | Topic | Case Name | Case Detail | Note |
|-----|-------|-----------|-------------|------|
| EX-001 | Request | Missing Required Field | หากกรอกข้อมูลไม่ครบ ระบบไม่ให้ Submit | แสดงข้อความแจ้งเตือน |
| EX-002 | Approval | Reject Change | หากไม่อนุมัติ ต้องระบุเหตุผลและส่งกลับผู้เกี่ยวข้อง | |
| EX-003 | Emergency | Emergency Approval Later | Emergency Change สามารถดำเนินการก่อน แต่ต้องขออนุมัติย้อนหลัง | ต้องมีเหตุผล |
| EX-004 | Testing | Test Failed | หากทดสอบไม่ผ่าน ต้องเลือก Action เช่น Restore, Vendor, Retest | |
| EX-005 | Implementation | Deployment Failed | หากขึ้น Production ไม่สำเร็จ ต้องระบุสาเหตุและดำเนินการ Rollback | |
| EX-006 | Rollback | Rollback Failed | หาก Rollback ไม่สำเร็จ ต้อง Escalate ไปยัง Manager/Vendor | |
| EX-007 | File | Upload Failed | หากแนบไฟล์ไม่สำเร็จ ระบบต้องแจ้ง Error | |
| EX-008 | Permission | Unauthorized Access | ผู้ไม่มีสิทธิ์ไม่สามารถดู/แก้ไขข้อมูลได้ | |
| EX-009 | Workflow | Invalid Status Transition | ไม่อนุญาตให้ข้ามขั้นตอนที่ไม่ถูกต้อง | |
| EX-010 | Session | Session Timeout | หาก Session หมดอายุ ต้อง Login ใหม่ | |
| EX-011 | Concurrency | Parallel Update | หากมีผู้แก้ไขพร้อมกัน ระบบต้องป้องกันข้อมูลทับกัน | Optimistic Locking |

## Business Rule

| BR# | Topic | Rule Name | Rule Detail | Note |
|-----|-------|-----------|-------------|------|
| BR-001 | Workflow | Sequential Flow | Change ต้องไหลตามลำดับ Draft > Submitted > IT Review > Approval > Implementation > Verification > Closed | |
| BR-002 | Normal Change | Approval Required | Normal Change ต้องได้รับการอนุมัติก่อนขึ้น Production | |
| BR-003 | Emergency Change | Post Approval Required | Emergency Change ทำก่อนได้ แต่ต้องขออนุมัติย้อนหลัง | |
| BR-004 | Impact | High Impact Approval | Impact ระดับ High/Major ต้องได้รับอนุมัติจากหัวหน้าฝ่าย | |
| BR-005 | Rollback | Rollback Required | High/Major ต้องมี Rollback Plan | |
| BR-006 | Testing | Test Required | ต้องบันทึกผลการทดสอบก่อนส่งอนุมัติ | |
| BR-007 | Testing | Failed Test Cannot Proceed | ถ้าทดสอบไม่ผ่าน ห้ามขึ้น Production เว้นแต่มีอนุมัติพิเศษ | |
| BR-008 | Version | Version Required | ต้องระบุ Version ก่อนและหลังเปลี่ยนแปลง | |
| BR-009 | Downtime | Downtime Required | ถ้ามีการหยุดให้บริการ ต้องระบุช่วงเวลาและระยะเวลา | |
| BR-010 | Role | Approver Not Implementer | ผู้อนุมัติไม่ควรเป็นคนเดียวกับ Implementer | |
| BR-011 | Audit | Immutable Audit Log | Audit Log ห้ามแก้ไขหรือลบ | |
| BR-012 | Attachment | Evidence Required | ขั้นตอน Implementation และ Verification ควรมีหลักฐานแนบ | |
| BR-013 | Closure | Close Condition | ปิด Change ได้เมื่อ Verification สำเร็จ หรือมีเหตุผลกรณีไม่สำเร็จครบถ้วน | |

## UI Design

| Page | Picture |
|------|---------|
| (Page Name) | (Picture) |
| (Page Name) | (Picture) |

> Note: ส่วน UI Design ในไฟล์ต้นฉบับเป็นภาพ (picture) ซึ่งไม่สามารถแปลงเป็นข้อความได้
